<script lang="ts">
  import { Body, Modal, ModalContent, Table } from "@budibase/bbui"
  import { helpers } from "@budibase/shared-core"
  import {
    KnowledgeBaseFileStatus,
    type KnowledgeBaseFile,
  } from "@budibase/types"
  import KnowledgeIconRenderer from "./renderers/KnowledgeIconRenderer.svelte"
  import KnowledgeNameRenderer from "./renderers/KnowledgeNameRenderer.svelte"
  import KnowledgeStatusRenderer from "./renderers/KnowledgeStatusRenderer.svelte"

  export interface Props {
    siteName?: string
    files?: KnowledgeBaseFile[]
  }

  let { siteName = "SharePoint site", files = [] }: Props = $props()

  let modal = $state<Modal>()

  export function show() {
    modal?.show()
  }

  export function hide() {
    modal?.hide()
  }

  interface FileKnowledgeTableRow {
    kind: "file"
    _id?: string
    filename: string
    status: KnowledgeBaseFileStatus
    displayStatus: string
    size: string
    updatedAt: string | number
    mimetype?: string
    errorMessage?: string
  }

  const readableStatus: Record<KnowledgeBaseFileStatus, string> = {
    [KnowledgeBaseFileStatus.PROCESSING]: "Processing",
    [KnowledgeBaseFileStatus.READY]: "Ready",
    [KnowledgeBaseFileStatus.FAILED]: "Failed",
  }

  const formatTimestamp = (value?: string | number) => {
    if (!value) {
      return "—"
    }
    try {
      return new Date(value).toLocaleString()
    } catch (error) {
      return value
    }
  }

  const toFileTableRows = (
    list: KnowledgeBaseFile[]
  ): FileKnowledgeTableRow[] =>
    list
      .map(file => ({
        kind: "file" as const,
        _id: file._id,
        filename: file.filename,
        status: file.status,
        displayStatus: readableStatus[file.status] || file.status,
        size: helpers.formatBytes(file.size, " "),
        updatedAt: formatTimestamp(
          file.processedAt || file.updatedAt || file.createdAt
        ),
        mimetype: file.mimetype,
        errorMessage: file.errorMessage,
      }))
      .sort((a, b) => a.filename.localeCompare(b.filename))

  let fileTableRows = $derived.by(() => toFileTableRows(files))

  const customRenderers = [
    { column: "icon", component: KnowledgeIconRenderer },
    { column: "filename", component: KnowledgeNameRenderer },
    { column: "displayStatus", component: KnowledgeStatusRenderer },
  ]
</script>

<Modal bind:this={modal}>
  <ModalContent
    custom
    showConfirmButton={false}
    showCancelButton={false}
    showDivider={false}
    onCancel={hide}
  >
    <div class="content">
      <div class="title-wrap">
        <Body size="S">SharePoint files</Body>
        <Body size="XS" color="var(--spectrum-global-color-gray-600)">
          Site: {siteName}
        </Body>
      </div>
      {#if files.length === 0}
        <div class="empty">
          <Body size="S">No files synced yet.</Body>
        </div>
      {:else}
        <Table
          compact
          quiet
          rounded
          hideHeader
          allowClickRows={false}
          allowEditRows={false}
          allowEditColumns={false}
          data={fileTableRows}
          schema={{
            icon: { width: "36px" },
            filename: { displayName: "Name", width: "minmax(0, 2fr)" },
            displayStatus: { displayName: "Status", width: "130px" },
          }}
          {customRenderers}
        />
      {/if}
    </div>
  </ModalContent>
</Modal>

<style>
  .content {
    width: 560px;
    max-width: 90vw;
    padding: var(--spacing-l);
  }

  .title-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xxs);
    margin-bottom: var(--spacing-m);
  }

  .empty {
    padding: var(--spacing-s) 0;
  }
</style>
