<script lang="ts">
  import { Helpers } from "@budibase/bbui"
  import { KnowledgeBaseFileStatus } from "@budibase/types"
  import type { KnowledgeTableRow } from "./types"

  export interface Props {
    row: KnowledgeTableRow
  }

  let { row }: Props = $props()

  const mimeTypeLabels: Record<string, string> = {
    "application/pdf": "PDF",
    "text/plain": "Text",
    "text/markdown": "Markdown",
    "text/csv": "CSV",
    "application/msword": "DOC",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "DOCX",
    "application/vnd.ms-excel": "XLS",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
    "application/vnd.ms-powerpoint": "PPT",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      "PPTX",
  }

  const getDisplayMimeType = (mimetype?: string) => {
    if (!mimetype) {
      return "Text"
    }
    return mimeTypeLabels[mimetype] || Helpers.capitalise(mimetype)
  }
</script>

<div class="file-name">
  <span class="file-title">{row.filename}</span>
  <span
    class="file-meta"
    title={
      row.kind === "sharepoint_connection"
        ? row.subtitle || "SharePoint"
        : row.mimetype || "text/plain"
    }
    >{row.kind === "sharepoint_connection"
      ? row.subtitle || "SharePoint"
      : getDisplayMimeType(row.mimetype)}</span
  >
  {#if row.kind !== "sharepoint_connection" && row.status === KnowledgeBaseFileStatus.FAILED && row.errorMessage}
    <span class="file-error">{row.errorMessage}</span>
  {/if}
</div>

<style>
  .file-name {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .file-title {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-meta,
  .file-error {
    font-size: 12px;
    color: var(--spectrum-global-color-gray-700);
  }

  .file-meta {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-error {
    color: var(--spectrum-semantic-negative-color-default);
  }
</style>
