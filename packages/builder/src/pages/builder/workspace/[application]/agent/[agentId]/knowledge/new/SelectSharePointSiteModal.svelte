<script lang="ts">
  import { agentsStore, knowledgeConnectionsStore } from "@/stores/portal"
  import { workspaceDeploymentStore } from "@/stores/builder"
  import { notifications } from "@budibase/bbui"
  import {
    Body,
    Button,
    ButtonGroup,
    Modal,
    ModalContent,
    Select,
  } from "@budibase/bbui"

  import { type KnowledgeSourceOption } from "@budibase/types"
  import { EXCLUDE_ALL_PATTERN } from "../sharepoint/sharePointModalUtils"
  import type { SharePointSelectionMode } from "../renderers/types"

  export interface Props {
    agentId: string
    existingSiteIds?: string[]
    onCreated?: (
      _siteId: string,
      _mode: SharePointSelectionMode
    ) => Promise<void> | void
  }

  let { agentId, existingSiteIds = [], onCreated }: Props = $props()

  let sharePointSites = $state<KnowledgeSourceOption[]>([])
  let sharePointConnectionOptions = $state<
    { id: string; name: string; account: string }[]
  >([])
  let availableSites = $derived.by(() => {
    const excluded = new Set(existingSiteIds)
    return sharePointSites.filter(site => !excluded.has(site.id))
  })

  let selectedSiteId = $state("")
  let selectedConnectionId = $state("")
  let connectionModal = $state<Modal>()
  let siteModal = $state<Modal>()
  let loadingNextStep = $state(false)

  const displaySharePointSites = $derived(
    [...availableSites]
      .map(site => ({
        ...site,
        name: site.name || site.webUrl || site.id,
      }))
      .sort((a, b) => {
        const aKey = a.name.trim().toLocaleLowerCase()
        const bKey = b.name.trim().toLocaleLowerCase()
        return aKey.localeCompare(bKey)
      })
  )

  let saving = $state<boolean>()

  const loadSharePointConnections = async () => {
    if (!agentId) {
      sharePointConnectionOptions = []
      selectedConnectionId = ""
      sharePointSites = []
      selectedSiteId = ""
      return
    }
    try {
      const connections = await knowledgeConnectionsStore.fetch()
      const sharePointConnections = connections.filter(
        connection => connection.sourceType === "sharepoint"
      )
      sharePointConnectionOptions = sharePointConnections.map(connection => ({
        id: connection._id!,
        name: "Microsoft",
        account: connection.account || "-",
      }))
      selectedConnectionId = sharePointConnections[0]?._id || ""
    } catch (error) {
      console.error(error)
      notifications.error("Failed to fetch SharePoint connections")
      sharePointConnectionOptions = []
      selectedConnectionId = ""
    }
  }

  const loadSharePointSites = async () => {
    if (!selectedConnectionId) {
      sharePointSites = []
      selectedSiteId = ""
      return
    }

    sharePointSites = []
    selectedSiteId = ""
    try {
      const response =
        await agentsStore.fetchAgentKnowledgeSourceOptions(selectedConnectionId)
      sharePointSites = response.options
      selectedSiteId = displaySharePointSites[0]?.id || ""
    } catch (error) {
      console.error(error)
      notifications.error("Failed to fetch SharePoint sites")
      sharePointSites = []
      selectedSiteId = ""
    }
  }

  export async function show() {
    await loadSharePointConnections()
    if (sharePointConnectionOptions.length === 1 && selectedConnectionId) {
      loadingNextStep = true
      try {
        await loadSharePointSites()
        siteModal?.show()
      } finally {
        loadingNextStep = false
      }
      return
    }
    connectionModal?.show()
  }

  export function hide() {
    connectionModal?.hide()
    siteModal?.hide()
  }

  const handleSelect = async (mode: SharePointSelectionMode) => {
    if (!agentId || !selectedSiteId) {
      return
    }

    saving = true
    try {
      if (!selectedConnectionId) {
        notifications.error("No SharePoint connection found")
        return
      }
      await agentsStore.connectAgentSharePointSite(agentId, {
        connectionId: selectedConnectionId,
        siteId: selectedSiteId,
        filters: mode === "selective" ? [EXCLUDE_ALL_PATTERN] : undefined,
      })
      await workspaceDeploymentStore.fetch()
      notifications.success("SharePoint site added")
      hide()

      await onCreated?.(selectedSiteId, mode)
    } catch (error) {
      console.error(error)
      notifications.error("Failed to add SharePoint site")
    } finally {
      saving = false
    }
  }

  const goToSitesStep = async () => {
    if (!selectedConnectionId) {
      return
    }
    loadingNextStep = true
    try {
      await loadSharePointSites()
      connectionModal?.hide()
      siteModal?.show()
    } finally {
      loadingNextStep = false
    }
  }
</script>

<Modal bind:this={connectionModal}>
  <ModalContent
    custom
    showDivider={false}
    showConfirmButton={false}
    showCancelButton={false}
  >
    <div class="content">
      <div class="title">
        <Body size="S">Add from SharePoint</Body>
      </div>

      {#if sharePointConnectionOptions.length === 0}
        <Body size="S">No SharePoint connections found.</Body>
      {:else}
        <Select
          bind:value={selectedConnectionId}
          label="Select connection"
          options={sharePointConnectionOptions}
          getOptionLabel={o => `${o.name} - ${o.account}`}
          getOptionValue={o => o.id}
        />
      {/if}
    </div>

    <ButtonGroup slot="footer">
      <Button
        cta
        primary
        on:click={goToSitesStep}
        disabled={!selectedConnectionId || loadingNextStep}
      >
        {loadingNextStep ? "Loading..." : "Next"}
      </Button>
    </ButtonGroup>
  </ModalContent>
</Modal>

<Modal bind:this={siteModal}>
  <ModalContent
    custom
    showDivider={false}
    showConfirmButton={false}
    showCancelButton={false}
    disabled={!selectedSiteId}
  >
    <div class="content">
      <div class="title">
        <Body size="S">Add from SharePoint</Body>
      </div>

      {#if availableSites.length === 0}
        <Body size="S">No SharePoint sites found for this connection.</Body>
      {:else}
        <Select
          bind:value={selectedSiteId}
          label="Select site"
          options={displaySharePointSites}
          getOptionLabel={o => o.name || o.webUrl || o.id}
          getOptionSubtitle={o => o.webUrl}
          getOptionValue={o => o.id}
        />
      {/if}
    </div>

    <ButtonGroup slot="footer">
      <Button
        cta
        secondary
        on:click={() => {
          siteModal?.hide()
          connectionModal?.show()
        }}
        disabled={saving}
      >
        Back
      </Button>
      <Button
        cta
        primary
        on:click={() => handleSelect("selective")}
        disabled={!selectedSiteId || saving}
      >
        Selective sync
      </Button>
      <Button
        cta
        on:click={() => handleSelect("all")}
        disabled={!selectedSiteId || saving}
      >
        Sync all
      </Button>
    </ButtonGroup>
  </ModalContent>
</Modal>

<style>
  .content {
    padding: var(--spacing-l);
    width: min(460px, 95vw);
  }

  .title {
    padding-bottom: var(--spacing-s);
  }
</style>
