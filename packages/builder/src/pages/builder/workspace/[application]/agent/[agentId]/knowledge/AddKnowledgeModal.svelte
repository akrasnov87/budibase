<script lang="ts">
  import "@spectrum-css/dialog/dist/index-vars.css"
  import { ActionButton, Body, Modal, ModalContent } from "@budibase/bbui"
  import { createEventDispatcher } from "svelte"
  import MicrosoftSharepointLogo from "assets/rest-template-icons/microsoft-sharepoint.svg"

  const dispatch = createEventDispatcher<{
    upload: void
    sharepoint: void
  }>()

  let modal = $state<Modal>()

  export function show() {
    modal?.show()
  }

  export function hide() {
    modal?.hide()
  }

  const handleUpload = () => {
    hide()
    dispatch("upload")
  }

  const handleSharePoint = () => {
    hide()
    dispatch("sharepoint")
  }
</script>

<Modal bind:this={modal}>
  <ModalContent
    showConfirmButton={false}
    showCancelButton={false}
    showCloseIcon={false}
    showDivider={false}
    custom
  >
    <div class="content">
      <div class="title">
        <Body size="S">Add knowledge to agent</Body>
      </div>

      <ActionButton quiet icon="paperclip" fullWidth on:click={handleUpload}>
        Add files
      </ActionButton>
      <ActionButton
        quiet
        icon={MicrosoftSharepointLogo}
        fullWidth
        on:click={handleSharePoint}
      >
        Add from SharePoint
      </ActionButton>
    </div>
  </ModalContent>
</Modal>

<style>
  .content {
    width: 300px;
    padding: var(--spacing-s);
  }
  .title {
    padding: var(--spacing-s);
  }
</style>
