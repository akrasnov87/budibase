<script lang="ts">
  import { AbsTooltip, ActionButton } from "@budibase/bbui"

  interface Props {
    row: {
      kind?: "sharepoint_connection" | "file"
      _id?: string
      onDelete?: () => Promise<void>
      onSync?: () => Promise<void>
    }
  }

  let { row }: Props = $props()

  let deleting = $state(false)
  let syncing = $state(false)
  let renderedRowId = $state<string | undefined>(row._id)

  let processing = $derived(deleting || syncing)

  $effect(() => {
    if (renderedRowId === row._id) {
      return
    }
    renderedRowId = row._id
    deleting = false
    syncing = false
  })

  const remove = async () => {
    try {
      deleting = true
      await row.onDelete?.()
    } finally {
      deleting = false
    }
  }

  const sync = async () => {
    try {
      syncing = true
      await row.onSync?.()
    } finally {
      syncing = false
    }
  }
</script>

<div class="file-actions" class:loading={processing}>
  {#if row.kind === "sharepoint_connection"}
    <AbsTooltip text="Sync SharePoint">
      <ActionButton
        icon={"arrows-clockwise"}
        size="M"
        quiet
        on:click={sync}
        disabled={processing}
        loading={syncing}
      ></ActionButton>
    </AbsTooltip>
    <AbsTooltip text="Disconnect SharePoint">
      <ActionButton
        icon="trash"
        size="M"
        quiet
        on:click={remove}
        disabled={processing}
        loading={deleting}
      />
    </AbsTooltip>
  {:else}
    <AbsTooltip text="Remove file">
      <ActionButton
        icon="trash"
        size="M"
        quiet
        on:click={remove}
        disabled={processing}
        loading={deleting}
      />
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
