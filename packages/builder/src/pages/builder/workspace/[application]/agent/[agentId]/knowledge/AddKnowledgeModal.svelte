<script lang="ts">
  import "@spectrum-css/dialog/dist/index-vars.css"
  import { ActionButton, Body, Modal, ModalContent } from "@budibase/bbui"
  import MicrosoftSharepointLogo from "assets/rest-template-icons/microsoft-sharepoint.svg"

  interface Props {
    onUpload?: () => void
    onSharePoint?: () => Promise<void>
  }

  let { onUpload, onSharePoint }: Props = $props()

  let modal = $state<Modal>()
  let loading = $state(false)

  export function show() {
    modal?.show()
  }

  function hide() {
    modal?.hide()
  }

  const handleUpload = () => {
    onUpload?.()
    hide()
  }

  const handleSharePoint = async () => {
    if (loading) {
      return
    }
    loading = true
    try {
      await onSharePoint?.()
      hide()
    } finally {
      loading = false
    }
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

      <ActionButton
        quiet
        icon="paperclip"
        fullWidth
        disabled={loading}
        on:click={handleUpload}
      >
        Add files
      </ActionButton>
      <ActionButton
        quiet
        icon={MicrosoftSharepointLogo}
        fullWidth
        disabled={loading}
        on:click={handleSharePoint}
      >
        {loading ? "Loading SharePoint..." : "Add from SharePoint"}
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
