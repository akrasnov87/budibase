<script lang="ts">
  import { ActionButton } from "@budibase/bbui"
  import { bb } from "@/stores/bb"
  import { AgentKnowledgeSourceConnectionAuthType } from "@budibase/types"

  export let row: {
    id?: string
    authType?: AgentKnowledgeSourceConnectionAuthType
  }

  $: canEdit =
    row?.authType === AgentKnowledgeSourceConnectionAuthType.CLIENT_CREDENTIALS
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
{/if}
