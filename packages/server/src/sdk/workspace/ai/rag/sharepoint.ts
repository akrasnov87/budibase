import { HTTPError } from "@budibase/backend-core"
import {
  type Agent,
  AgentKnowledgeSourceType,
  type AgentSharePointKnowledgeSource,
  type CompleteAgentSharePointConnectionRequest,
  type CompleteAgentSharePointConnectionResponse,
  type FetchAgentSharePointSitesResponse,
  type SyncAgentSharePointResponse,
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
const DEFAULT_SHAREPOINT_SOURCE_ID = "sharepoint_default"

const trimString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""
const connectionCacheKey = (connectionId: string) =>
  sharePointConnectionCacheKey("connection", connectionId)

const getSharePointSource = (
  agent: Agent
): AgentSharePointKnowledgeSource | undefined => {
  return (agent.knowledgeSources || []).find(
    source => source.type === AgentKnowledgeSourceType.SHAREPOINT
  ) as AgentSharePointKnowledgeSource | undefined
}

const updateAgentSharePoint = async (
  agent: Agent,
  update: {
    connectionId?: string
    siteIds?: string[]
    lastSyncedAt?: string
    remove?: boolean
  }
) => {
  const existingSources = [...(agent.knowledgeSources || [])]
  const source = getSharePointSource(agent)
  const sourceId = source?.id || DEFAULT_SHAREPOINT_SOURCE_ID
  const withoutSharePoint = existingSources.filter(
    existing => existing.type !== AgentKnowledgeSourceType.SHAREPOINT
  )
  const nextSources = update.remove
    ? withoutSharePoint
    : [
        ...withoutSharePoint,
        {
          id: sourceId,
          type: AgentKnowledgeSourceType.SHAREPOINT,
          name: source?.name || "SharePoint",
          config: {
            connectionId: update.connectionId ?? source?.config.connectionId,
            siteIds: update.siteIds ?? source?.config.siteIds ?? [],
            lastSyncedAt:
              update.lastSyncedAt ?? source?.config.lastSyncedAt ?? undefined,
          },
        } satisfies AgentSharePointKnowledgeSource,
      ]

  await agentsSdk.update({
    ...agent,
    knowledgeSources: nextSources,
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
    nextLink = trimString(payload?.["@odata.nextLink"])
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
}: CompleteAgentSharePointConnectionRequest & {
  agentId: string
}): Promise<CompleteAgentSharePointConnectionResponse> => {
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
  await updateAgentSharePoint(agent, { connectionId })

  return {
    agentId: trimmedAgentId,
    connected: true,
  }
}

export const fetchSharePointSitesForAgent = async (
  agentId: string
): Promise<FetchAgentSharePointSitesResponse> => {
  const trimmedAgentId = trimString(agentId)
  if (!trimmedAgentId) {
    throw new HTTPError("agentId is required", 400)
  }
  const agent = await agentsSdk.getOrThrow(trimmedAgentId)
  const source = getSharePointSource(agent)
  const connectionId = trimString(source?.config.connectionId)
  if (!connectionId) {
    return { sites: [] }
  }

  return { sites: await fetchSharePointSitesByConnection(connectionCacheKey(connectionId)) }
}

export const syncSharePointForAgent = async (
  agentId: string,
  siteIdsInput?: string[]
): Promise<SyncAgentSharePointResponse> => {
  const trimmedAgentId = trimString(agentId)
  if (!trimmedAgentId) {
    throw new HTTPError("agentId is required", 400)
  }
  const agent = await agentsSdk.getOrThrow(trimmedAgentId)
  const source = getSharePointSource(agent)
  const connectionId = trimString(source?.config.connectionId)
  if (!connectionId) {
    throw new HTTPError("SharePoint is not connected for this agent", 400)
  }

  const siteIds = (siteIdsInput ?? source?.config.siteIds ?? [])
    .map(siteId => trimString(siteId))
    .filter(Boolean)

  if (siteIdsInput) {
    await updateAgentSharePoint(agent, {
      connectionId,
      siteIds,
    })
  }

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

  const existingFiles = await knowledgeBaseSdk.listKnowledgeBaseFiles(
    knowledgeBaseId
  )
  const existingExternalIds = new Set(
    existingFiles
      .map(file => trimString(file.externalSourceId))
      .filter(Boolean)
  )

  let synced = 0
  let failed = 0
  let skipped = 0
  let totalDiscovered = 0

  for (const siteId of siteIds) {
    try {
      const driveIds = await listDrives(bearerToken, siteId)
      for (const driveId of driveIds) {
        const files = await collectFilesRecursive(bearerToken, driveId)
        totalDiscovered += files.length
        for (const file of files) {
          const externalSourceId = `sharepoint:${siteId}:${driveId}:${file.itemId}`
          if (existingExternalIds.has(externalSourceId)) {
            skipped++
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
          } catch (error) {
            console.log("Failed to sync SharePoint file for agent", {
              agentId: trimmedAgentId,
              siteId,
              driveId,
              itemId: file.itemId,
              error,
            })
            failed++
          }
        }
      }
    } catch (error) {
      console.log("Failed to sync SharePoint site for agent", {
        agentId: trimmedAgentId,
        siteId,
        error,
      })
      failed++
    }
  }

  const latestAgent = await agentsSdk.getOrThrow(trimmedAgentId)
  await updateAgentSharePoint(latestAgent, {
    connectionId,
    siteIds,
    lastSyncedAt: new Date().toISOString(),
  })

  return {
    agentId: trimmedAgentId,
    synced,
    failed,
    skipped,
    totalDiscovered,
  }
}
