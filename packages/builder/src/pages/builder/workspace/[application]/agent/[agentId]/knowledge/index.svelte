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
  import { onDestroy, onMount } from "svelte"

  interface ModalHandle {
    show: () => void
    hide: () => void
  }

  interface FileKnowledgeTableRow {
    kind: "file"
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
    _id: string
    filename: string
    subtitle: string
    displayStatus: string
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
  let loadingSharePointSites = $state(false)
  let syncingSharePoint = $state(false)
  let sharePointSitesLoadedForAgent = $state<string | undefined>()
  let sharePointSiteModal = $state<ModalHandle>()
  let selectedSharePointSiteId = $state("")

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

  const fetchFiles = async (agentId: string) => {
    await agentsStore.fetchAgentFiles(agentId)
  }

  const toFileTableRows = (list: KnowledgeBaseFile[]): FileKnowledgeTableRow[] =>
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

  let fileTableRows: FileKnowledgeTableRow[] = $derived.by(() =>
    toFileTableRows(
      files.filter(file => !file.externalSourceId?.startsWith("sharepoint:"))
    )
  )
  let sharePointConnectionRow: SharePointConnectionTableRow | null = $derived.by(() => {
    if (!sharePointSource && !hasSharePointConnection) {
      return null
    }
    const selectedSiteName =
      sharePointSites.find(site => site.id === selectedSiteIds[0])?.name ||
      "SharePoint"
    return {
      kind: "sharepoint_connection" as const,
      _id: "sharepoint-connection",
      filename: selectedSiteName,
      subtitle: lastSharePointSyncLabel,
      displayStatus: hasSharePointConnection ? "Connected" : "Disconnected",
      onDelete: disconnectSharePoint,
      onSync: syncSharePointNow,
      syncing: syncingSharePoint,
    }
  })
  let knowledgeTableRows: KnowledgeTableRow[] = $derived.by(() => {
    const rows: KnowledgeTableRow[] = [...fileTableRows]
    if (sharePointConnectionRow) {
      rows.unshift(sharePointConnectionRow)
    }
    return rows
  })
  let lastSharePointSyncLabel = $derived.by(() => {
    const sharePointFiles = files.filter(file =>
      file.externalSourceId?.startsWith("sharepoint:")
    )
    if (sharePointFiles.length === 0) {
      return "SharePoint"
    }
    const timestamps = sharePointFiles
      .map(file => file.processedAt || file.updatedAt || file.createdAt)
      .filter(Boolean)
      .map(value => new Date(value as string).getTime())
      .filter(value => !Number.isNaN(value))
    if (timestamps.length === 0) {
      return "SharePoint"
    }
    const latest = new Date(Math.max(...timestamps))
    return `Last sync at ${latest.toLocaleString()} - SharePoint`
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
      return
    }
    selectedSiteIds = [...(sharePointSource?.config.siteIds || [])]
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

  async function disconnectSharePoint() {
    const agent = currentAgent
    if (!agent?._id || !agent?._rev) {
      return
    }
    try {
      const nextSources = (agent.knowledgeSources || []).filter(
        source => source.type !== AgentKnowledgeSourceType.SHAREPOINT
      )
      await agentsStore.updateAgent({
        ...agent,
        knowledgeSources: nextSources,
      })
      sharePointSites = []
      selectedSiteIds = []
      selectedSharePointSiteId = ""
      notifications.success("SharePoint disconnected")
    } catch (error) {
      console.error(error)
      notifications.error("Failed to disconnect SharePoint")
    }
  }

  async function openSharePointSiteModal() {
    const agentId = currentAgent?._id
    if (!agentId || !hasSharePointConnection) {
      return
    }
    await loadSharePointSites(agentId)
    selectedSharePointSiteId =
      selectedSiteIds[0] || sharePointSites[0]?.id || selectedSharePointSiteId
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
      selectedSiteIds = [selectedSharePointSiteId]
      const result = await agentsStore.syncAgentSharePoint(agentId, {
        siteIds: [selectedSharePointSiteId],
      })
      await fetchFiles(agentId)
      await agentsStore.fetchAgents()
      sharePointSiteModal?.hide()
      notifications.success(
        `SharePoint sync complete (${result.synced} synced, ${result.failed} failed)`
      )
    } catch (error) {
      console.error(error)
      notifications.error("Failed to sync SharePoint")
    }
  }

  async function syncSharePointNow() {
    const agentId = currentAgent?._id
    if (!agentId) {
      return
    }
    syncingSharePoint = true
    try {
      const result = await agentsStore.syncAgentSharePoint(agentId, {
        siteIds: selectedSiteIds,
      })
      await fetchFiles(agentId)
      await agentsStore.fetchAgents()
      notifications.success(
        `SharePoint sync complete (${result.synced} synced, ${result.failed} failed)`
      )
    } catch (error) {
      console.error(error)
      notifications.error("Failed to sync SharePoint")
    } finally {
      syncingSharePoint = false
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
        data={knowledgeTableRows}
        schema={{
          icon: { width: "36px" },
          filename: { displayName: "Name", width: "minmax(0, 2fr)" },
          displayStatus: { displayName: "Status", width: "130px" },
          actions: { displayName: "", width: "90px", align: "Right" },
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
