<script lang="ts">
  import { onMount } from "svelte"
  import { bb } from "@/stores/bb"
  import {
    Layout,
    Table,
    Button,
    ActionMenu,
    MenuItem,
    notifications,
  } from "@budibase/bbui"
  import { appStore } from "@/stores/builder/app"
  import RouteActions from "@/settings/components/RouteActions.svelte"
  import KnowledgeConnectionIconRenderer from "./knowledgebase/_components/KnowledgeConnectionIconRenderer.svelte"
  import EditKnowledgeConnectionRenderer from "./knowledgebase/_components/EditKnowledgeConnectionRenderer.svelte"
  import { knowledgeConnectionsStore } from "@/stores/portal"

  const customRenderers = [
    {
      column: "edit",
      component: EditKnowledgeConnectionRenderer,
    },
    {
      column: "icon",
      component: KnowledgeConnectionIconRenderer,
    },
  ]

  const schema = {
    icon: { width: "40px", displayName: "" },
    connectionName: { width: "160px", displayName: "Connection" },
    account: { width: "1fr", displayName: "Account" },
    authType: { width: "140px", displayName: "Auth" },
    edit: { width: "auto", displayName: "" },
  }

  let loading = $state(true)

  let rows = $derived(
    $knowledgeConnectionsStore.connections
      ?.map(connection => ({
        id: connection._id!,
        edit: connection._id!,
        icon: connection.sourceType,
        connectionName: "Microsoft",
        account: connection.account || "-",
        authType:
          connection.authType === "client_credentials"
            ? "Client credentials"
            : "OAuth",
      }))
      .sort((a, b) => a.connectionName.localeCompare(b.connectionName))
  )

  const connectSharePoint = () => {
    const appId = $appStore.appId
    if (!appId) {
      notifications.error("Missing app context to connect SharePoint")
      return
    }
    const returnPath = window.location.pathname
    const oauthUrl = `/api/agent/knowledge-sources/sharepoint/connect?appId=${encodeURIComponent(appId)}&returnPath=${encodeURIComponent(returnPath)}`
    window.location.href = oauthUrl
  }

  const openClientCredentialsModal = () => {
    bb.settings("/connections/knowledge/new")
  }

  onMount(async () => {
    try {
      await knowledgeConnectionsStore.fetch()
    } catch (e) {
      console.error("Failed to load knowledge connections", e)
      notifications.error("Failed to load knowledge connections")
    } finally {
      loading = false
    }
  })
</script>

<Layout noPadding gap="XS">
  <RouteActions>
    <div class="section-header">
      <ActionMenu align="right">
        <div slot="control">
          <Button cta size="M">Add connection</Button>
        </div>
        <MenuItem on:click={connectSharePoint}>Connect with auth</MenuItem>
        <MenuItem on:click={openClientCredentialsModal}>
          Client credentials
        </MenuItem>
      </ActionMenu>
    </div>
  </RouteActions>

  <Table
    compact
    rounded
    data={rows}
    {loading}
    {schema}
    {customRenderers}
    hideHeader
    allowEditRows={false}
    allowClickRows={false}
    allowEditColumns={false}
  />
</Layout>

<style>
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-l);
    height: 24px;
  }
</style>
