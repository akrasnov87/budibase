const mockQueueAdd = jest.fn()
const mockQueueProcess = jest.fn()
const mockGetRepeatableJobs = jest.fn()
const mockRemoveRepeatableByKey = jest.fn()
const mockRemoveJobs = jest.fn()
const mockDoInWorkspaceContext = jest.fn()
const mockSyncSharePointForAgent = jest.fn()
const mockGetAllWorkspaces = jest.fn()
const mockWorkspaceAllDocs = jest.fn()

jest.mock("@budibase/backend-core", () => {
  const actual = jest.requireActual("@budibase/backend-core")

  class MockBudibaseQueue {
    add = (...args: any[]) => mockQueueAdd(...args)
    process = (...args: any[]) => mockQueueProcess(...args)
    getBullQueue = () => ({
      getRepeatableJobs: (...args: any[]) => mockGetRepeatableJobs(...args),
      removeRepeatableByKey: (...args: any[]) =>
        mockRemoveRepeatableByKey(...args),
      removeJobs: (...args: any[]) => mockRemoveJobs(...args),
    })
  }

  return {
    ...actual,
    context: {
      ...actual.context,
      getWorkspaceId: () => "app_dev_test",
      doInWorkspaceContext: (...args: any[]) =>
        mockDoInWorkspaceContext(...args),
      getWorkspaceDB: () => ({
        allDocs: (...args: any[]) => mockWorkspaceAllDocs(...args),
      }),
    },
    db: {
      ...actual.db,
      getAllWorkspaces: (...args: any[]) => mockGetAllWorkspaces(...args),
    },
    queue: {
      ...actual.queue,
      BudibaseQueue: MockBudibaseQueue,
    },
    utils: {
      ...actual.utils,
      Duration: {
        fromSeconds: (s: number) => ({ toMs: () => s * 1000 }),
        fromMinutes: (m: number) => ({ toMs: () => m * 60 * 1000 }),
      },
    },
  }
})

jest.mock("../../../../environment", () => ({
  __esModule: true,
  default: {
    isInThread: jest.fn(() => false),
    SELF_HOSTED: true,
    MULTI_TENANCY: false,
    SHAREPOINT_SYNC_INTERVAL_MS: 86_400_000,
  },
}))

jest.mock("./sharepoint", () => ({
  syncSharePointForAgent: (...args: any[]) =>
    mockSyncSharePointForAgent(...args),
}))

import { AgentKnowledgeSourceType, type Agent } from "@budibase/types"
import {
  reconcileAgentJobs,
  rehydrateScheduledJobs,
  removeAllAgentJobs,
  scheduleJob,
} from "./sharepointSyncQueue"

describe("sharepointSyncQueue", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDoInWorkspaceContext.mockImplementation(
      async (_workspaceId: string, fn: () => Promise<any>) => await fn()
    )
    mockGetRepeatableJobs.mockResolvedValue([])
    mockQueueAdd.mockResolvedValue({ id: "job_1" })
    mockRemoveRepeatableByKey.mockResolvedValue(undefined)
    mockRemoveJobs.mockResolvedValue(undefined)
    mockGetAllWorkspaces.mockResolvedValue(["app_dev_test"])
    mockWorkspaceAllDocs.mockResolvedValue({ rows: [] })
  })

  it("schedules repeatable jobs with deterministic ids", async () => {
    await scheduleJob({
      workspaceId: "app_dev_test",
      agentId: "agent_1",
      siteId: "site_1",
    })

    expect(mockQueueAdd).toHaveBeenCalledWith(
      {
        workspaceId: "app_dev_test",
        agentId: "agent_1",
        siteId: "site_1",
      },
      {
        repeat: { every: 86_400_000 },
        jobId: "app_dev_test_sharepoint_sync_agent_1_site_1",
      }
    )
  })

  it("reconciles repeatable jobs for an agent", async () => {
    mockGetRepeatableJobs.mockResolvedValue([
      {
        id: "app_dev_test_sharepoint_sync_agent_1_site_old",
        key: "repeat:old",
      },
      {
        id: "app_dev_test_sharepoint_sync_agent_1_site_1",
        key: "repeat:site-1",
      },
    ])

    const agent: Agent = {
      _id: "agent_1",
      name: "Agent",
      aiconfig: "default",
      knowledgeSources: [
        {
          id: "sharepoint_site_site_1",
          type: AgentKnowledgeSourceType.SHAREPOINT,
          config: {
            connectionId: "connection_1",
            site: { id: "site_1" },
          },
        },
        {
          id: "sharepoint_site_site_2",
          type: AgentKnowledgeSourceType.SHAREPOINT,
          config: {
            connectionId: "connection_1",
            site: { id: "site_2" },
          },
        },
      ],
    }

    await reconcileAgentJobs(agent)

    expect(mockRemoveRepeatableByKey).toHaveBeenCalledWith("repeat:old")
    expect(mockRemoveJobs).toHaveBeenCalledWith(
      "app_dev_test_sharepoint_sync_agent_1_site_old"
    )
    expect(mockQueueAdd).toHaveBeenCalledWith(
      {
        workspaceId: "app_dev_test",
        agentId: "agent_1",
        siteId: "site_2",
      },
      expect.objectContaining({
        jobId: "app_dev_test_sharepoint_sync_agent_1_site_2",
      })
    )
  })

  it("removes all repeatable jobs for an agent", async () => {
    mockGetRepeatableJobs.mockResolvedValue([
      {
        id: "app_dev_test_sharepoint_sync_agent_1_site_1",
        key: "repeat:site-1",
      },
      {
        id: "app_dev_test_sharepoint_sync_agent_1_site_2",
        key: "repeat:site-2",
      },
      {
        id: "app_dev_test_sharepoint_sync_agent_2_site_9",
        key: "repeat:other-agent",
      },
    ])

    await removeAllAgentJobs("agent_1")

    expect(mockRemoveRepeatableByKey).toHaveBeenCalledTimes(2)
    expect(mockRemoveJobs).toHaveBeenCalledTimes(2)
    expect(mockRemoveRepeatableByKey).toHaveBeenCalledWith("repeat:site-1")
    expect(mockRemoveRepeatableByKey).toHaveBeenCalledWith("repeat:site-2")
    expect(mockRemoveJobs).toHaveBeenCalledWith(
      "app_dev_test_sharepoint_sync_agent_1_site_1"
    )
    expect(mockRemoveJobs).toHaveBeenCalledWith(
      "app_dev_test_sharepoint_sync_agent_1_site_2"
    )
  })

  it("processes queued jobs by syncing one site in workspace context", async () => {
    jest.resetModules()
    const queueModule = await import("./sharepointSyncQueue")
    queueModule.init()

    const processHandler = mockQueueProcess.mock.calls[0][1]
    await processHandler({
      data: {
        workspaceId: "app_dev_test",
        agentId: "agent_1",
        siteId: "site_1",
      },
    })

    expect(mockDoInWorkspaceContext).toHaveBeenCalledWith(
      "app_dev_test",
      expect.any(Function)
    )
    expect(mockSyncSharePointForAgent).toHaveBeenCalledWith("agent_1", [
      "site_1",
    ])
  })

  it("removes orphan jobs during rehydration", async () => {
    mockGetRepeatableJobs.mockResolvedValue([
      {
        id: "app_dev_test_sharepoint_sync_agent_deleted_site_1",
        key: "repeat:orphan",
      },
      {
        id: "app_dev_test_sharepoint_sync_agent_1_site_1",
        key: "repeat:valid",
      },
    ])
    mockWorkspaceAllDocs.mockResolvedValue({
      rows: [
        {
          doc: {
            _id: "agent_1",
            name: "Agent",
            aiconfig: "default",
            knowledgeSources: [
              {
                id: "sharepoint_site_site_1",
                type: AgentKnowledgeSourceType.SHAREPOINT,
                config: {
                  connectionId: "connection_1",
                  site: { id: "site_1" },
                },
              },
            ],
          } satisfies Agent,
        },
      ],
    })

    await rehydrateScheduledJobs()

    expect(mockRemoveRepeatableByKey).toHaveBeenCalledWith("repeat:orphan")
    expect(mockRemoveJobs).toHaveBeenCalledWith(
      "app_dev_test_sharepoint_sync_agent_deleted_site_1"
    )
    expect(mockRemoveRepeatableByKey).not.toHaveBeenCalledWith("repeat:valid")
  })
})
