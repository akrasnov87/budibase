<script lang="ts">
  import { AbsTooltip, ActionButton, ProgressCircle } from "@budibase/bbui"

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

<div class="file-actions" class:loading={row.syncing}>
  {#if row.kind === "sharepoint_connection"}
    <AbsTooltip text="Sync SharePoint">
      <ActionButton
        icon={row.syncing ? "" : "arrows-clockwise"}
        size="M"
        quiet
        on:click={sync}
        disabled={row.syncing}
      >
        {#if row.syncing}
          <ProgressCircle size="S" />
        {/if}
      </ActionButton>
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

  .file-actions.loading :global(.spectrum-ActionButton-label) {
    display: contents;
  }
</style>
