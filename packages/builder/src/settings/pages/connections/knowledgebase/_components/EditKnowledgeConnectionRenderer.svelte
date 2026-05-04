<script lang="ts">
  import { ActionButton, notifications } from "@budibase/bbui"
  import { bb } from "@/stores/bb"
  import { appStore } from "@/stores/builder/app"
  import { AgentKnowledgeSourceConnectionAuthType } from "@budibase/types"

  export let row: {
    id?: string
    authType?: AgentKnowledgeSourceConnectionAuthType
  }

  $: canEdit =
    row?.authType === AgentKnowledgeSourceConnectionAuthType.CLIENT_CREDENTIALS

  const reconnect = () => {
    const appId = $appStore.appId
    if (!appId) {
      notifications.error("Missing app context to reconnect SharePoint")
      return
    }
    const returnPath = window.location.pathname
    const oauthUrl = `/api/agent/knowledge-sources/sharepoint/connect?appId=${encodeURIComponent(appId)}&returnPath=${encodeURIComponent(returnPath)}`
    window.location.href = oauthUrl
  }
</script>

{#if canEdit}
  <ActionButton
    size="S"
    on:click={() => {
      if (!row?.id) {
        return
      }
      bb.settings(`/connections/knowledge/${row.id}`)
    }}
  >
    Edit
  </ActionButton>
{:else}
  <ActionButton size="S" on:click={reconnect}>Reconnect</ActionButton>
{/if}
