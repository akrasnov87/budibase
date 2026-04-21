import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { get } from "svelte/store"
import {
  KnowledgeBaseFileStatus,
  type Agent,
  type AgentFileUploadResponse,
  type KnowledgeBaseFile,
} from "@budibase/types"
import { API } from "@/api"
import { AgentsStore } from "./agents"

vi.mock("@/api", () => {
  return {
    API: {
      fetchAgents: vi.fn(),
      fetchAgentKnowledge: vi.fn(),
      uploadAgentFile: vi.fn(),
      deleteAgentFile: vi.fn(),
      syncAgentKnowledgeSources: vi.fn(),
      fetchAgentKnowledgeSourceOptions: vi.fn(),
    },
  }
})

const fetchAgents = vi.mocked(API.fetchAgents)
const fetchAgentKnowledge = vi.mocked(API.fetchAgentKnowledge)
const uploadAgentFile = vi.mocked(API.uploadAgentFile)
const deleteAgentFile = vi.mocked(API.deleteAgentFile)
const syncAgentKnowledgeSources = vi.mocked(API.syncAgentKnowledgeSources)
const fetchAgentKnowledgeSourceOptions = vi.mocked(
  API.fetchAgentKnowledgeSourceOptions
)

describe("agentsStore sharepoint and file syncing", () => {
  let store: AgentsStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = new AgentsStore()
    store.set({
      agents: [],
      tools: [],
      agentsLoaded: false,
      filesByAgentId: {},
      sharePointSourceSnapshotsByAgentId: {},
      knowledgeSourceOptionsByAgentId: {},
      currentAgentId: undefined,
    })
  })

  afterEach(() => {
    store.stopAgentFilePolling()
    vi.useRealTimers()
  })

  it("syncAgentKnowledgeSources forwards sourceIds payload", async () => {
    syncAgentKnowledgeSources.mockResolvedValue({
      agentId: "agent_1",
      synced: 2,
      failed: 0,
      alreadySynced: 1,
      unsupported: 0,
      totalDiscovered: 3,
    })

    const result = await store.syncAgentKnowledgeSources("agent_1", {
      sourceId: "site-1",
    })

    expect(syncAgentKnowledgeSources).toHaveBeenCalledWith("agent_1", {
      sourceId: "site-1",
    })
    expect(result.synced).toBe(2)
    expect(result.totalDiscovered).toBe(3)
  })

  it("fetchAgentKnowledge stores files by agent id", async () => {
    const files: KnowledgeBaseFile[] = [
      {
        _id: "kb_file_1",
        knowledgeBaseId: "kb_1",
        ragSourceId: "rag_source_1",
        filename: "notes.md",
        objectStoreKey: "object/key",
        status: KnowledgeBaseFileStatus.READY,
        uploadedBy: "user_1",
      },
    ]
    fetchAgentKnowledge.mockResolvedValue({
      files,
      hasSharePointConnection: false,
      sharePointSources: [],
    })

    const response = await store.fetchAgentKnowledge("agent_1")

    expect(fetchAgentKnowledge).toHaveBeenCalledWith("agent_1")
    expect(response.files).toHaveLength(1)
    expect(get(store.store).filesByAgentId["agent_1"]).toEqual(files)
  })

  it("fetchAgentKnowledgeSourceOptions forwards request", async () => {
    fetchAgentKnowledgeSourceOptions.mockResolvedValue({
      options: [{ id: "site-1", name: "Team Site", webUrl: "https://example" }],
      runs: [],
    })

    const result = await store.fetchAgentKnowledgeSourceOptions("agent_1")

    expect(fetchAgentKnowledgeSourceOptions).toHaveBeenCalledWith("agent_1")
    expect(result.options).toHaveLength(1)
    expect(get(store.store).knowledgeSourceOptionsByAgentId["agent_1"]).toEqual(
      result.options
    )
  })

  it("startAgentFilePolling fetches while files are processing", async () => {
    vi.useFakeTimers()
    store.set({
      agents: [],
      tools: [],
      agentsLoaded: false,
      filesByAgentId: {
        agent_1: [
          {
            _id: "kb_file_1",
            knowledgeBaseId: "kb_1",
            ragSourceId: "rag_source_1",
            filename: "notes.md",
            objectStoreKey: "object/key",
            status: KnowledgeBaseFileStatus.PROCESSING,
            uploadedBy: "user_1",
          },
        ],
      },
      sharePointSourceSnapshotsByAgentId: {},
      knowledgeSourceOptionsByAgentId: {},
      currentAgentId: undefined,
    })

    fetchAgentKnowledge.mockResolvedValue({
      files: [
        {
          _id: "kb_file_1",
          knowledgeBaseId: "kb_1",
          ragSourceId: "rag_source_1",
          filename: "notes.md",
          objectStoreKey: "object/key",
          status: KnowledgeBaseFileStatus.READY,
          uploadedBy: "user_1",
        },
      ],
      hasSharePointConnection: true,
      sharePointSources: [],
    })

    store.startAgentFilePolling("agent_1", 25)
    await vi.advanceTimersByTimeAsync(60)

    expect(fetchAgentKnowledge).toHaveBeenCalledTimes(1)
    expect(get(store.store).filesByAgentId["agent_1"][0].status).toBe(
      KnowledgeBaseFileStatus.READY
    )
  })

  it("startAgentFilePolling does not fetch when there are no processing files", async () => {
    vi.useFakeTimers()
    store.set({
      agents: [],
      tools: [],
      agentsLoaded: false,
      filesByAgentId: {
        agent_1: [
          {
            _id: "kb_file_1",
            knowledgeBaseId: "kb_1",
            ragSourceId: "rag_source_1",
            filename: "notes.md",
            objectStoreKey: "object/key",
            status: KnowledgeBaseFileStatus.READY,
            uploadedBy: "user_1",
          },
        ],
      },
      sharePointSourceSnapshotsByAgentId: {},
      knowledgeSourceOptionsByAgentId: {},
      currentAgentId: undefined,
    })

    store.startAgentFilePolling("agent_1", 25)
    await vi.advanceTimersByTimeAsync(80)

    expect(fetchAgentKnowledge).not.toHaveBeenCalled()
  })
})

describe("AgentsStore file operations", () => {
  let store: AgentsStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = new AgentsStore()
  })

  it("refreshes agents after uploading a file", async () => {
    const agents: Agent[] = [
      {
        _id: "agent_1",
        _rev: "2-rev",
        name: "Support bot",
      } as Agent,
    ]
    const uploadResponse: AgentFileUploadResponse = {
      file: {
        _id: "kb_file_1",
      } as AgentFileUploadResponse["file"],
    }
    uploadAgentFile.mockResolvedValue(uploadResponse)
    fetchAgents.mockResolvedValue({ agents })

    await store.uploadAgentFile("agent_1", {} as File)

    expect(uploadAgentFile).toHaveBeenCalledWith("agent_1", expect.anything())
    expect(fetchAgents).toHaveBeenCalledTimes(1)
    expect(get(store.store).agents).toEqual(agents)
  })

  it("does not refresh agents after deleting a file", async () => {
    const agents: Agent[] = [
      {
        _id: "agent_1",
        _rev: "3-rev",
        name: "Support bot",
      } as Agent,
    ]

    fetchAgents.mockResolvedValue({ agents })

    await store.deleteAgentFile("agent_1", "file_1")

    expect(deleteAgentFile).toHaveBeenCalledWith("agent_1", "file_1")
    expect(fetchAgents).not.toHaveBeenCalled()
  })
})
