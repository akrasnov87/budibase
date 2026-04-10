import {
  KnowledgeBaseFileStatus,
  type KnowledgeBaseFile,
} from "@budibase/types"
jest.mock("../../../../sdk", () => ({
  __esModule: true,
  default: {
    ai: {
      rag: {
        listFilesForAgent: jest.fn(),
      },
    },
  },
}))

import sdk from "../../../../sdk"
import { createKnowledgeFilesTool } from "../knowledgeFiles"

const executeTool = async (agentId: string) => {
  const toolDef = createKnowledgeFilesTool(agentId)
  if (!toolDef.tool.execute) {
    throw new Error("tool.execute is not a function")
  }

  return await toolDef.tool.execute(
    {},
    {
      toolCallId: "test-tool-call",
      messages: [],
    }
  )
}

describe("AI Tools - Knowledge files", () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it("returns file metadata and status summary", async () => {
    const listFilesSpy = jest
      .spyOn(sdk.ai.rag, "listFilesForAgent")
      .mockResolvedValue([
        {
          _id: "file_1",
          knowledgeBaseId: "kb_1",
          filename: "policy.md",
          mimetype: "text/markdown",
          size: 101,
          objectStoreKey: "obj_1",
          ragSourceId: "source_1",
          status: KnowledgeBaseFileStatus.READY,
          uploadedBy: "user_1",
          createdAt: "2026-01-01T00:00:00.000Z",
          processedAt: "2026-01-01T01:00:00.000Z",
        } satisfies KnowledgeBaseFile,
        {
          _id: "file_2",
          knowledgeBaseId: "kb_1",
          filename: "faq.pdf",
          mimetype: "application/pdf",
          size: 202,
          objectStoreKey: "obj_2",
          ragSourceId: "source_2",
          status: KnowledgeBaseFileStatus.FAILED,
          uploadedBy: "user_1",
          createdAt: "2026-03-01T00:00:00.000Z",
          errorMessage: "Failed to ingest",
        } satisfies KnowledgeBaseFile,
        {
          _id: "file_3",
          knowledgeBaseId: "kb_2",
          filename: "runbook.txt",
          mimetype: "text/plain",
          size: 303,
          objectStoreKey: "obj_3",
          ragSourceId: "source_3",
          status: KnowledgeBaseFileStatus.PROCESSING,
          uploadedBy: "user_2",
          createdAt: "2026-02-01T00:00:00.000Z",
        } satisfies KnowledgeBaseFile,
      ])

    const result = (await executeTool("agent_123")) as {
      total: number
      readyCount: number
      processingCount: number
      failedCount: number
      files: Array<{
        fileId?: string
        filename: string
        status: KnowledgeBaseFileStatus
        sizeBytes?: number
        mimeType?: string
        uploadedAt?: string
        processedAt?: string
        errorMessage?: string
      }>
    }

    expect(listFilesSpy).toHaveBeenCalledWith("agent_123")
    expect(result.total).toBe(3)
    expect(result.readyCount).toBe(1)
    expect(result.processingCount).toBe(1)
    expect(result.failedCount).toBe(1)
    expect(result.files.map(file => file.fileId)).toEqual([
      "file_2",
      "file_3",
      "file_1",
    ])
    expect(result.files[0]).toMatchObject({
      fileId: "file_2",
      filename: "faq.pdf",
      status: KnowledgeBaseFileStatus.FAILED,
      sizeBytes: 202,
      mimeType: "application/pdf",
      uploadedAt: "2026-03-01T00:00:00.000Z",
      errorMessage: "Failed to ingest",
    })
  })

  it("returns an empty response when agent has no files", async () => {
    jest.spyOn(sdk.ai.rag, "listFilesForAgent").mockResolvedValue([])

    const result = (await executeTool("agent_456")) as {
      total: number
      readyCount: number
      processingCount: number
      failedCount: number
      files: unknown[]
    }

    expect(result).toEqual({
      total: 0,
      readyCount: 0,
      processingCount: 0,
      failedCount: 0,
      files: [],
    })
  })
})
