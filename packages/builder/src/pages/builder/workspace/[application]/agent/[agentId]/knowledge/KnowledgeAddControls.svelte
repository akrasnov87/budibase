<script lang="ts">
  import { Button } from "@budibase/bbui"
  import AddKnowledgeModal from "./AddKnowledgeModal.svelte"

  interface Props {
    hasSharePointConnection: boolean
    onUpload?: (_file: File) => void
    onConnectSharePoint?: () => void
    onSelectSharePoint?: () => Promise<void>
  }

  let {
    hasSharePointConnection,
    onUpload,
    onConnectSharePoint,
    onSelectSharePoint,
  }: Props = $props()

  const ACCEPTED_KNOWLEDGE_FILE_TYPES =
    ".txt,.md,.markdown,.json,.yaml,.yml,.csv,.tsv,.pdf,.html,.htm,.xml,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.rtf"

  let fileInput = $state<HTMLInputElement>()
  let addKnowledgeModal = $state<AddKnowledgeModal>()

  const openAddKnowledgeModal = () => {
    addKnowledgeModal?.show()
  }

  const handleUploadClick = () => {
    fileInput?.click()
  }

  const handleFileUpload = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement
    const file = target?.files?.[0]
    if (!file) {
      return
    }
    onUpload?.(file)
    target.value = ""
  }

  const handleSharePoint = async () => {
    if (hasSharePointConnection) {
      await onSelectSharePoint?.()
      return
    }
    onConnectSharePoint?.()
  }
</script>

<Button icon="plus" size="S" secondary on:click={openAddKnowledgeModal}
  >Add knowledge</Button
>

<input
  type="file"
  accept={ACCEPTED_KNOWLEDGE_FILE_TYPES}
  hidden
  bind:this={fileInput}
  onchange={handleFileUpload}
/>

<AddKnowledgeModal
  bind:this={addKnowledgeModal}
  onUpload={handleUploadClick}
  onSharePoint={handleSharePoint}
/>
