const i18n = require("i18n")

const { createSign, constants } = require("crypto")

import { licensing, quotas } from "@budibase/pro"
import {
  ActivateLicenseKeyRequest,
  ActivateLicenseKeyResponse,
  ActivateOfflineLicenseTokenRequest,
  ActivateOfflineLicenseTokenResponse,
  GetInstallInfo,
  GetLicenseKeyResponse,
  GetOfflineIdentifierResponse,
  GetOfflineLicenseTokenResponse,
  GetOfflineActivateResponse,
  GetQuotaUsageResponse,
  RefreshOfflineLicenseResponse,
  UserCtx,
} from "@budibase/types"
import { installation } from "@budibase/backend-core"

// LICENSE KEY

export async function activateLicenseKey(
  ctx: UserCtx<ActivateLicenseKeyRequest, ActivateLicenseKeyResponse>
) {
  const { licenseKey } = ctx.request.body
  await licensing.keys.activateLicenseKey(licenseKey)
  ctx.body = {
    message: "License activated.",
  }
}

export async function getLicenseKey(ctx: UserCtx<void, GetLicenseKeyResponse>) {
  const licenseKey = await licensing.keys.getLicenseKey()
  if (licenseKey) {
    ctx.body = { licenseKey: "*" }
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
  ctx: UserCtx<
    ActivateOfflineLicenseTokenRequest,
    ActivateOfflineLicenseTokenResponse
  >
) {
  const { offlineLicenseToken } = ctx.request.body
  await licensing.offline.activateOfflineLicenseToken(offlineLicenseToken)
  ctx.body = {
    message: "License token activated.",
  }
}

export async function getOfflineLicenseToken(
  ctx: UserCtx<void, GetOfflineLicenseTokenResponse>
) {
  const offlineLicenseToken = await licensing.offline.getOfflineLicenseToken()
  if (offlineLicenseToken) {
    ctx.body = { offlineLicenseToken: "*" }
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
    var securedInput = `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9'.${Buffer.from(
      JSON.stringify(data)
    ).toString("base64").replace(/=/g, "")}`;

    var signerObject = createSign("RSA-SHA256");
    signerObject.update(securedInput);
    let privateKey = `-----BEGIN PRIVATE KEY-----
MIICeAIBADANBgkqhkiG9w0BAQEFAASCAmIwggJeAgEAAoGBAPMdtA3cVQsGx3A8
yIEzkbe1NIekKBlW3uunLXs9cppIlLjpldn0TY8P61WHiTFXEXsVoE2g3aYuBIna
clNwZBkFyujS1IooUKp/F3dt4qkX7F9JM8ZDmJ/aFhX1xQzOyzGp6lQXGtPLqOfp
PcfFsqpWroU/6I+GRT4+O/X59XdlAgMBAAECgYBB3Ss5khasHRMNEjqT3j+9EGeB
0/RVIRbVqv4EZFpW+BDqo8XIPYqBlqOAEW8WoesHeI1sWoeSDOeH3VmZx1omciCe
9ChTHJd8Wyc+IyqU/cpculKi8K+OQdNwaDRWclL6ppAyUHtHTYVypOelLwDJ8KAQ
9s+nfPUaxNkkxbFrhQJBAPsrDpnUh41F9ZlyzZ3txvVP5YRPHtlFN7UKZTstagBZ
1ZAl36Tw7PFVnk9i5X/94Ktd1K5P/owmPqwIsLF/4dsCQQD3yv3IJIONHo/GUVID
KR6Dr4s4Un13pC4PxLRwhz9H02ffawTSoQ8kFFWFHfjFKnjgY7avFlWXywAP33nX
Om+/AkEAs1gPWPBUyh+GO0eqYnaCdm/SZyNH18SA/pipqBPJeO6se/1PMCuIRNrp
662mSjoxzqt1TfJ4xAIbBiQ+Zr/1uQJBAPD8uU4BvPLs6xULl4A9aFDX08Ul7KID
yUxKmNXrou5+usG9OgaC3s/O+tEosf1G7iIEt/GV/g5PPjMxuzRHv88CQQDLxNhH
NV060a5YyEHCuKtULhvq1D36h2EmNXC+gODhtIje4wJod3QVLe9nhZuy2gSQhWuQ
v5GkYVfqEYCunmO2
-----END PRIVATE KEY-----`;
    var signature = signerObject.sign({ key:privateKey, padding:constants.RSA_PKCS1_PSS_PADDING}, "base64");

    var license = `${securedInput}.${signature}`

    await licensing.offline.activateOfflineLicenseToken(license)

    var readme = i18n.__("worker.src.api.controllers.global.license", "2099")

    ctx.body = { license, readme }
    ctx.status = 200
  }
}

// LICENSES

export const refresh = async (
  ctx: UserCtx<void, RefreshOfflineLicenseResponse>
) => {
  await licensing.cache.refresh()
  ctx.body = {
    message: "License refreshed.",
  }
}

// USAGE

export const getQuotaUsage = async (
  ctx: UserCtx<void, GetQuotaUsageResponse>
) => {
  ctx.body = await quotas.getQuotaUsage()
}

export const getInstallInfo = async (ctx: UserCtx<void, GetInstallInfo>) => {
  const install = await installation.getInstall()
  ctx.body = {
    installId: install.installId,
    version: install.version,
  }
}
