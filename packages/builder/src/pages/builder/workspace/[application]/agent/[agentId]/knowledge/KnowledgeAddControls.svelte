<script lang="ts">
  import { Button } from "@budibase/bbui"
  import AddKnowledgeModal from "./AddKnowledgeModal.svelte"
  import { createEventDispatcher } from "svelte"

  interface ModalHandle {
    show: () => void
    hide: () => void
  }

  interface Props {
    hasSharePointConnection: boolean
  }

  let { hasSharePointConnection }: Props = $props()

  const dispatch = createEventDispatcher<{
    upload: File
    connectsharepoint: void
    selectsharepoint: void
  }>()

  const ACCEPTED_KNOWLEDGE_FILE_TYPES =
    ".txt,.md,.markdown,.json,.yaml,.yml,.csv,.tsv,.pdf,.html,.htm,.xml,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.rtf"

  let fileInput = $state<HTMLInputElement>()
  let addKnowledgeModal = $state<ModalHandle>()

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
    dispatch("upload", file)
    target.value = ""
  }

  const handleSharePoint = () => {
    if (hasSharePointConnection) {
      dispatch("selectsharepoint")
      return
    }
    dispatch("connectsharepoint")
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
  on:upload={handleUploadClick}
  on:sharepoint={handleSharePoint}
/>
