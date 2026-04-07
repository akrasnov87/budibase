<script lang="ts">
  import { StatusLight } from "@budibase/bbui"
  import {
    AgentSharePointSyncRunStatus,
    KnowledgeBaseFileStatus,
  } from "@budibase/types"
  import type { KnowledgeTableRow, SharePointConnectionTableRow } from "./types"
  import { utils } from "@budibase/shared-core"

  export interface Props {
    row: KnowledgeTableRow
  }

  let { row }: Props = $props()

  const getStatusProps = (row: KnowledgeTableRow) => {
    const { kind } = row
    switch (kind) {
      case "sharepoint_connection":
        return getSharePointStatusProps(row)
      case "file":
        return getFileStatusProps(row.status)
      default:
        throw utils.unreachable(kind)
    }
  }

  const getFileStatusProps = (status?: KnowledgeBaseFileStatus) => {
    switch (status) {
      case KnowledgeBaseFileStatus.READY:
        return { positive: true }
      case KnowledgeBaseFileStatus.FAILED:
        return { negative: true }
      default:
        return { notice: true }
    }
  }

  const getSharePointStatusProps = (row: SharePointConnectionTableRow) => {
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

<StatusLight size="S" {...getStatusProps(row)}>
  {row.displayStatus}
</StatusLight>
