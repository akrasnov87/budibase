<script lang="ts">
  import { StatusLight } from "@budibase/bbui"
  import { KnowledgeBaseFileStatus } from "@budibase/types"

  interface Props {
    row: {
      kind?: "sharepoint_connection" | "file"
      displayStatus: string
      status?: KnowledgeBaseFileStatus
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
</script>

<StatusLight
  size="S"
  {...row.kind === "sharepoint_connection"
    ? { positive: true }
    : getStatusProps(row.status)}
>
  {row.displayStatus}
</StatusLight>
