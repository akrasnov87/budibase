<script lang="ts">
  import { Body, Button, Modal } from "@budibase/bbui"
  import type { SharePointSite } from "@budibase/types"
  import { createEventDispatcher } from "svelte"

  interface Props {
    loadingSharePointSites: boolean
    sharePointSites?: SharePointSite[]
    selectedSiteId?: string
  }

  let {
    loadingSharePointSites,
    sharePointSites = [],
    selectedSiteId = $bindable(""),
  }: Props = $props()

  const dispatch = createEventDispatcher<{
    save: void
  }>()

  let modal = $state<Modal>()

  export function show() {
    modal?.show()
  }

  export function hide() {
    modal?.hide()
  }
</script>

<Modal bind:this={modal}>
  <div class="add-knowledge-modal">
    <Body size="M">Add from SharePoint</Body>
    <div class="site-field">
      <Body size="S">Select site</Body>
      {#if loadingSharePointSites}
        <Body size="S">Loading SharePoint sites...</Body>
      {:else if sharePointSites.length === 0}
        <Body size="S">No SharePoint sites found for this connection.</Body>
      {:else}
        <select
          class="site-select"
          bind:value={selectedSiteId}
          aria-label="Select SharePoint site"
        >
          {#each sharePointSites as site}
            <option value={site.id}
              >{site.name || site.webUrl || site.id}</option
            >
          {/each}
        </select>
      {/if}
    </div>
    <div class="modal-actions">
      <Button size="S" quiet on:click={hide}>Cancel</Button>
      <Button
        size="S"
        on:click={() => dispatch("save")}
        disabled={!selectedSiteId}>Add</Button
      >
    </div>
  </div>
</Modal>

<style>
  .add-knowledge-modal {
    padding: var(--spacing-m);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-m);
    min-width: 360px;
  }

  .site-field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .site-select {
    width: 100%;
    background: var(--spectrum-global-color-gray-75);
    border: 1px solid var(--spectrum-global-color-gray-300);
    border-radius: 8px;
    padding: 8px 12px;
    color: var(--spectrum-global-color-gray-900);
    font-size: 13px;
  }

  .modal-actions {
    width: 100%;
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-s);
  }
</style>
