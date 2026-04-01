<script lang="ts">
  import { StatusLight } from "@budibase/bbui"
  import { KnowledgeBaseFileStatus } from "@budibase/types"

  interface Props {
    row: {
      kind?: "sharepoint_connection" | "file"
      displayStatus: string
      status?: KnowledgeBaseFileStatus
      syncedCount?: number
      totalCount?: number
      failedCount?: number
    }
  }

  let { row }: Props = $props()

  const getStatusProps = (status?: KnowledgeBaseFileStatus) => {
    switch (status) {
      case KnowledgeBaseFileStatus.READY:
        return { positive: true }
      case KnowledgeBaseFileStatus.FAILED:
        return { negative: true }
      default:
        return { notice: true }
    }
  }

  const getSharePointStatusProps = (row: Props["row"]) => {
    const failed = row.failedCount || 0
    const total = row.totalCount || 0
    const synced = row.syncedCount || 0

    if (failed > 0) {
      return { negative: true }
    }
    if (synced === total) {
      return { positive: true }
    }
    return { notice: true }
  }
</script>

<StatusLight
  size="S"
  {...row.kind === "sharepoint_connection"
    ? getSharePointStatusProps(row)
    : getStatusProps(row.status)}
>
  {row.displayStatus}
</StatusLight>
