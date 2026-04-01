<script lang="ts">
  import { AbsTooltip, ActionButton } from "@budibase/bbui"

  export let row: {
    kind?: "sharepoint_connection" | "file"
    _id?: string
    onDelete?: () => void
    onSync?: () => void
    syncing?: boolean
  }

  const remove = () => {
    row.onDelete?.()
  }

  const sync = () => {
    row.onSync?.()
  }
</script>

<div class="file-actions">
  {#if row.kind === "sharepoint_connection"}
    <AbsTooltip text="Sync SharePoint">
      <ActionButton
        icon="arrows-clockwise"
        size="M"
        quiet
        on:click={sync}
        disabled={row.syncing}
      />
    </AbsTooltip>
    <AbsTooltip text="Disconnect SharePoint">
      <ActionButton icon="trash" size="M" quiet on:click={remove} />
    </AbsTooltip>
  {:else}
    <AbsTooltip text="Remove file">
      <ActionButton icon="trash" size="M" quiet on:click={remove} />
    </AbsTooltip>
  {/if}
</div>

<style>
  .file-actions {
    display: flex;
    justify-content: flex-end;
    margin-left: auto;
  }
</style>
