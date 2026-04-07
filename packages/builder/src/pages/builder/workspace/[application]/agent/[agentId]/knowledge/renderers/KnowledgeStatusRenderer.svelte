<script lang="ts">
  import { StatusLight } from "@budibase/bbui"
  import {
    AgentSharePointSyncRunStatus,
    KnowledgeBaseFileStatus,
  } from "@budibase/types"

  export interface Props {
    row: {
      kind?: "sharepoint_connection" | "file"
      displayStatus: string
      status?: KnowledgeBaseFileStatus
      syncedCount?: number
      totalCount?: number
      failedCount?: number
      processingCount?: number
      hasSynced?: boolean
      runStatus?: AgentSharePointSyncRunStatus
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
    if (!row.hasSynced) {
      return { notice: true }
    }
    const total = row.totalCount || 0
    const processing = row.processingCount || 0
    const failed = row.failedCount || 0
    const synced = row.syncedCount || 0

    if (total === 0) {
      return { positive: true }
    }
    if (processing > 0) {
      return { notice: true }
    }
    if (failed > 0) {
      return { negative: true }
    }
    if (synced >= total) {
      return { positive: true }
    }

    switch (row.runStatus) {
      case AgentSharePointSyncRunStatus.SUCCESS:
        return { positive: true }
      case AgentSharePointSyncRunStatus.FAILED:
        return { negative: true }
      default:
        return { notice: true }
    }
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
