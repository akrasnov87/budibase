<script lang="ts">
  import { onMount } from "svelte"
  import { Layout, Table, Body } from "@budibase/bbui"
  import { API } from "@/api"
  import {
    AgentKnowledgeSourceType,
    type AgentKnowledgeSourceConnection,
  } from "@budibase/types"
  import KnowledgeConnectionIconRenderer from "./_components/KnowledgeConnectionIconRenderer.svelte"
  import { agentsStore } from "@/stores/portal"

  interface KnowledgeConnectionRow {
    id: string
    icon: string
    connectionName: string
    tenant: string
    account: string
  }

  const customRenderers = [
    {
      column: "icon",
      component: KnowledgeConnectionIconRenderer,
    },
  ]

  const schema = {
    icon: { width: "40px", displayName: "" },
    connectionName: { width: "200px", displayName: "Connection" },
    tenant: { width: "1fr", displayName: "Tenant" },
    account: { width: "1fr", displayName: "Account" },
    useCount: { width: "60px", displayName: "#" },
  }

  const toConnectionRows = (
    connections: AgentKnowledgeSourceConnection[]
  ): KnowledgeConnectionRow[] => {
    return connections
      .map(connection => ({
        id: connection._id!,
        icon: connection.sourceType,
        connectionName: "Microsoft",
        tenant: connection.tenant || connection.tenantId || "-",
        account: connection.account || "-",
      }))
      .sort((a, b) => a.connectionName.localeCompare(b.connectionName))
  }

  let loading = $state(true)
  let rows = $state<KnowledgeConnectionRow[]>([])

  let enrichedRows = $derived(
    rows.map(r => ({
      ...r,
      useCount: $agentsStore.agents.filter(a =>
        a.knowledgeSources?.some(
          s => s.type === AgentKnowledgeSourceType.SHAREPOINT
        )
      ).length,
    }))
  )

  onMount(async () => {
    try {
      const [response] = await Promise.all([
        API.fetchAgentKnowledgeSourceConnections(),
        async () => {
          if (!$agentsStore.agentsLoaded) {
            await agentsStore.init()
          }
        },
      ])
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

  {#if !loading && enrichedRows.length === 0}
    <div class="empty-state">
      <Body size="S">No knowledge sources are currently connected.</Body>
    </div>
  {:else}
    <Table
      compact
      rounded
      data={enrichedRows}
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
