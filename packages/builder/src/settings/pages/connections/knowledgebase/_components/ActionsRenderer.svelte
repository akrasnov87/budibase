<script lang="ts">
  import { ActionButton, notifications } from "@budibase/bbui"
  import { bb } from "@/stores/bb"
  import { appStore } from "@/stores/builder/app"
  import type { AgentKnowledgeSourceConnectionAuthType } from "@budibase/types"

  export let row: {
    id: string
    authType: AgentKnowledgeSourceConnectionAuthType
  }

  $: canEdit = row.authType === "client_credentials"

  const reconnect = () => {
    if (!row.id) {
      notifications.error("Missing connection ID to reconnect SharePoint")
      return
    }
    const appId = $appStore.appId
    if (!appId) {
      notifications.error("Missing app context to reconnect SharePoint")
      return
    }
    const returnPath = window.location.pathname
    const params = new URLSearchParams({
      appId,
      returnPath,
      connectionId: row.id,
    })
    const oauthUrl = `/api/agent/knowledge-sources/sharepoint/connect?${params.toString()}`
    window.location.href = oauthUrl
  }
</script>

<div class="action">
  {#if canEdit}
    <ActionButton
      size="S"
      on:click={() => {
        bb.settings(`/connections/knowledge/${row.id}`)
      }}
    >
      Edit
    </ActionButton>
  {:else}
    <ActionButton size="S" on:click={reconnect}>Reconnect</ActionButton>
  {/if}
</div>

<style>
  .action {
    min-width: 100%;
    display: flex;
    justify-content: end;
  }
</style>
