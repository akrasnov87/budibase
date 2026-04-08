<script lang="ts">
  import { Body, Layout, notifications } from "@budibase/bbui"
  import { confirm } from "@/helpers"
  import {
    AgentKnowledgeSourceType,
    type Agent,
    type KnowledgeSourceOption,
    type KnowledgeBaseFile,
    type KnowledgeSourceSyncRun,
  } from "@budibase/types"
  import { appStore } from "@/stores/builder/app"
  import { agentsStore, auth, selectedAgent } from "@/stores/portal"
  import KnowledgeTable from "./KnowledgeTable.svelte"
  import KnowledgeAddControls from "./KnowledgeAddControls.svelte"
  import SelectSharePointSiteModal from "./SelectSharePointSiteModal.svelte"
  import SharePointFilesStatusModal from "./SharePointFilesStatusModal.svelte"
  import { onDestroy, onMount } from "svelte"
  import type { KnowledgeTableRow } from "./renderers/types"
  import {
    getSharePointFilesForSite,
    toFileTableRows,
    toSharePointConnectionRows,
  } from "./knowledgeTableRows"

  interface ModalHandle {
    show: () => void
    hide: () => void
  }

  let currentAgent: Agent | undefined = $derived($selectedAgent)
  let sharePointSources = $derived.by(() =>
    (currentAgent?.knowledgeSources || []).filter(
      source => source.type === AgentKnowledgeSourceType.SHAREPOINT
    )
  )
  let hasSharePointConnection = $derived(sharePointSources.length > 0)
  let loading = $state(true)
  let files = $derived.by(() => {
    const agentId = currentAgent?._id
    if (!agentId) {
      return [] as KnowledgeBaseFile[]
    }
    return $agentsStore.filesByAgentId[agentId] || []
  })
  let initialKnowledgeLoadedForAgent = $state<string | undefined>()
  let sharePointSites = $derived.by(() => {
    const agentId = currentAgent?._id
    if (!agentId) {
      return [] as KnowledgeSourceOption[]
    }
    return $agentsStore.knowledgeSourceOptionsByAgentId[agentId] || []
  })
  let sharePointSyncRunsBySiteId = $derived.by(() => {
    const agentId = currentAgent?._id
    if (!agentId) {
      return {} as Record<string, KnowledgeSourceSyncRun>
    }
    return Object.fromEntries(
      ($agentsStore.knowledgeSourceRunsByAgentId[agentId] || []).map(run => [
        run.sourceId,
        run,
      ])
    ) as Record<string, KnowledgeSourceSyncRun>
  })
  let selectedSiteIds = $derived.by(() =>
    sharePointSources
      .map(source => source.config.site?.id)
      .filter((siteId): siteId is string => !!siteId)
  )
  let pendingSiteIds = $state<string[]>([])
  let effectiveSelectedSiteIds = $derived.by(() =>
    Array.from(new Set([...selectedSiteIds, ...pendingSiteIds]))
  )
  let loadingSharePointSites = $state(false)
  let sharePointSiteModal = $state<ModalHandle>()
  let sharePointFilesStatusModal = $state<ModalHandle>()
  let selectedSharePointSiteId = $state("")
  let selectedStatusSiteId = $state<string | undefined>()
  let selectedStatusSiteName = $state<string | undefined>()
  let shouldOpenSharePointPickerAfterOauth = $state(false)

  const showSharePointSyncResult = (result: {
    synced: number
    failed: number
    skipped?: number
    totalDiscovered?: number
  }) => {
    const skipped = result.skipped ?? 0
    const discovered = result.totalDiscovered ?? result.synced + skipped

    if (result.synced === 0 && result.failed === 0) {
      if (discovered === 0) {
        notifications.info("No files found in selected SharePoint site(s)")
        return
      }
      if (skipped > 0) {
        notifications.info(
          `SharePoint sync complete (0 new files, ${skipped} already synced)`
        )
        return
      }
    }

    const message = `SharePoint sync complete (${result.synced} synced${result.failed > 0 ? `, ${result.failed} failed` : ""}${skipped > 0 ? `, ${skipped} skipped` : ""})`

    if (result.failed > 0 && result.synced === 0) {
      notifications.error(message)
    } else if (result.failed > 0) {
      notifications.warning(message)
    } else {
      notifications.success(message)
    }
  }

  const fetchFiles = async (agentId: string) => {
    await agentsStore.fetchAgentFiles(agentId)
  }

  const openSharePointFilesStatusModal = (siteId: string, siteName: string) => {
    selectedStatusSiteId = siteId
    selectedStatusSiteName = siteName
    sharePointFilesStatusModal?.show()
  }

  const handleKnowledgeRowClick = (row: KnowledgeTableRow) => {
    if (row.kind !== "sharepoint_connection") {
      return
    }
    openSharePointFilesStatusModal(
      row.siteId,
      row.filename
    )
  }

  let selectedStatusSiteFiles = $derived.by(() => {
    if (!selectedStatusSiteId) {
      return [] as KnowledgeBaseFile[]
    }
    return getSharePointFilesForSite(files, selectedStatusSiteId).sort(
      (a, b) => a.filename.localeCompare(b.filename)
    )
  })

  let fileTableRows = $derived.by(() =>
    toFileTableRows(
      files.filter(file => !file.externalSourceId?.startsWith("sharepoint:")),
      removeFile
    )
  )
  let sharePointConnectionRows = $derived.by(
    () => {
      return toSharePointConnectionRows({
        hasSharePointConnection,
        selectedSiteIds: effectiveSelectedSiteIds,
        sharePointSources,
        sharePointSites,
        sharePointSyncRunsBySiteId,
        files,
        loadingSharePointSites,
        onDelete: removeSharePointSite,
        onSync: async siteId => {
          await syncSharePointNow([siteId])
        },
      })
    }
  )
  let knowledgeTableRows: KnowledgeTableRow[] = $derived.by(() => {
    return [...sharePointConnectionRows, ...fileTableRows]
  })

  const loadInitialKnowledge = async (agentId: string) => {
    loading = true
    try {
      await agentsStore.fetchAgentFiles(agentId)
      if (hasSharePointConnection) {
        await agentsStore.fetchAgentKnowledgeSourceOptions(agentId)
      }
      initialKnowledgeLoadedForAgent = agentId
    } finally {
      loading = false
    }
  }

  const loadSharePointSites = async (agentId: string) => {
    if (!hasSharePointConnection) return
    loadingSharePointSites = true
    try {
      await agentsStore.fetchAgentKnowledgeSourceOptions(agentId)
    } finally {
      loadingSharePointSites = false
    }
  }
  $effect(() => {
    const agentId = currentAgent?._id
    if (!agentId) {
      loading = false
      initialKnowledgeLoadedForAgent = undefined
      return
    }
    if (initialKnowledgeLoadedForAgent === agentId) {
      return
    }
    loadInitialKnowledge(agentId).catch(error => {
      console.error(error)
      notifications.error("Failed to load knowledge")
    })
  })

  $effect(() => {
    const agentId = currentAgent?._id
    if (!agentId) {
      agentsStore.stopAgentFilePolling()
      return
    }

    agentsStore.startAgentFilePolling(agentId)
    return () => {
      agentsStore.stopAgentFilePolling()
    }
  })

  $effect(() => {
    if (!shouldOpenSharePointPickerAfterOauth) {
      return
    }
    const agentId = currentAgent?._id
    if (!agentId || !hasSharePointConnection || loading) {
      return
    }
    shouldOpenSharePointPickerAfterOauth = false
    openSharePointSiteModal().catch(error => {
      console.error(error)
      notifications.error("Failed to fetch SharePoint sites")
    })
  })

  onMount(async () => {
    try {
      if (!$agentsStore.agentsLoaded) {
        await agentsStore.init()
      }
      const currentUrl = new URL(window.location.href)
      const continueSetupId = currentUrl.searchParams.get(
        "continue_microsoft_setup"
      )
      if (continueSetupId && currentAgent?._id) {
        const appId = $appStore.appId
        if (!appId) {
          throw new Error("Missing app id for SharePoint setup completion")
        }
        await agentsStore.completeAgentKnowledgeSourceConnection(
          currentAgent._id,
          {
            appId,
            continueSetupId,
          }
        )
        await agentsStore.fetchAgents()
        currentUrl.searchParams.delete("continue_microsoft_setup")
        const query = currentUrl.searchParams.toString()
        const path = query
          ? `${currentUrl.pathname}?${query}`
          : currentUrl.pathname
        window.history.replaceState({}, "", path)
        notifications.success("SharePoint connected")
        shouldOpenSharePointPickerAfterOauth = true
      }
      if (currentAgent?._id) {
        initialKnowledgeLoadedForAgent = undefined
      }
    } catch (error) {
      console.error(error)
      notifications.error("Failed to load files")
    }
  })

  function connectSharePoint() {
    const agentId = currentAgent?._id
    const appId = $appStore.appId
    const tenantId = $auth.tenantId
    if (!agentId || !appId || !tenantId) {
      notifications.error("Missing context to connect SharePoint")
      return
    }
    const returnPath = window.location.pathname
    const oauthUrl = `/api/global/auth/${tenantId}/datasource/microsoft?appId=${encodeURIComponent(appId)}&returnPath=${encodeURIComponent(returnPath)}`
    window.location.href = oauthUrl
  }

  async function openSharePointSiteModal() {
    const agentId = currentAgent?._id
    if (!agentId || !hasSharePointConnection) {
      return
    }
    await loadSharePointSites(agentId)
    const selectedSiteIdSet = new Set(effectiveSelectedSiteIds)
    const availableSites = sharePointSites.filter(
      site => !selectedSiteIdSet.has(site.id)
    )
    selectedSharePointSiteId = availableSites[0]?.id || ""
    sharePointSiteModal?.show()
  }

  async function saveSharePointSites() {
    const agentId = currentAgent?._id
    if (!agentId) {
      return
    }
    if (!selectedSharePointSiteId) {
      notifications.error("Please select a SharePoint site")
      return
    }
    try {
      const nextSiteIds = Array.from(
        new Set([...effectiveSelectedSiteIds, selectedSharePointSiteId])
      )
      await agentsStore.setAgentKnowledgeSources(agentId, {
        sourceIds: nextSiteIds,
      })
      pendingSiteIds = nextSiteIds.filter(id => !selectedSiteIds.includes(id))
      sharePointSiteModal?.hide()
      const result = await agentsStore.syncAgentKnowledgeSources(agentId, {
        sourceIds: nextSiteIds,
      })
      await loadSharePointSites(agentId)
      await fetchFiles(agentId)
      await agentsStore.fetchAgents()
      pendingSiteIds = []
      showSharePointSyncResult(result)
    } catch (error) {
      pendingSiteIds = []
      console.error(error)
      notifications.error("Failed to sync SharePoint")
    }
  }

  async function syncSharePointNow(siteIds: string[]) {
    const agentId = currentAgent?._id
    if (!agentId) {
      return
    }
    if (siteIds.length === 0) {
      notifications.error("Please select at least one SharePoint site")
      return
    }

    try {
      const result = await agentsStore.syncAgentKnowledgeSources(agentId, {
        sourceIds: siteIds,
      })
      await loadSharePointSites(agentId)
      await fetchFiles(agentId)
      await agentsStore.fetchAgents()
      showSharePointSyncResult(result)
    } catch (error) {
      console.error(error)
      notifications.error("Failed to sync SharePoint")
    }
  }

  async function removeSharePointSite(siteId: string) {
    const agent = currentAgent
    if (!agent?._id || !hasSharePointConnection) {
      return
    }
    const agentId = agent._id
    const siteName =
      sharePointSources
        .map(source => source.config.site)
        .find(site => site?.id === siteId)?.name || "this SharePoint site"

    await confirm({
      title: "Confirm deletion",
      body: `Are you sure you want to remove ${siteName}? This action can't be undone.`,
      okText: "Delete",
      onConfirm: async () => {
        pendingSiteIds = pendingSiteIds.filter(id => id !== siteId)
        const nextSites = sharePointSources
          .map(source => source.config.site)
          .filter(
            (site): site is { id: string; name?: string; webUrl?: string } =>
              !!site?.id && site.id !== siteId
          )
        const nextSiteIds = nextSites.map(site => site.id)
        try {
          if (nextSiteIds.length === 0) {
            await agentsStore.disconnectAgentKnowledgeSources(agentId)
          } else {
            await agentsStore.setAgentKnowledgeSources(agentId, {
              sourceIds: nextSiteIds,
            })
          }
          await agentsStore.fetchAgents()
          pendingSiteIds = []
          await fetchFiles(agentId)
          if (nextSiteIds.length === 0) {
            await loadSharePointSites(agentId)
          }
          notifications.success("SharePoint site removed")
        } catch (error) {
          console.error(error)
          notifications.error("Failed to remove SharePoint site")
        }
      },
    })
  }

  async function removeFile(file: KnowledgeBaseFile) {
    const agentId = currentAgent?._id
    const fileId = file._id
    if (!agentId || !fileId) {
      return
    }

    await confirm({
      title: "Confirm deletion",
      body: `Are you sure you want to remove ${file.filename}? This action can't be undone.`,
      okText: "Delete",
      onConfirm: async () => {
        try {
          await agentsStore.deleteAgentFile(agentId, fileId)
          await fetchFiles(agentId)
          notifications.success("File removed")
        } catch (error) {
          console.error(error)
          notifications.error("Failed to remove file")
        }
      },
    })
  }

  onDestroy(() => {
    agentsStore.stopAgentFilePolling()
  })
</script>

<Layout gap="S" noPadding>
  <div class="section-header">
    <Body size="S">Knowledge</Body>
    <KnowledgeAddControls
      agentId={currentAgent?._id}
      {hasSharePointConnection}
      onUploaded={async () => {
        if (!currentAgent?._id) {
          return
        }
        await fetchFiles(currentAgent._id)
      }}
      onConnectSharePoint={connectSharePoint}
      onSelectSharePoint={() =>
        openSharePointSiteModal().catch(error => {
          console.error(error)
          notifications.error("Failed to fetch SharePoint sites")
        })}
    />
  </div>

  <KnowledgeTable
    {loading}
    rows={knowledgeTableRows}
    onRowClick={handleKnowledgeRowClick}
  />
</Layout>

<SelectSharePointSiteModal
  bind:this={sharePointSiteModal}
  {loadingSharePointSites}
  {sharePointSites}
  bind:selectedSiteId={selectedSharePointSiteId}
  onSave={saveSharePointSites}
/>

<SharePointFilesStatusModal
  bind:this={sharePointFilesStatusModal}
  siteName={selectedStatusSiteName}
  files={selectedStatusSiteFiles}
/>

<style>
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-m);
  }
</style>
