<script lang="ts">
  import "@spectrum-css/dialog/dist/index-vars.css"
  import { ActionButton, Body, Modal } from "@budibase/bbui"
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
  <div class="content">
    <div class="title">
      <Body size="M">Add knowledge to agent</Body>
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
</Modal>

<style>
  .content {
    width: 300px;
    padding: var(--spacing-s);
  }
  .title {
    padding: var(--spacing-s);
    width: 100%;
  }
</style>
