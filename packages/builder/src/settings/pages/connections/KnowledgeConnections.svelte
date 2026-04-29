<script lang="ts">
  import { onMount } from "svelte"
  import { Layout, Table, Body } from "@budibase/bbui"
  import { API } from "@/api"
  import type { AgentKnowledgeSourceConnection } from "@budibase/types"
  import KnowledgeConnectionIconRenderer from "./_components/KnowledgeConnectionIconRenderer.svelte"

  interface KnowledgeConnectionRow {
    icon: string
    connectionName: string
    sites: string
    usedBy: string
  }

  const customRenderers = [
    {
      column: "icon",
      component: KnowledgeConnectionIconRenderer,
    },
  ]

  const schema = {
    icon: { width: "40px", displayName: "" },
    connectionName: { width: "220px", displayName: "Connection" },
    sites: { width: "1fr", displayName: "Sites" },
    usedBy: { width: "260px", displayName: "Used by" },
  }

  const toConnectionRows = (
    connections: AgentKnowledgeSourceConnection[]
  ): KnowledgeConnectionRow[] => {
    return connections
      .map(connection => ({
        icon: connection.sourceType,
        connectionName: connection.connectionKey,
        sites: connection.connectionKey,
        usedBy: "-",
      }))
      .sort((a, b) => a.connectionName.localeCompare(b.connectionName))
  }

  let loading = $state(true)
  let rows = $state<KnowledgeConnectionRow[]>([])

  onMount(async () => {
    try {
      const response = await API.fetchAgentKnowledgeSourceConnections()
      rows = toConnectionRows(response.connections || [])
    } finally {
      loading = false
    }
  })
</script>

<Layout noPadding gap="XS">
  <div class="section-header">
    <div class="section-title">Connected knowledge sources</div>
  </div>

  {#if !loading && rows.length === 0}
    <div class="empty-state">
      <Body size="S">No knowledge sources are currently connected.</Body>
    </div>
  {:else}
    <Table
      compact
      rounded
      data={rows}
      {loading}
      {schema}
      {customRenderers}
      allowEditRows={false}
      allowClickRows={false}
      allowEditColumns={false}
    />
  {/if}
</Layout>

<style>
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-l);
    height: 24px;
  }

  .section-title {
    font-size: 13px;
    color: var(--grey-7, #a2a2a2);
  }

  .empty-state {
    padding: var(--spacing-m);
    border: 1px solid var(--spectrum-global-color-gray-300);
    border-radius: var(--radius-m);
  }
</style>
