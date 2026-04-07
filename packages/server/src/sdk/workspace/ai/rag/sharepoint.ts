import { context, docIds, HTTPError } from "@budibase/backend-core"
import {
  type Agent,
  type AgentSharePointSyncState,
  AgentSharePointSyncRunStatus,
  AgentKnowledgeSourceType,
  type AgentKnowledgeSource,
  type CompleteAgentKnowledgeSourceConnectionRequest,
  type CompleteAgentKnowledgeSourceConnectionResponse,
  DocumentType,
  type FetchAgentKnowledgeSourceOptionsResponse,
  type KnowledgeSourceOption,
  type SyncAgentKnowledgeSourcesResponse,
} from "@budibase/types"
import { agents as agentsSdk, knowledgeBase as knowledgeBaseSdk } from ".."
import {
  fetchSharePointSitesByConnection,
  getSharePointBearerToken,
  sharePointConnectionCacheKey,
  storeSharePointConnectionFromSetup,
} from "../sharepoint"
import { ensureKnowledgeBaseForAgent } from "./files"

interface SharePointDrive {
  id?: string
}

interface SharePointDriveListResponse {
  value?: SharePointDrive[]
}

interface SharePointDriveItem {
  id?: string
  name?: string
  file?: {
    mimeType?: string
  }
  folder?: Record<string, unknown>
}

interface SharePointDriveItemsResponse {
  value?: SharePointDriveItem[]
  "@odata.nextLink"?: string
}

const SHAREPOINT_API_BASE = "https://graph.microsoft.com/v1.0"
const SHAREPOINT_CONNECTION_SOURCE_ID = "sharepoint_connection"
const SHAREPOINT_SOURCE_TYPE = "sharepoint"
type SharePointSourceSite = {
  id: string
  name?: string
  webUrl?: string
}

const trimString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""
const connectionCacheKey = (connectionId: string) =>
  sharePointConnectionCacheKey("connection", connectionId)

const normalizeSites = (
  sites: Array<SharePointSourceSite | KnowledgeSourceOption>
): SharePointSourceSite[] => {
  const map = new Map<string, SharePointSourceSite>()
  for (const site of sites) {
    const id = trimString(site.id)
    if (!id) {
      continue
    }
    map.set(id, {
      id,
      name: trimString(site.name) || undefined,
      webUrl: trimString(site.webUrl) || undefined,
    })
  }
  return Array.from(map.values())
}

const getSharePointSources = (agent: Agent): AgentKnowledgeSource[] => {
  return (agent.knowledgeSources || []).filter(
    source => source.type === AgentKnowledgeSourceType.SHAREPOINT
  )
}

const getSharePointConnectionId = (agent: Agent): string | undefined => {
  return getSharePointSources(agent)
    .map(source => trimString(source.config.connectionId))
    .find(Boolean)
}

const getSharePointSitesFromSources = (
  agent: Agent
): SharePointSourceSite[] => {
  return normalizeSites(
    getSharePointSources(agent)
      .map(source => source.config.site)
      .filter((site): site is SharePointSourceSite => !!site?.id)
  )
}

const getSharePointSyncRunStatus = (
  synced: number,
  failed: number
): AgentSharePointSyncRunStatus => {
  if (failed === 0) {
    return AgentSharePointSyncRunStatus.SUCCESS
  }
  if (synced === 0) {
    return AgentSharePointSyncRunStatus.FAILED
  }
  return AgentSharePointSyncRunStatus.PARTIAL
}

const saveSharePointSyncRunState = async ({
  agentId,
  siteId,
  lastRunAt,
  synced,
  failed,
  skipped,
  totalDiscovered,
}: {
  agentId: string
  siteId: string
  lastRunAt: string
  synced: number
  failed: number
  skipped: number
  totalDiscovered: number
}) => {
  const db = context.getWorkspaceDB()
  const stateId = docIds.generateAgentKnowledgeSourceSyncStateID(
    agentId,
    SHAREPOINT_SOURCE_TYPE,
    siteId
  )
  const existing = await db.tryGet<AgentSharePointSyncState>(stateId)
  const now = new Date().toISOString()
  await db.put({
    ...existing,
    _id: stateId,
    agentId,
    siteId,
    lastRunAt,
    synced,
    failed,
    skipped,
    totalDiscovered,
    status: getSharePointSyncRunStatus(synced, failed),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  })
}

const upsertSharePointConnection = async (
  agent: Agent,
  connectionId: string
) => {
  const nonSharePointSources = (agent.knowledgeSources || []).filter(
    source => source.type !== AgentKnowledgeSourceType.SHAREPOINT
  )
  const existingSharePointSources = getSharePointSources(agent)
  const nextSharePointSources =
    existingSharePointSources.length > 0
      ? existingSharePointSources.map(source => ({
          ...source,
          config: {
            ...source.config,
            connectionId,
          },
        }))
      : [
          {
            id: SHAREPOINT_CONNECTION_SOURCE_ID,
            type: AgentKnowledgeSourceType.SHAREPOINT,
            config: { connectionId },
          } satisfies AgentKnowledgeSource,
        ]

  await agentsSdk.update({
    ...agent,
    knowledgeSources: [...nonSharePointSources, ...nextSharePointSources],
  })
}

const listDrives = async (
  bearerToken: string,
  siteId: string
): Promise<string[]> => {
  const response = await fetch(
    `${SHAREPOINT_API_BASE}/sites/${siteId}/drives?$top=200&$select=id`,
    {
      headers: {
        Authorization: bearerToken,
      },
    }
  )
  if (!response.ok) {
    const body = await response.text()
    throw new HTTPError(
      `Failed to list SharePoint drives (${response.status}): ${body}`,
      400
    )
  }
  const payload = (await response.json()) as SharePointDriveListResponse
  return (payload.value || [])
    .map(drive => trimString(drive.id))
    .filter(Boolean)
}

const listDriveItems = async (
  bearerToken: string,
  driveId: string,
  itemId?: string
): Promise<SharePointDriveItem[]> => {
  const initialPath = itemId
    ? `${SHAREPOINT_API_BASE}/drives/${driveId}/items/${itemId}/children?$top=200&$select=id,name,file,folder`
    : `${SHAREPOINT_API_BASE}/drives/${driveId}/root/children?$top=200&$select=id,name,file,folder`

  const items: SharePointDriveItem[] = []
  let nextLink = initialPath

  while (nextLink) {
    const response = await fetch(nextLink, {
      headers: {
        Authorization: bearerToken,
      },
    })
    if (!response.ok) {
      const body = await response.text()
      throw new HTTPError(
        `Failed to list SharePoint drive items (${response.status}): ${body}`,
        400
      )
    }

    const payload = (await response.json()) as SharePointDriveItemsResponse
    items.push(...(Array.isArray(payload.value) ? payload.value : []))
    const nextPageLink = trimString(payload?.["@odata.nextLink"])
    if (!nextPageLink) {
      nextLink = ""
      continue
    }

    if (!nextLink.startsWith(SHAREPOINT_API_BASE)) {
      throw new HTTPError("Invalid SharePoint pagination URL", 400)
    }
    nextLink = nextPageLink
  }

  return items
}

interface SharePointFileRef {
  driveId: string
  itemId: string
  filename: string
  mimetype?: string
}

const collectFilesRecursive = async (
  bearerToken: string,
  driveId: string,
  folderId?: string
): Promise<SharePointFileRef[]> => {
  const items = await listDriveItems(bearerToken, driveId, folderId)
  const files: SharePointFileRef[] = []

  for (const item of items) {
    const itemId = trimString(item.id)
    const name = trimString(item.name)
    if (!itemId || !name) {
      continue
    }

    if (item.folder) {
      files.push(...(await collectFilesRecursive(bearerToken, driveId, itemId)))
      continue
    }

    if (!item.file) {
      continue
    }

    files.push({
      driveId,
      itemId,
      filename: name,
      mimetype: trimString(item.file.mimeType) || undefined,
    })
  }

  return files
}

const downloadFileBuffer = async (
  bearerToken: string,
  driveId: string,
  itemId: string
) => {
  const response = await fetch(
    `${SHAREPOINT_API_BASE}/drives/${driveId}/items/${itemId}/content`,
    {
      headers: {
        Authorization: bearerToken,
      },
    }
  )
  if (!response.ok) {
    const body = await response.text()
    throw new HTTPError(
      `Failed to download SharePoint file (${response.status}): ${body}`,
      400
    )
  }
  return Buffer.from(await response.arrayBuffer())
}

export const completeSharePointConnectionForAgent = async ({
  agentId,
  appId,
  continueSetupId,
}: CompleteAgentKnowledgeSourceConnectionRequest & {
  agentId: string
}): Promise<CompleteAgentKnowledgeSourceConnectionResponse> => {
  const trimmedAgentId = trimString(agentId)
  const trimmedAppId = trimString(appId)
  const trimmedSetupId = trimString(continueSetupId)

  if (!trimmedAgentId || !trimmedAppId || !trimmedSetupId) {
    throw new HTTPError("agentId, appId and continueSetupId are required", 400)
  }

  const agent = await agentsSdk.getOrThrow(trimmedAgentId)
  const connectionId = trimmedAgentId
  await storeSharePointConnectionFromSetup({
    appId: trimmedAppId,
    setupId: trimmedSetupId,
    connectionKey: connectionCacheKey(connectionId),
  })
  await upsertSharePointConnection(agent, connectionId)

  return {
    agentId: trimmedAgentId,
    connected: true,
  }
}

export const fetchSharePointSitesForAgent = async (
  agentId: string
): Promise<FetchAgentKnowledgeSourceOptionsResponse> => {
  const trimmedAgentId = trimString(agentId)
  if (!trimmedAgentId) {
    throw new HTTPError("agentId is required", 400)
  }
  const agent = await agentsSdk.getOrThrow(trimmedAgentId)
  const { runs } = await fetchSharePointSyncStateForAgent(trimmedAgentId)
  const connectionId = trimString(getSharePointConnectionId(agent))
  if (!connectionId) {
    return { options: [], runs }
  }

  return {
    options: await fetchSharePointSitesByConnection(
      connectionCacheKey(connectionId)
    ),
    runs,
  }
}

export const fetchSharePointSyncStateForAgent = async (
  agentId: string
): Promise<{ runs: FetchAgentKnowledgeSourceOptionsResponse["runs"] }> => {
  const trimmedAgentId = trimString(agentId)
  if (!trimmedAgentId) {
    throw new HTTPError("agentId is required", 400)
  }
  const db = context.getWorkspaceDB()
  const result = await db.allDocs<AgentSharePointSyncState>(
    docIds.getDocParams(
      DocumentType.AGENT_KNOWLEDGE_SOURCE_SYNC_STATE,
      `${trimmedAgentId}_${SHAREPOINT_SOURCE_TYPE}_`,
      { include_docs: true }
    )
  )

  const runs = result.rows
    .map(row => row.doc)
    .filter((doc): doc is AgentSharePointSyncState => !!doc?.siteId)
    .map(doc => ({
      sourceId: doc.siteId,
      lastRunAt: doc.lastRunAt,
      synced: doc.synced,
      failed: doc.failed,
      skipped: doc.skipped,
      totalDiscovered: doc.totalDiscovered,
      status: doc.status,
    }))

  return { runs }
}

export const deleteSharePointSyncStateForAgent = async (
  agentId: string,
  siteIds?: string[]
) => {
  const trimmedAgentId = trimString(agentId)
  if (!trimmedAgentId) {
    return
  }

  const db = context.getWorkspaceDB()
  const result = await db.allDocs<AgentSharePointSyncState>(
    docIds.getDocParams(
      DocumentType.AGENT_KNOWLEDGE_SOURCE_SYNC_STATE,
      `${trimmedAgentId}_${SHAREPOINT_SOURCE_TYPE}_`,
      { include_docs: true }
    )
  )
  const siteIdSet = siteIds ? new Set(siteIds.map(id => trimString(id))) : null
  const docsToDelete = result.rows
    .map(row => row.doc)
    .filter((doc): doc is AgentSharePointSyncState => !!doc?._id && !!doc._rev)
    .filter(doc => !siteIdSet || siteIdSet.has(doc.siteId))
    .map(doc => ({
      ...doc,
      _deleted: true,
    }))

  if (docsToDelete.length > 0) {
    await db.bulkDocs(docsToDelete)
  }
}

export const syncSharePointForAgent = async (
  agentId: string,
  siteIdsInput?: string[]
): Promise<SyncAgentKnowledgeSourcesResponse> => {
  const lastRunAt = new Date().toISOString()
  const trimmedAgentId = trimString(agentId)
  if (!trimmedAgentId) {
    throw new HTTPError("agentId is required", 400)
  }
  const agent = await agentsSdk.getOrThrow(trimmedAgentId)
  const connectionId = trimString(getSharePointConnectionId(agent))
  if (!connectionId) {
    throw new HTTPError("SharePoint is not connected for this agent", 400)
  }

  const existingSites = getSharePointSitesFromSources(agent)
  const sites = siteIdsInput
    ? normalizeSites(siteIdsInput.map(id => ({ id })))
    : normalizeSites(existingSites)
  const siteIds = sites.map(site => site.id)

  if (siteIds.length === 0) {
    return {
      agentId: trimmedAgentId,
      synced: 0,
      failed: 0,
      skipped: 0,
      totalDiscovered: 0,
    }
  }

  const bearerToken = await getSharePointBearerToken(
    connectionCacheKey(connectionId)
  )
  const knowledgeBase = await ensureKnowledgeBaseForAgent(trimmedAgentId)
  const knowledgeBaseId = knowledgeBase._id
  if (!knowledgeBaseId) {
    throw new HTTPError("Failed to create agent file storage", 500)
  }

  const existingFiles =
    await knowledgeBaseSdk.listKnowledgeBaseFiles(knowledgeBaseId)
  const existingExternalIds = new Set(
    existingFiles.map(file => trimString(file.externalSourceId)).filter(Boolean)
  )

  let synced = 0
  let failed = 0
  let skipped = 0
  let totalDiscovered = 0

  for (const siteId of siteIds) {
    let siteSynced = 0
    let siteFailed = 0
    let siteSkipped = 0
    let siteTotalDiscovered = 0
    try {
      const driveIds = await listDrives(bearerToken, siteId)
      for (const driveId of driveIds) {
        const files = await collectFilesRecursive(bearerToken, driveId)
        siteTotalDiscovered += files.length
        totalDiscovered += files.length
        for (const file of files) {
          const externalSourceId = `sharepoint:${siteId}:${driveId}:${file.itemId}`
          if (existingExternalIds.has(externalSourceId)) {
            skipped++
            siteSkipped++
            continue
          }

          try {
            const buffer = await downloadFileBuffer(
              bearerToken,
              driveId,
              file.itemId
            )

            await knowledgeBaseSdk.uploadKnowledgeBaseFile({
              knowledgeBaseId,
              filename: file.filename,
              mimetype: file.mimetype,
              size: buffer.byteLength,
              buffer,
              uploadedBy: `sharepoint:${siteId}`,
              externalSourceId,
            })

            existingExternalIds.add(externalSourceId)
            synced++
            siteSynced++
          } catch (error) {
            console.error("Failed to sync SharePoint file for agent", {
              agentId: trimmedAgentId,
              siteId,
              driveId,
              itemId: file.itemId,
              error,
            })
            failed++
            siteFailed++
          }
        }
      }
    } catch (error) {
      console.error("Failed to sync SharePoint site for agent", {
        agentId: trimmedAgentId,
        siteId,
        error,
      })
      failed++
      siteFailed++
    } finally {
      await saveSharePointSyncRunState({
        agentId: trimmedAgentId,
        siteId,
        lastRunAt,
        synced: siteSynced,
        failed: siteFailed,
        skipped: siteSkipped,
        totalDiscovered: siteTotalDiscovered,
      })
    }
  }

  return {
    agentId: trimmedAgentId,
    synced,
    failed,
    skipped,
    totalDiscovered,
  }
}
