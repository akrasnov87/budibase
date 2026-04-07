import { cache, HTTPError } from "@budibase/backend-core"
import type { KnowledgeSourceOption } from "@budibase/types"

interface SharePointConnectionCacheRecord {
  tenantId: string
  tokenEndpoint: string
  scope?: string
  accessToken: string
  refreshToken: string
  tokenType?: string
  expiresAt?: number
  clientId: string
  clientSecret: string
}

const SHAREPOINT_API_BASE = "https://graph.microsoft.com/v1.0"
const DEFAULT_SCOPE =
  "offline_access https://graph.microsoft.com/Sites.Read.All"

const trimString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

export const sharePointSetupCacheKey = (appId: string, setupId: string) =>
  `datasource:creation:${appId}:microsoft:${setupId}`

export const sharePointConnectionCacheKey = (scope: string, scopeId: string) =>
  `sharepoint:${scope}:${scopeId}:connection`

const readConnection = async (
  connectionKey: string
): Promise<SharePointConnectionCacheRecord> => {
  const connection = await cache.get(connectionKey)
  if (!connection?.refreshToken) {
    throw new HTTPError(
      "SharePoint is not connected. Connect SharePoint and try again.",
      400
    )
  }
  return connection
}

const refreshConnection = async (
  connectionKey: string,
  connection: SharePointConnectionCacheRecord
): Promise<SharePointConnectionCacheRecord> => {
  const response = await fetch(connection.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: connection.clientId,
      client_secret: connection.clientSecret,
      grant_type: "refresh_token",
      refresh_token: connection.refreshToken,
      scope: connection.scope || DEFAULT_SCOPE,
    }),
  })
  const payload = await response.json()
  if (!response.ok) {
    throw new HTTPError(
      payload?.error_description ||
        payload?.error ||
        "Failed to refresh SharePoint OAuth credentials",
      400
    )
  }

  const expiresIn = Number(payload?.expires_in || 0)
  const updated: SharePointConnectionCacheRecord = {
    ...connection,
    scope: payload?.scope || connection.scope,
    accessToken: payload?.access_token || connection.accessToken,
    refreshToken: payload?.refresh_token || connection.refreshToken,
    tokenType: payload?.token_type || connection.tokenType || "Bearer",
    expiresAt: Date.now() + Math.max(expiresIn - 60, 0) * 1000,
  }
  await cache.store(connectionKey, updated)
  return updated
}

export const getSharePointBearerToken = async (
  connectionKey: string
): Promise<string> => {
  let connection = await readConnection(connectionKey)
  const expiresAt = Number(connection.expiresAt || 0)
  if (!connection.accessToken || expiresAt <= Date.now()) {
    connection = await refreshConnection(connectionKey, connection)
  }
  const tokenType = connection.tokenType?.trim() || "Bearer"
  return `${tokenType} ${connection.accessToken}`
}

export const storeSharePointConnectionFromSetup = async ({
  appId,
  setupId,
  connectionKey,
}: {
  appId: string
  setupId: string
  connectionKey: string
}) => {
  const cachedConnection = await cache.get(
    sharePointSetupCacheKey(appId, setupId)
  )
  if (!cachedConnection?.refreshToken) {
    throw new HTTPError(
      "SharePoint setup token is invalid or expired. Please connect again.",
      400
    )
  }

  await cache.store(
    connectionKey,
    cachedConnection as SharePointConnectionCacheRecord
  )
  await cache.destroy(sharePointSetupCacheKey(appId, setupId))
}

export const clearSharePointConnection = async (connectionKey: string) => {
  await cache.destroy(connectionKey)
}

export const fetchSharePointSitesByBearerToken = async (
  bearerToken: string
): Promise<KnowledgeSourceOption[]> => {
  const sitesById = new Map<string, KnowledgeSourceOption>()
  let currentPath = "/sites"
  let currentQuery = "search=*&$top=200&$select=id,name,webUrl"

  while (currentPath) {
    const response = await fetch(
      `${SHAREPOINT_API_BASE}${currentPath}?${currentQuery}`,
      {
        headers: {
          Authorization: bearerToken,
        },
      }
    )
    if (!response.ok) {
      const body = await response.text()
      throw new HTTPError(
        `Failed to fetch SharePoint sites (${response.status}): ${body}`,
        400
      )
    }

    const payload = (await response.json()) as {
      value?: KnowledgeSourceOption[]
      "@odata.nextLink"?: string
    }

    for (const site of Array.isArray(payload?.value) ? payload.value : []) {
      const id = trimString(site.id)
      if (!id) {
        continue
      }
      sitesById.set(id, {
        id,
        name: trimString(site.name) || undefined,
        webUrl: trimString(site.webUrl) || undefined,
      })
    }

    const nextLink = trimString(payload?.["@odata.nextLink"])
    if (!nextLink || !nextLink.startsWith(SHAREPOINT_API_BASE)) {
      break
    }

    const nextUrl = new URL(nextLink)
    currentPath = nextUrl.pathname.replace("/v1.0", "") || ""
    currentQuery = nextUrl.search.startsWith("?")
      ? nextUrl.search.slice(1)
      : nextUrl.search
  }

  return Array.from(sitesById.values())
}

export const fetchSharePointSitesByConnection = async (
  connectionKey: string
): Promise<KnowledgeSourceOption[]> => {
  const bearerToken = await getSharePointBearerToken(connectionKey)
  return fetchSharePointSitesByBearerToken(bearerToken)
}
