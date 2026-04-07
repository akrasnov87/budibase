import { Cookie } from "../../../constants"
import * as cache from "../../../cache"
import * as configs from "../../../configs"
import env from "../../../environment"
import * as utils from "../../../utils"
import { DatasourceAuthCookie, UserCtx } from "@budibase/types"

type Passport = {
  authenticate: any
}

const DEFAULT_SCOPE =
  "offline_access https://graph.microsoft.com/Sites.Read.All"
const CREATION_CACHE_TTL_SECONDS = 600

const getMicrosoftConfig = () => {
  if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET) {
    throw new Error("No Microsoft datasource configuration found")
  }
  return {
    clientId: env.MICROSOFT_CLIENT_ID,
    clientSecret: env.MICROSOFT_CLIENT_SECRET,
    tenantId: env.MICROSOFT_TENANT_ID || "common",
  }
}

const appendQueryParam = (path: string, key: string, value: string) => {
  const base = "http://localhost"
  const url = new URL(path, base)
  url.searchParams.set(key, value)
  const qs = url.searchParams.toString()
  return `${url.pathname}${qs ? `?${qs}` : ""}`
}

const microsoftCreationCacheKey = (appId: string, setupId: string) =>
  utils.microsoftDatasourceCreationCacheKey(appId, setupId)

export async function preAuth(
  _passport: Passport,
  ctx: UserCtx,
  _next: Function
) {
  const appId = String(ctx.query.appId || "").trim()
  if (!appId) {
    ctx.throw(400, "appId query param not present.")
  }

  const { clientId, tenantId } = getMicrosoftConfig()
  const platformUrl = await configs.getPlatformUrl({ tenantAware: false })
  const callbackUrl = `${platformUrl}/api/global/auth/datasource/microsoft/callback`

  const state = utils.newid()
  await cache.store(`datasource:microsoft:state:${state}`, { appId }, 600)

  const authorizeUrl = new URL(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`
  )
  authorizeUrl.searchParams.set("client_id", clientId)
  authorizeUrl.searchParams.set("response_type", "code")
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl)
  authorizeUrl.searchParams.set("response_mode", "query")
  authorizeUrl.searchParams.set("scope", DEFAULT_SCOPE)
  authorizeUrl.searchParams.set("state", state)

  ctx.redirect(authorizeUrl.toString())
}

export async function postAuth(
  _passport: Passport,
  ctx: UserCtx,
  _next: Function
) {
  const authStateCookie = utils.getCookie<DatasourceAuthCookie>(
    ctx,
    Cookie.DatasourceAuth
  )
  if (!authStateCookie) {
    throw new Error("Unable to fetch datasource auth cookie")
  }

  const appId = String(authStateCookie.appId || "").trim()
  if (!appId) {
    throw new Error("Missing app id from datasource auth cookie")
  }

  const state = String(ctx.query.state || "").trim()
  if (!state) {
    throw new Error("Microsoft OAuth callback is missing state")
  }
  const statePayload = (await cache.get(
    `datasource:microsoft:state:${state}`
  )) as { appId?: string }
  await cache.destroy(`datasource:microsoft:state:${state}`)
  const stateAppId =
    typeof statePayload?.appId === "string" ? statePayload.appId.trim() : ""
  if (!statePayload || !stateAppId || stateAppId !== appId) {
    throw new Error("Microsoft OAuth state is invalid or expired")
  }

  const oauthError = String(ctx.query.error || "").trim()
  if (oauthError) {
    const description = String(ctx.query.error_description || "").trim()
    throw new Error(description || oauthError)
  }

  const code = String(ctx.query.code || "").trim()
  if (!code) {
    throw new Error(
      "Microsoft OAuth callback is missing the authorization code"
    )
  }

  const { clientId, clientSecret, tenantId } = getMicrosoftConfig()
  const platformUrl = await configs.getPlatformUrl({ tenantAware: false })
  const callbackUrl = `${platformUrl}/api/global/auth/datasource/microsoft/callback`
  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`

  const tokenResponse = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl,
      scope: DEFAULT_SCOPE,
    }),
  })
  const tokenPayload = await tokenResponse.json()
  if (!tokenResponse.ok) {
    const message =
      tokenPayload?.error_description ||
      tokenPayload?.error ||
      "Failed to exchange Microsoft OAuth code"
    throw new Error(message)
  }

  const refreshToken = tokenPayload?.refresh_token
  if (!refreshToken) {
    throw new Error("Microsoft OAuth response did not include a refresh token")
  }

  const id = utils.newid()
  const expiresIn = Number(tokenPayload?.expires_in || 0)
  await cache.store(
    microsoftCreationCacheKey(appId, id),
    {
      tenantId,
      tokenEndpoint,
      scope: tokenPayload?.scope || DEFAULT_SCOPE,
      accessToken: tokenPayload?.access_token,
      refreshToken,
      tokenType: tokenPayload?.token_type || "Bearer",
      expiresAt: Date.now() + Math.max(expiresIn - 60, 0) * 1000,
      clientId,
      clientSecret,
    },
    CREATION_CACHE_TTL_SECONDS
  )

  utils.clearCookie(ctx, Cookie.DatasourceAuth)

  const returnPath = authStateCookie.returnPath || `/builder/workspace/${appId}`
  ctx.redirect(appendQueryParam(returnPath, "continue_microsoft_setup", id))
}
