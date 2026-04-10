import { KnowledgeBaseFileStatus, ToolType } from "@budibase/types"
import { tool } from "ai"
import { z } from "zod"
import sdk from "../../../sdk"
import type { BudibaseToolDefinition } from "."

const toEpochMillis = (value?: string | number) => {
  if (value == null) {
    return 0
  }

  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

const toISOString = (value?: string | number) => {
  if (value == null) {
    return undefined
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return undefined
  }

  return parsed.toISOString()
}

export const createKnowledgeFilesTool = (
  agentId: string
): BudibaseToolDefinition => ({
  name: "list_knowledge_files",
  sourceType: ToolType.INTERNAL_TABLE,
  sourceLabel: "Budibase",
  description:
    "List knowledge files attached to this agent with upload metadata",
  tool: tool({
    description:
      "List knowledge files attached to this agent with upload metadata",
    inputSchema: z.object({}),
    execute: async () => {
      const files = await sdk.ai.rag.listFilesForAgent(agentId)
      const sortedFiles = [...files].sort(
        (a, b) => toEpochMillis(b.createdAt) - toEpochMillis(a.createdAt)
      )

      const metadata = sortedFiles.map(file => ({
        fileId: file._id,
        filename: file.filename,
        status: file.status,
        sizeBytes: file.size,
        mimeType: file.mimetype,
        uploadedAt: toISOString(file.createdAt),
        processedAt: file.processedAt,
        errorMessage: file.errorMessage,
      }))

      return {
        total: metadata.length,
        readyCount: metadata.filter(
          file => file.status === KnowledgeBaseFileStatus.READY
        ).length,
        processingCount: metadata.filter(
          file => file.status === KnowledgeBaseFileStatus.PROCESSING
        ).length,
        failedCount: metadata.filter(
          file => file.status === KnowledgeBaseFileStatus.FAILED
        ).length,
        files: metadata,
      }
    },
  }),
})
