import { readFile, unlink } from "node:fs/promises"
import { HTTPError } from "@budibase/backend-core"
import {
  AgentKnowledgeSourceType,
  AgentFileUploadResponse,
  CompleteAgentSharePointConnectionRequest,
  CompleteAgentSharePointConnectionResponse,
  DisconnectAgentSharePointResponse,
  FetchAgentSharePointSitesResponse,
  FetchAgentFilesResponse,
  SetAgentSharePointSitesRequest,
  SetAgentSharePointSitesResponse,
  SyncAgentSharePointRequest,
  SyncAgentSharePointResponse,
  UserCtx,
} from "@budibase/types"
import sdk from "../../../sdk"
import {
  cleanupSharePointFilesForAgent,
  getSharePointSiteIds,
  getSharePointSource,
} from "./sharepoint"

const normalizeUpload = (fileInput: any) => {
  if (!fileInput) {
    return undefined
  }
  if (Array.isArray(fileInput)) {
    return fileInput[0]
  }
  return fileInput
}

const unlinkSafe = async (path?: string) => {
  if (!path) {
    return
  }
  try {
    await unlink(path)
  } catch (error) {
    console.log("Failed to delete temp file", error)
  }
}

export async function fetchAgentFiles(
  ctx: UserCtx<void, FetchAgentFilesResponse, { agentId: string }>
) {
  const { agentId } = ctx.params
  const files = await sdk.ai.rag.listFilesForAgent(agentId)
  ctx.body = { files }
  ctx.status = 200
}

export async function uploadAgentFile(
  ctx: UserCtx<void, AgentFileUploadResponse, { agentId: string }>
) {
  const { agentId } = ctx.params
  const upload = normalizeUpload(
    ctx.request.files?.file ||
      ctx.request.files?.knowledgeBaseFile ||
      ctx.request.files?.upload
  )

  if (!upload) {
    throw new HTTPError("file is required", 400)
  }
  const filePath = upload.filepath || upload.path
  if (!filePath) {
    throw new HTTPError("Invalid upload payload", 400)
  }

  const filename = upload.originalFilename || upload.name || "agent-document"
  const mimetype = upload.mimetype || upload.type
  const fileSize =
    typeof upload.size === "number"
      ? upload.size
      : Number(upload.size) || undefined

  const buffer = await readFile(filePath)

  try {
    const updated = await sdk.ai.rag.uploadFileForAgent(agentId, {
      filename,
      mimetype,
      size: fileSize ?? buffer.byteLength,
      buffer,
      uploadedBy: ctx.user?._id!,
    })
    ctx.body = { file: updated }
    ctx.status = 201
  } catch (error: any) {
    console.error("Failed to upload agent file", error)
    throw new HTTPError(
      error?.message || "Failed to process uploaded file",
      400
    )
  } finally {
    await unlinkSafe(filePath)
  }
}

export async function deleteAgentFile(
  ctx: UserCtx<void, { deleted: true }, { agentId: string; fileId: string }>
) {
  const { agentId, fileId } = ctx.params
  await sdk.ai.rag.deleteFileForAgent(agentId, fileId)
  ctx.body = { deleted: true }
  ctx.status = 200
}

export async function completeAgentSharePointConnection(
  ctx: UserCtx<
    CompleteAgentSharePointConnectionRequest,
    CompleteAgentSharePointConnectionResponse,
    { agentId: string }
  >
) {
  const { agentId } = ctx.params
  const { appId, continueSetupId } = ctx.request.body
  const response = await sdk.ai.rag.completeSharePointConnectionForAgent({
    agentId,
    appId,
    continueSetupId,
  })
  const agent = await sdk.ai.agents.getOrThrow(agentId)
  await sdk.ai.rag.sharepointSyncQueue.reconcileAgentJobs(agent)
  ctx.body = response
  ctx.status = 200
}

export async function fetchAgentSharePointSites(
  ctx: UserCtx<void, FetchAgentSharePointSitesResponse, { agentId: string }>
) {
  const { agentId } = ctx.params
  ctx.body = await sdk.ai.rag.fetchSharePointSitesForAgent(agentId)
  ctx.status = 200
}

export async function syncAgentSharePoint(
  ctx: UserCtx<
    SyncAgentSharePointRequest,
    SyncAgentSharePointResponse,
    { agentId: string }
  >
) {
  const { agentId } = ctx.params
  const siteIds = Array.isArray(ctx.request.body?.siteIds)
    ? ctx.request.body.siteIds
    : undefined
  const response = await sdk.ai.rag.syncSharePointForAgent(agentId, siteIds)
  const agent = await sdk.ai.agents.getOrThrow(agentId)
  await sdk.ai.rag.sharepointSyncQueue.reconcileAgentJobs(agent)
  ctx.body = response
  ctx.status = 200
}

export async function setAgentSharePointSites(
  ctx: UserCtx<
    SetAgentSharePointSitesRequest,
    SetAgentSharePointSitesResponse,
    { agentId: string }
  >
) {
  const { agentId } = ctx.params
  const siteIds = Array.from(
    new Set(
      (ctx.request.body.siteIds || [])
        .map(id => id?.trim())
        .filter((id): id is string => !!id)
    )
  )

  const existingAgent = await sdk.ai.agents.getOrThrow(agentId)
  const sharePointSource = getSharePointSource(existingAgent)
  const connectionId = sharePointSource?.config.connectionId?.trim()
  if (!sharePointSource || !connectionId) {
    throw new HTTPError("SharePoint is not connected for this agent", 400)
  }

  const previousSiteIds = getSharePointSiteIds(existingAgent)
  let availableById = new Map<string, { name?: string; webUrl?: string }>()
  try {
    const availableSites =
      await sdk.ai.rag.fetchSharePointSitesForAgent(agentId)
    availableById = new Map(
      availableSites.sites.map(site => [
        site.id,
        { name: site.name, webUrl: site.webUrl },
      ])
    )
  } catch (error) {
    console.log(
      "Failed to fetch SharePoint site metadata while updating sites",
      {
        agentId,
        error,
      }
    )
  }
  const existingById = new Map(
    (sharePointSource.config.sites || []).map(site => [site.id, site] as const)
  )
  const nextSites = siteIds.map(siteId => {
    const existingSite = existingById.get(siteId)
    const fetchedSite = availableById.get(siteId)
    return {
      id: siteId,
      name: fetchedSite?.name || existingSite?.name,
      webUrl: fetchedSite?.webUrl || existingSite?.webUrl,
    }
  })

  const nextSources = (existingAgent.knowledgeSources || []).map(source => {
    if (source.type !== AgentKnowledgeSourceType.SHAREPOINT) {
      return source
    }
    return {
      ...source,
      config: {
        ...source.config,
        sites: nextSites,
      },
    }
  })

  const updated = await sdk.ai.agents.update({
    ...existingAgent,
    knowledgeSources: nextSources,
  })
  await sdk.ai.rag.sharepointSyncQueue.reconcileAgentJobs(updated)

  const removedSharePointSiteIds = [...previousSiteIds].filter(
    id => !siteIds.includes(id)
  )
  await cleanupSharePointFilesForAgent({
    agentId,
    removedSharePointSiteIds,
    sharePointDisconnected: false,
  })

  ctx.body = {
    agentId,
    siteIds,
  }
  ctx.status = 200
}

export async function disconnectAgentSharePoint(
  ctx: UserCtx<void, DisconnectAgentSharePointResponse, { agentId: string }>
) {
  const { agentId } = ctx.params
  const existingAgent = await sdk.ai.agents.getOrThrow(agentId)

  const nextSources = (existingAgent.knowledgeSources || []).filter(
    source => source.type !== AgentKnowledgeSourceType.SHAREPOINT
  )
  await sdk.ai.agents.update({
    ...existingAgent,
    knowledgeSources: nextSources,
  })
  await sdk.ai.rag.sharepointSyncQueue.removeAllAgentJobs(agentId)
  await cleanupSharePointFilesForAgent({
    agentId,
    removedSharePointSiteIds: [],
    sharePointDisconnected: true,
  })

  ctx.body = {
    agentId,
    disconnected: true,
  }
  ctx.status = 200
}
