<script lang="ts">
  import { Button } from "@budibase/bbui"
  import { notifications } from "@budibase/bbui"
  import { agentsStore } from "@/stores/portal"
  import AddKnowledgeModal from "./AddKnowledgeModal.svelte"

  const BYTES_IN_MB = 1024 * 1024
  const MAX_FILE_SIZE_BYTES = 100 * BYTES_IN_MB
  const MAX_FILE_SIZE_LABEL = "100MB"

  interface Props {
    agentId?: string
    hasSharePointConnection: boolean
    onUploaded?: () => Promise<void>
    onConnectSharePoint?: () => void
    onSelectSharePoint?: () => Promise<void>
  }

  let {
    agentId,
    hasSharePointConnection,
    onUploaded,
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
    target.value = ""
    if (!file) return
    void uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    if (!agentId) {
      notifications.error("Missing agent context for file upload")
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      notifications.error(
        `Files cannot exceed ${MAX_FILE_SIZE_LABEL}. Please try again with a smaller file.`
      )
      return
    }
    try {
      await agentsStore.uploadAgentFile(agentId, file)
      await onUploaded?.()
      notifications.success("File uploaded")
    } catch (error: any) {
      console.error(error)
      const status = error?.status
      const message = error?.message || "Failed to upload file"
      if (status === 413) {
        notifications.error(
          `Files cannot exceed ${MAX_FILE_SIZE_LABEL}. Please try again with a smaller file.`
        )
        return
      }
      notifications.error(message)
    }
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
  {MAX_FILE_SIZE_LABEL}
  onUpload={handleUploadClick}
  onSharePoint={handleSharePoint}
/>
