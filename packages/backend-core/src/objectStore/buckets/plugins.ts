import env from "../../environment"
import * as objectStore from "../objectStore"
import * as context from "../../context"
import * as cloudfront from "../cloudfront"
import { Plugin } from "@budibase/types"

// URLS

export async function enrichPluginURLs(plugins?: Plugin[]): Promise<Plugin[]> {
  if (!plugins || !plugins.length) {
    return []
  }
  return await Promise.all(
    plugins.map(async plugin => {
      const jsUrl = await getPluginJSUrl(plugin)
      const iconUrl = await getPluginIconUrl(plugin)
      return { ...plugin, jsUrl, iconUrl }
    })
  )
}

async function getPluginJSUrl(plugin: Plugin) {
  const s3Key = getPluginJSKey(plugin)
  return getPluginUrl(s3Key)
}

async function getPluginIconUrl(plugin: Plugin) {
  const s3Key = getPluginIconKey(plugin)
  if (!s3Key) {
    return
  }
  return getPluginUrl(s3Key)
}

async function getPluginUrl(s3Key: string) {
  if (env.CLOUDFRONT_CDN) {
    return cloudfront.getPresignedUrl(s3Key)
  } else {
    return await objectStore.getPresignedUrl(env.PLUGIN_BUCKET_NAME, s3Key)
  }
}

// S3 KEYS

export function getPluginJSKey(plugin: Plugin) {
  return getPluginS3Key(plugin, "plugin.min.js")
}

export function getPluginIconKey(plugin: Plugin) {
  // stored iconUrl is deprecated - hardcode to icon.svg in this case
  const iconFileName = plugin.iconUrl ? "icon.svg" : plugin.iconFileName
  if (!iconFileName) {
    return
  }
  return getPluginS3Key(plugin, iconFileName)
}

function getPluginS3Key(plugin: Plugin, fileName: string) {
  const s3Key = getPluginS3Dir(plugin.name)
  return `${s3Key}/${fileName}`
}

export function getPluginS3Dir(pluginName: string) {
  let s3Key = `${pluginName}`
  if (env.MULTI_TENANCY) {
    const tenantId = context.getTenantId()
    s3Key = `${tenantId}/${s3Key}`
  }
  if (env.CLOUDFRONT_CDN) {
    s3Key = `plugins/${s3Key}`
  }
  return s3Key
}
