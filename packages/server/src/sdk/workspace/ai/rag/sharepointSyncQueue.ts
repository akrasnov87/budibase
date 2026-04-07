import type { Job } from "bull"
import { context, db, docIds, queue, utils } from "@budibase/backend-core"
import {
  AgentKnowledgeSourceType,
  DocumentType,
  type Agent,
} from "@budibase/types"
import env from "../../../../environment"
import { syncSharePointForAgent } from "./sharepoint"

const DEFAULT_CONCURRENCY = 2
const DEFAULT_BACKOFF_MS = utils.Duration.fromSeconds(10).toMs()
const DEFAULT_TIMEOUT_MS = utils.Duration.fromMinutes(15).toMs()

export interface SharePointSyncJob {
  workspaceId: string
  agentId: string
  siteId: string
}

let sharePointSyncQueue: queue.BudibaseQueue<SharePointSyncJob> | undefined
let sharePointSyncQueueInitialised = false

const getJobId = (job: SharePointSyncJob) =>
  `${job.workspaceId}_sharepoint_sync_${job.agentId}_${job.siteId}`

const getAgentJobPrefix = (workspaceId: string, agentId: string) =>
  `${workspaceId}_sharepoint_sync_${agentId}_`

const getAgentSharePointSources = (agent: Agent) =>
  (agent.knowledgeSources || []).filter(
    source => source.type === AgentKnowledgeSourceType.SHAREPOINT
  )

const hasSchedulableSharePointSource = (agent: Agent) => {
  const sources = getAgentSharePointSources(agent)
  if (sources.length === 0) {
    return false
  }
  const connectionId = sources
    .map(source => source.config.connectionId?.trim())
    .find(Boolean)
  const sites = sources
    .map(source => source.config.site?.id?.trim())
    .filter((siteId): siteId is string => !!siteId)
  return !!connectionId && sites.length > 0
}

const getDesiredJobsForAgent = (workspaceId: string, agent: Agent) => {
  if (!agent._id || !hasSchedulableSharePointSource(agent)) {
    return []
  }
  const siteIds = Array.from(
    new Set(
      getAgentSharePointSources(agent)
        .map(source => source.config.site?.id?.trim())
        .filter((siteId): siteId is string => !!siteId)
    )
  )
  return siteIds.map(siteId => ({
    workspaceId,
    agentId: agent._id!,
    siteId,
  }))
}

export function getQueue() {
  if (!sharePointSyncQueue) {
    sharePointSyncQueue = new queue.BudibaseQueue<SharePointSyncJob>(
      queue.JobQueue.SHAREPOINT_SYNC,
      {
        maxStalledCount: 3,
        jobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: DEFAULT_BACKOFF_MS,
          },
          timeout: DEFAULT_TIMEOUT_MS,
          removeOnComplete: true,
          removeOnFail: 1000,
        },
        jobTags: data => ({
          workspaceId: data.workspaceId,
          agentId: data.agentId,
          siteId: data.siteId,
        }),
      }
    )
  }

  return sharePointSyncQueue
}

export function init(concurrency = DEFAULT_CONCURRENCY) {
  if (sharePointSyncQueueInitialised) {
    return Promise.resolve()
  }
  try {
    sharePointSyncQueueInitialised = true
    return getQueue().process(
      concurrency,
      async (job: Job<SharePointSyncJob>) => {
        const { workspaceId, agentId, siteId } = job.data
        await context.doInWorkspaceContext(workspaceId, async () => {
          await syncSharePointForAgent(agentId, [siteId])
        })
      }
    )
  } catch (error) {
    console.error("Error initialising SharePoint sync queue", error)
    sharePointSyncQueueInitialised = false
    return Promise.resolve()
  }
}

export async function scheduleJob(job: SharePointSyncJob) {
  init()
  const jobId = getJobId(job)
  return await getQueue().add(job, {
    repeat: {
      every: env.SHAREPOINT_SYNC_INTERVAL_MS,
    },
    jobId,
  })
}

export async function removeJob(job: SharePointSyncJob) {
  const jobId = getJobId(job)
  const bullQueue = getQueue().getBullQueue()
  const repeatableJobs = await bullQueue.getRepeatableJobs()
  const matchingJobs = repeatableJobs.filter(
    repeatable => repeatable.id === jobId
  )
  await Promise.all(
    matchingJobs.flatMap(repeatable => {
      const tasks: Promise<any>[] = [
        bullQueue.removeRepeatableByKey(repeatable.key),
      ]
      if (repeatable.id) {
        tasks.push(bullQueue.removeJobs(repeatable.id))
      }
      return tasks
    })
  )
}

export async function removeAllAgentJobs(
  agentId: string,
  workspaceId?: string
) {
  const resolvedWorkspaceId = workspaceId || context.getWorkspaceId()
  const prefix = getAgentJobPrefix(resolvedWorkspaceId, agentId)
  const bullQueue = getQueue().getBullQueue()
  const repeatableJobs = await bullQueue.getRepeatableJobs()
  const matchingJobs = repeatableJobs.filter(
    repeatable => repeatable.id && repeatable.id.startsWith(prefix)
  )
  await Promise.all(
    matchingJobs.flatMap(repeatable => {
      const tasks: Promise<any>[] = [
        bullQueue.removeRepeatableByKey(repeatable.key),
      ]
      if (repeatable.id) {
        tasks.push(bullQueue.removeJobs(repeatable.id))
      }
      return tasks
    })
  )
}

export async function reconcileAgentJobs(agent: Agent, workspaceId?: string) {
  if (!agent._id) {
    return
  }
  const resolvedWorkspaceId = workspaceId || context.getWorkspaceId()
  const desiredJobs = getDesiredJobsForAgent(resolvedWorkspaceId, agent)
  const desiredIds = new Set(desiredJobs.map(getJobId))

  const prefix = getAgentJobPrefix(resolvedWorkspaceId, agent._id)
  const bullQueue = getQueue().getBullQueue()
  const repeatableJobs = await bullQueue.getRepeatableJobs()
  const existingAgentJobs = repeatableJobs.filter(
    repeatable => repeatable.id && repeatable.id.startsWith(prefix)
  )

  await Promise.all(
    existingAgentJobs
      .filter(repeatable => !desiredIds.has(repeatable.id!))
      .flatMap(repeatable => {
        const tasks: Promise<any>[] = [
          bullQueue.removeRepeatableByKey(repeatable.key),
        ]
        if (repeatable.id) {
          tasks.push(bullQueue.removeJobs(repeatable.id))
        }
        return tasks
      })
  )

  const existingIds = new Set(existingAgentJobs.map(job => job.id))
  await Promise.all(
    desiredJobs
      .filter(job => !existingIds.has(getJobId(job)))
      .map(job => scheduleJob(job))
  )
}

export async function rehydrateScheduledJobs() {
  if (env.isInThread() || !env.SELF_HOSTED || env.MULTI_TENANCY) {
    return
  }

  const workspaceIds = await db.getAllWorkspaces({
    dev: false,
    idsOnly: true,
  })

  const bullQueue = getQueue().getBullQueue()
  const repeatableJobs = await bullQueue.getRepeatableJobs()

  for (const workspaceId of workspaceIds) {
    await context.doInWorkspaceContext(workspaceId, async () => {
      const workspaceDb = context.getWorkspaceDB()
      const result = await workspaceDb.allDocs<Agent>(
        docIds.getDocParams(DocumentType.AGENT, undefined, {
          include_docs: true,
        })
      )
      const agents = result.rows
        .map(row => row.doc)
        .filter((agent): agent is Agent => !!agent)
      const desiredJobs = agents.flatMap(agent =>
        getDesiredJobsForAgent(workspaceId, agent)
      )
      const desiredIds = new Set(desiredJobs.map(getJobId))
      const workspacePrefix = `${workspaceId}_sharepoint_sync_`
      const staleWorkspaceJobs = repeatableJobs.filter(
        repeatable =>
          repeatable.id &&
          repeatable.id.startsWith(workspacePrefix) &&
          !desiredIds.has(repeatable.id)
      )

      let removedRepeatables = 0
      let removedQueuedJobs = 0
      await Promise.all(
        staleWorkspaceJobs.flatMap(repeatable => {
          const tasks: Promise<any>[] = [
            bullQueue.removeRepeatableByKey(repeatable.key).then(() => {
              removedRepeatables++
            }),
          ]
          if (repeatable.id) {
            tasks.push(
              bullQueue.removeJobs(repeatable.id).then(() => {
                removedQueuedJobs++
              })
            )
          }
          return tasks
        })
      )

      const reconcileTargets = agents.filter(agent =>
        (agent.knowledgeSources || []).some(
          source => source.type === AgentKnowledgeSourceType.SHAREPOINT
        )
      )
      console.log("SharePoint sync rehydration summary", {
        workspaceId,
        reconciledAgents: reconcileTargets.length,
        desiredSchedules: desiredJobs.length,
        staleRepeatablesRemoved: removedRepeatables,
        staleQueuedJobsRemoved: removedQueuedJobs,
      })
      await Promise.all(
        reconcileTargets.map(agent => reconcileAgentJobs(agent, workspaceId))
      )
    })
  }
}
