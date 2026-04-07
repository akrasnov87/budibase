import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { get } from "svelte/store"
import {
  KnowledgeBaseFileStatus,
  type KnowledgeBaseFile,
} from "@budibase/types"

vi.mock("@/api", () => {
  const fetchAgentFiles = vi.fn()
  const syncAgentSharePoint = vi.fn()
  const completeAgentSharePointConnection = vi.fn()
  const fetchAgentSharePointSites = vi.fn()

  return {
    API: {
      fetchAgentFiles,
      syncAgentSharePoint,
      completeAgentSharePointConnection,
      fetchAgentSharePointSites,
    },
  }
})

import { API } from "@/api"
import { AgentsStore } from "./agents"

const fetchAgentFiles = vi.mocked(API.fetchAgentFiles)
const syncAgentSharePoint = vi.mocked(API.syncAgentSharePoint)
const completeAgentSharePointConnection = vi.mocked(
  API.completeAgentSharePointConnection
)
const fetchAgentSharePointSites = vi.mocked(API.fetchAgentSharePointSites)

describe("agentsStore sharepoint and file syncing", () => {
  let store: AgentsStore

  beforeEach(() => {
    store = new AgentsStore()
    fetchAgentFiles.mockReset()
    syncAgentSharePoint.mockReset()
    completeAgentSharePointConnection.mockReset()
    fetchAgentSharePointSites.mockReset()
    store.set({
      agents: [],
      tools: [],
      agentsLoaded: false,
      filesByAgentId: {},
      currentAgentId: undefined,
    })
  })

  afterEach(() => {
    store.stopAgentFilePolling()
    vi.useRealTimers()
  })

  it("syncAgentSharePoint forwards siteIds payload", async () => {
    syncAgentSharePoint.mockResolvedValue({
      agentId: "agent_1",
      synced: 2,
      failed: 0,
      skipped: 1,
      totalDiscovered: 3,
    })

    const result = await store.syncAgentSharePoint("agent_1", {
      siteIds: ["site-1", "site-2"],
    })

    expect(syncAgentSharePoint).toHaveBeenCalledWith("agent_1", {
      siteIds: ["site-1", "site-2"],
    })
    expect(result.synced).toBe(2)
    expect(result.totalDiscovered).toBe(3)
  })

  it("fetchAgentFiles stores files by agent id", async () => {
    const files: KnowledgeBaseFile[] = [
      {
        _id: "kb_file_1",
        knowledgeBaseId: "kb_1",
        filename: "notes.md",
        objectStoreKey: "object/key",
        status: KnowledgeBaseFileStatus.READY,
        uploadedBy: "user_1",
      },
    ]
    fetchAgentFiles.mockResolvedValue({ files })

    const response = await store.fetchAgentFiles("agent_1")

    expect(fetchAgentFiles).toHaveBeenCalledWith("agent_1")
    expect(response.files).toHaveLength(1)
    expect(get(store.store).filesByAgentId["agent_1"]).toEqual(files)
  })

  it("completeAgentSharePointConnection forwards payload", async () => {
    completeAgentSharePointConnection.mockResolvedValue({
      agentId: "agent_1",
      connected: true,
    })

    const result = await store.completeAgentSharePointConnection("agent_1", {
      appId: "app_1",
      continueSetupId: "setup_1",
    })

    expect(completeAgentSharePointConnection).toHaveBeenCalledWith("agent_1", {
      appId: "app_1",
      continueSetupId: "setup_1",
    })
    expect(result.connected).toBe(true)
  })

  it("fetchAgentSharePointSites forwards request", async () => {
    fetchAgentSharePointSites.mockResolvedValue({
      sites: [{ id: "site-1", name: "Team Site", webUrl: "https://example" }],
      runs: [],
    })

    const result = await store.fetchAgentSharePointSites("agent_1")

    expect(fetchAgentSharePointSites).toHaveBeenCalledWith("agent_1")
    expect(result.sites).toHaveLength(1)
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
            filename: "notes.md",
            objectStoreKey: "object/key",
            status: KnowledgeBaseFileStatus.PROCESSING,
            uploadedBy: "user_1",
          },
        ],
      },
      currentAgentId: undefined,
    })

    fetchAgentFiles.mockResolvedValue({
      files: [
        {
          _id: "kb_file_1",
          knowledgeBaseId: "kb_1",
          filename: "notes.md",
          objectStoreKey: "object/key",
          status: KnowledgeBaseFileStatus.READY,
          uploadedBy: "user_1",
        },
      ],
    })

    store.startAgentFilePolling("agent_1", 25)
    await vi.advanceTimersByTimeAsync(60)

    expect(fetchAgentFiles).toHaveBeenCalledTimes(1)
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
            filename: "notes.md",
            objectStoreKey: "object/key",
            status: KnowledgeBaseFileStatus.READY,
            uploadedBy: "user_1",
          },
        ],
      },
      currentAgentId: undefined,
    })

    store.startAgentFilePolling("agent_1", 25)
    await vi.advanceTimersByTimeAsync(80)

    expect(fetchAgentFiles).not.toHaveBeenCalled()
  })
})
