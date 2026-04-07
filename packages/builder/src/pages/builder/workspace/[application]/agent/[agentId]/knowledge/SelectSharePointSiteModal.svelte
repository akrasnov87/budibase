<script lang="ts">
  import { Body, Modal, ModalContent, Select } from "@budibase/bbui"
  import type { KnowledgeSourceOption } from "@budibase/types"
  import { createEventDispatcher } from "svelte"

  interface Props {
    loadingSharePointSites: boolean
    sharePointSites?: KnowledgeSourceOption[]
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
  <ModalContent
    custom
    showCloseIcon={false}
    showDivider={false}
    confirmText="Add"
    onConfirm={() => dispatch("save")}
    onCancel={hide}
  >
    <div class="content">
      <div class="title">
        <Body size="S">Add from SharePoint</Body>
      </div>
      {#if loadingSharePointSites}
        <Body size="S">Loading SharePoint sites...</Body>
      {:else if sharePointSites.length === 0}
        <Body size="S">No SharePoint sites found for this connection.</Body>
      {:else}
        <Select
          bind:value={selectedSiteId}
          label="Select site"
          options={sharePointSites}
          getOptionLabel={o => o.name || o.webUrl || o.id}
          getOptionValue={o => o.id}
        ></Select>
      {/if}
    </div>
  </ModalContent>
</Modal>

<style>
  .content {
    padding: var(--spacing-l);
    width: 360px;
  }

  .title {
    padding-bottom: var(--spacing-s);
  }
</style>
