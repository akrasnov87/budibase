<script lang="ts">
  import { ActionButton } from "@budibase/bbui"
  import { bb } from "@/stores/bb"

  export let row: { id?: string }
</script>

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
