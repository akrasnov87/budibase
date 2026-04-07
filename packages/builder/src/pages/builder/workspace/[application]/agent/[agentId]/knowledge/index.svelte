<script lang="ts">
  import {
    Body,
    Layout,
    ProgressCircle,
    notifications,
    Table,
  } from "@budibase/bbui"
  import { confirm } from "@/helpers"
  import { helpers } from "@budibase/shared-core"
  import {
    AgentKnowledgeSourceType,
    KnowledgeBaseFileStatus,
    type Agent,
    type AgentSharePointKnowledgeSource,
    type KnowledgeBaseFile,
    type SharePointSite,
  } from "@budibase/types"
  import { appStore } from "@/stores/builder/app"
  import { agentsStore, auth, selectedAgent } from "@/stores/portal"
  import KnowledgeIconRenderer from "./renderers/KnowledgeIconRenderer.svelte"
  import KnowledgeNameRenderer from "./renderers/KnowledgeNameRenderer.svelte"
  import KnowledgeStatusRenderer from "./renderers/KnowledgeStatusRenderer.svelte"
  import KnowledgeActionsRenderer from "./renderers/KnowledgeActionsRenderer.svelte"
  import KnowledgeAddControls from "./KnowledgeAddControls.svelte"
  import SelectSharePointSiteModal from "./SelectSharePointSiteModal.svelte"
  import SharePointFilesStatusModal from "./SharePointFilesStatusModal.svelte"
  import { onDestroy, onMount } from "svelte"

  interface ModalHandle {
    show: () => void
    hide: () => void
  }

  interface FileKnowledgeTableRow {
    kind: "file"
    __clickable?: boolean
    _id?: string
    filename: string
    status: KnowledgeBaseFileStatus
    displayStatus: string
    size: string
    updatedAt: string | number
    mimetype?: string
    onDelete: () => Promise<void>
    errorMessage?: string
  }

  interface SharePointConnectionTableRow {
    kind: "sharepoint_connection"
    __clickable: boolean
    _id: string
    siteId: string
    filename: string
    subtitle: string
    displayStatus: string
    syncedCount: number
    totalCount: number
    failedCount: number
    onDelete: () => Promise<void>
    onSync: () => Promise<void>
    syncing: boolean
  }

  type KnowledgeTableRow = FileKnowledgeTableRow | SharePointConnectionTableRow

  let currentAgent: Agent | undefined = $derived($selectedAgent)
  let sharePointSource = $derived.by(() => {
    return currentAgent?.knowledgeSources?.find(
      source => source.type === AgentKnowledgeSourceType.SHAREPOINT
    ) as AgentSharePointKnowledgeSource | undefined
  })
  let hasSharePointConnection = $derived(
    !!sharePointSource?.config.connectionId
  )
  let loading = $state(true)
  let files = $derived.by(() => {
    const agentId = currentAgent?._id
    if (!agentId) {
      return [] as KnowledgeBaseFile[]
    }
    return $agentsStore.filesByAgentId[agentId] || []
  })
  let loadedAgentId = $state<string | undefined>()
  let sharePointSites = $state<SharePointSite[]>([])
  let selectedSiteIds = $state<string[]>([])
  let storedSharePointSites = $state<SharePointSite[]>([])
  let loadingSharePointSites = $state(false)
  let syncingSharePointSiteId = $state<string | undefined>()
  let sharePointSitesLoadedForAgent = $state<string | undefined>()
  let sharePointSiteModal = $state<ModalHandle>()
  let sharePointFilesStatusModal = $state<ModalHandle>()
  let selectedSharePointSiteId = $state("")
  let selectedStatusSiteId = $state<string | undefined>()
  let selectedStatusSiteName = $state<string | undefined>()

  const readableStatus: Record<KnowledgeBaseFileStatus, string> = {
    [KnowledgeBaseFileStatus.PROCESSING]: "Processing",
    [KnowledgeBaseFileStatus.READY]: "Ready",
    [KnowledgeBaseFileStatus.FAILED]: "Failed",
  }

  const formatFileStatus = (file: KnowledgeBaseFile) =>
    readableStatus[file.status] || file.status

  const formatTimestamp = (value?: string | number) => {
    if (!value) {
      return "—"
    }
    try {
      return new Date(value).toLocaleString()
    } catch (error) {
      return value
    }
  }

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

    notifications.success(
      `SharePoint sync complete (${result.synced} synced, ${result.failed} failed${skipped > 0 ? `, ${skipped} skipped` : ""})`
    )
  }

  const fetchFiles = async (agentId: string) => {
    await agentsStore.fetchAgentFiles(agentId)
  }

  const toFileTableRows = (
    list: KnowledgeBaseFile[]
  ): FileKnowledgeTableRow[] =>
    list
      .map(file => ({
        kind: "file" as const,
        _id: file._id,
        filename: file.filename,
        status: file.status,
        displayStatus: formatFileStatus(file),
        size: helpers.formatBytes(file.size, " "),
        updatedAt: formatTimestamp(
          file.processedAt || file.updatedAt || file.createdAt
        ),
        mimetype: file.mimetype,
        onDelete: () => removeFile(file),
        errorMessage: file.errorMessage,
      }))
      .sort((a, b) => a.filename.localeCompare(b.filename))

  const getSharePointSyncCounts = (siteId: string) => {
    const siteFiles = files.filter(file =>
      file.externalSourceId?.startsWith(`sharepoint:${siteId}:`)
    )
    const total = siteFiles.length
    const synced = siteFiles.filter(
      file => file.status === KnowledgeBaseFileStatus.READY
    ).length
    const failed = siteFiles.filter(
      file => file.status === KnowledgeBaseFileStatus.FAILED
    ).length
    return { synced, total, failed }
  }

  const getSharePointFilesForSite = (siteId: string) =>
    files.filter(file =>
      file.externalSourceId?.startsWith(`sharepoint:${siteId}:`)
    )

  const openSharePointFilesStatusModal = (siteId: string, siteName: string) => {
    selectedStatusSiteId = siteId
    selectedStatusSiteName = siteName
    sharePointFilesStatusModal?.show()
  }

  const handleKnowledgeRowClick = (event: CustomEvent<KnowledgeTableRow>) => {
    const row = event.detail
    openSharePointFilesStatusModal(
      (row as SharePointConnectionTableRow).siteId,
      row.filename
    )
  }

  let selectedStatusSiteFiles = $derived.by(() => {
    if (!selectedStatusSiteId) {
      return [] as KnowledgeBaseFile[]
    }
    return getSharePointFilesForSite(selectedStatusSiteId).sort((a, b) =>
      a.filename.localeCompare(b.filename)
    )
  })

  let fileTableRows: FileKnowledgeTableRow[] = $derived.by(() =>
    toFileTableRows(
      files.filter(file => !file.externalSourceId?.startsWith("sharepoint:"))
    )
  )
  let sharePointConnectionRows: SharePointConnectionTableRow[] = $derived.by(
    () => {
      if (!hasSharePointConnection) {
        return []
      }
      return selectedSiteIds
        .map(siteId => {
          const site =
            storedSharePointSites.find(entry => entry.id === siteId) ||
            sharePointSites.find(entry => entry.id === siteId)
          const { synced, total, failed } = getSharePointSyncCounts(siteId)
          const siteDisplayName =
            site?.name ||
            site?.webUrl ||
            (loadingSharePointSites
              ? "Loading SharePoint site..."
              : "SharePoint site")
          return {
            kind: "sharepoint_connection" as const,
            __clickable: true,
            _id: `sharepoint-site-${siteId}`,
            siteId,
            filename: siteDisplayName,
            subtitle: lastSharePointSyncLabel,
            displayStatus: `${synced}/${total} files`,
            syncedCount: synced,
            totalCount: total,
            failedCount: failed,
            onDelete: () => removeSharePointSite(siteId),
            onSync: () => syncSharePointNow([siteId]),
            syncing: syncingSharePointSiteId === siteId,
          }
        })
        .sort((a, b) => a.filename.localeCompare(b.filename))
    }
  )
  let knowledgeTableRows: KnowledgeTableRow[] = $derived.by(() => {
    return [...sharePointConnectionRows, ...fileTableRows]
  })
  let lastSharePointSyncLabel = $derived.by(() => {
    const sourceLastSyncedAt = sharePointSource?.config.lastSyncedAt
    if (sourceLastSyncedAt) {
      return `Last sync at ${formatTimestamp(sourceLastSyncedAt)} - SharePoint`
    }
    return "SharePoint"
  })

  const customRenderers = [
    { column: "icon", component: KnowledgeIconRenderer },
    { column: "filename", component: KnowledgeNameRenderer },
    { column: "displayStatus", component: KnowledgeStatusRenderer },
    { column: "actions", component: KnowledgeActionsRenderer },
  ]

  const loadAgentFiles = async () => {
    const agentId = currentAgent?._id
    if (!agentId) {
      loading = false
      loadedAgentId = undefined
      return
    }
    loading = true
    try {
      await fetchFiles(agentId)
      loadedAgentId = agentId
    } finally {
      loading = false
    }
  }

  const loadSharePointSites = async (agentId: string) => {
    if (!hasSharePointConnection) {
      sharePointSites = []
      sharePointSitesLoadedForAgent = undefined
      return
    }
    loadingSharePointSites = true
    try {
      const { sites } = await agentsStore.fetchAgentSharePointSites(agentId)
      sharePointSites = sites
      sharePointSitesLoadedForAgent = agentId
    } finally {
      loadingSharePointSites = false
    }
  }

  $effect(() => {
    const agentId = currentAgent?._id
    if (!agentId || loadedAgentId !== agentId) {
      loadAgentFiles().catch(error => {
        console.error(error)
        notifications.error("Failed to load files")
      })
    }
  })

  $effect(() => {
    const agentId = currentAgent?._id
    if (!agentId) {
      selectedSiteIds = []
      storedSharePointSites = []
      return
    }
    const sites = [...(sharePointSource?.config.sites || [])]
    storedSharePointSites = sites
    selectedSiteIds = sites.map(site => site.id)
  })

  $effect(() => {
    const agentId = currentAgent?._id
    if (
      !agentId ||
      !hasSharePointConnection ||
      sharePointSitesLoadedForAgent === agentId
    ) {
      return
    }
    loadSharePointSites(agentId).catch(error => {
      console.error(error)
      notifications.error("Failed to fetch SharePoint sites")
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
        await agentsStore.completeAgentSharePointConnection(currentAgent._id, {
          appId,
          continueSetupId,
        })
        await agentsStore.fetchAgents()
        currentUrl.searchParams.delete("continue_microsoft_setup")
        const query = currentUrl.searchParams.toString()
        const path = query
          ? `${currentUrl.pathname}?${query}`
          : currentUrl.pathname
        window.history.replaceState({}, "", path)
        notifications.success("SharePoint connected")
      }
      await loadAgentFiles()
    } catch (error) {
      console.error(error)
      notifications.error("Failed to load files")
    }
  })

  async function uploadFile(file: File) {
    const agentId = currentAgent?._id
    if (!agentId) {
      return
    }

    try {
      await agentsStore.uploadAgentFile(agentId, file)
      await fetchFiles(agentId)
      notifications.success("File uploaded")
    } catch (error: any) {
      console.error(error)
      notifications.error("Failed to upload file")
    }
  }

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
    const selectedSiteIdSet = new Set(selectedSiteIds)
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
        new Set([...selectedSiteIds, selectedSharePointSiteId])
      )
      await agentsStore.setAgentSharePointSites(agentId, {
        siteIds: nextSiteIds,
      })
      const result = await agentsStore.syncAgentSharePoint(agentId, {
        siteIds: nextSiteIds,
      })
      selectedSiteIds = nextSiteIds
      await fetchFiles(agentId)
      await agentsStore.fetchAgents()
      sharePointSiteModal?.hide()
      showSharePointSyncResult(result)
    } catch (error) {
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
    syncingSharePointSiteId = siteIds.length === 1 ? siteIds[0] : "__multiple__"
    try {
      const result = await agentsStore.syncAgentSharePoint(agentId, {
        siteIds,
      })
      await fetchFiles(agentId)
      await agentsStore.fetchAgents()
      showSharePointSyncResult(result)
    } catch (error) {
      console.error(error)
      notifications.error("Failed to sync SharePoint")
    } finally {
      syncingSharePointSiteId = undefined
    }
  }

  async function removeSharePointSite(siteId: string) {
    const agent = currentAgent
    if (!agent?._id || !sharePointSource) {
      return
    }
    const nextSites = (sharePointSource.config.sites || []).filter(
      site => site.id !== siteId
    )
    const nextSiteIds = nextSites.map(site => site.id)
    try {
      if (nextSiteIds.length === 0) {
        await agentsStore.disconnectAgentSharePoint(agent._id)
      } else {
        await agentsStore.setAgentSharePointSites(agent._id, {
          siteIds: nextSiteIds,
        })
      }
      await agentsStore.fetchAgents()
      await fetchFiles(agent._id)
      selectedSiteIds = nextSiteIds
      notifications.success("SharePoint site removed")
    } catch (error) {
      console.error(error)
      notifications.error("Failed to remove SharePoint site")
    }
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
      {hasSharePointConnection}
      on:upload={event => uploadFile(event.detail)}
      on:connectsharepoint={connectSharePoint}
      on:selectsharepoint={() =>
        openSharePointSiteModal().catch(error => {
          console.error(error)
          notifications.error("Failed to fetch SharePoint sites")
        })}
    />
  </div>

  <div class="section">
    {#if loading}
      <div class="loading-state">
        <ProgressCircle size="S" />
        <Body size="S">Loading files...</Body>
      </div>
    {:else if knowledgeTableRows.length === 0}
      <div class="empty-state">
        <Body size="S">No files uploaded yet</Body>
      </div>
    {:else}
      <Table
        compact
        quiet
        rounded
        hideHeader
        allowClickRows={false}
        allowEditRows={false}
        allowEditColumns={false}
        on:click={handleKnowledgeRowClick}
        data={knowledgeTableRows}
        schema={{
          icon: { width: "36px" },
          filename: { displayName: "Name", width: "minmax(0, 2fr)" },
          displayStatus: { displayName: "Status", width: "130px" },
          actions: {
            displayName: "",
            width: "90px",
            align: "Right",
            preventSelectRow: true,
          },
        }}
        {customRenderers}
      />
    {/if}
  </div>
</Layout>

<SelectSharePointSiteModal
  bind:this={sharePointSiteModal}
  {loadingSharePointSites}
  {sharePointSites}
  bind:selectedSiteId={selectedSharePointSiteId}
  on:save={saveSharePointSites}
/>

<SharePointFilesStatusModal
  bind:this={sharePointFilesStatusModal}
  siteName={selectedStatusSiteName}
  files={selectedStatusSiteFiles}
/>

<style>
  .section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-s);
    margin-top: var(--spacing-m);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-m);
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-s);
    padding: 24px 0;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-s);
    padding: 24px 16px;
    text-align: center;
    border: 1px dashed var(--spectrum-global-color-gray-400);
    border-radius: var(--radius-l);
  }
</style>
