const jwa = require("jwa")
const i18n = require("i18n")

const { createSecretKey } = require("crypto")
var secretOrPublicKey = createSecretKey(Buffer.from("testsecret"))

import { licensing, quotas } from "@budibase/pro"
import {
  ActivateLicenseKeyRequest,
  ActivateOfflineLicenseTokenRequest,
  GetLicenseKeyResponse,
  GetOfflineIdentifierResponse,
  GetOfflineLicenseTokenResponse,
  GetOfflineActivateResponse,
  UserCtx,
} from "@budibase/types"

// LICENSE KEY

export async function activateLicenseKey(
  ctx: UserCtx<ActivateLicenseKeyRequest>
) {
  const { licenseKey } = ctx.request.body
  await licensing.keys.activateLicenseKey(licenseKey)
  ctx.status = 200
}

export async function getLicenseKey(ctx: UserCtx<void, GetLicenseKeyResponse>) {
  const licenseKey = await licensing.keys.getLicenseKey()
  if (licenseKey) {
    ctx.body = { licenseKey: "*" }
    ctx.status = 200
  } else {
    ctx.status = 404
  }
}

export async function deleteLicenseKey(ctx: UserCtx<void, void>) {
  await licensing.keys.deleteLicenseKey()
  ctx.status = 204
}

// OFFLINE LICENSE

export async function activateOfflineLicenseToken(
  ctx: UserCtx<ActivateOfflineLicenseTokenRequest>
) {
  const { offlineLicenseToken } = ctx.request.body
  await licensing.offline.activateOfflineLicenseToken(offlineLicenseToken)
  ctx.status = 200
}

export async function getOfflineLicenseToken(
  ctx: UserCtx<void, GetOfflineLicenseTokenResponse>
) {
  const offlineLicenseToken = await licensing.offline.getOfflineLicenseToken()
  if (offlineLicenseToken) {
    ctx.body = { offlineLicenseToken: "*" }
    ctx.status = 200
  } else {
    ctx.status = 404
  }
}

export async function deleteOfflineLicenseToken(ctx: UserCtx<void, void>) {
  await licensing.offline.deleteOfflineLicenseToken()
  ctx.status = 204
}

export async function getOfflineLicenseIdentifier(
  ctx: UserCtx<void, GetOfflineIdentifierResponse>
) {
  const identifierBase64 = await licensing.offline.getIdentifierBase64()
  ctx.body = { identifierBase64 }
  ctx.status = 200
}

export async function getOfflineLicenseActivate(
  ctx: UserCtx<void, GetOfflineActivateResponse>
) {
  const identifierBase64 = await licensing.offline.getIdentifierBase64()
  var identifier = Buffer.from(identifierBase64, "base64").toString("ascii")

  if (identifier) {
    var data = {
      expireAt: "2099-01-01", // срок лицензии
      plan: { type: "enterprise" }, // план free, pro, team, premium, premium_plus, premium_plus_trial, business, enterprise_basic, enterprise_basic_trial, enterprise
      identifier: JSON.parse(identifier),
    }
    var securedInput = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(
      JSON.stringify(data)
    )
      .toString("base64")
      .replace(/=/g, "")}`

    var factory = jwa("HS256")
    var sign = factory.sign(securedInput, secretOrPublicKey)

    var license = `${securedInput}.${sign}`

    await licensing.offline.activateOfflineLicenseToken(license)

    var readme = i18n.__("worker.src.api.controllers.global.license", "2099")

    ctx.body = { license, readme }
    ctx.status = 200
  }
}

// LICENSES

export const refresh = async (ctx: any) => {
  await licensing.cache.refresh()
  ctx.status = 200
}

// USAGE

export const getQuotaUsage = async (ctx: any) => {
  ctx.body = await quotas.getQuotaUsage()
  ctx.status = 200
}
