import type {
  ImportEndpoint,
  ImportRestQueryInfoRequest,
  RestTemplateSpec,
} from "@budibase/types"

const normalizeEndpointLabel = (value?: string) =>
  (value || "").toLowerCase().replace(/[^a-z0-9]/g, "")

const getShortText = (value?: string) => {
  const text = value?.trim()
  if (!text) {
    return ""
  }
  return (
    text
      .split(/\r?\n/)
      .map(line => line.trim())
      .find(Boolean) || ""
  )
}

export const humanizeOperationId = (operationId?: string) => {
  const text = operationId?.trim()
  if (!text) {
    return ""
  }
  const withoutNamespace = text.replace(/^[A-Z][A-Za-z0-9]*_/, "")
  const withoutMethodPrefix = withoutNamespace.replace(
    /^(get|post|put|patch|delete)-/i,
    ""
  )
  return withoutMethodPrefix
    .replace(/[{}]/g, " ")
    .replace(/[/.#:_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase())
}

export const formatEndpointDisplayLabel = (endpoint: ImportEndpoint) => {
  const summary = getShortText(endpoint.summary)
  if (summary) {
    return summary
  }

  const operationName = humanizeOperationId(endpoint.operationId)
  if (operationName) {
    return operationName
  }

  const method = endpoint.method?.trim().toUpperCase()
  const path = endpoint.path || endpoint.originalPath
  if (method && path) {
    return `${method} ${path}`
  }

  return formatEndpointLabel(endpoint)
}

export const formatEndpointSearchText = (endpoint: ImportEndpoint) => {
  return [
    formatEndpointDisplayLabel(endpoint),
    endpoint.summary,
    endpoint.operationId,
    endpoint.name,
    endpoint.tags?.join(" "),
    endpoint.method,
    endpoint.path,
    endpoint.originalPath,
  ]
    .filter(Boolean)
    .join(" ")
}

export type EndpointDisplayFields = {
  displayName: string
  searchText: string
}

export const addEndpointDisplayLabels = <T extends ImportEndpoint>(
  endpoints: T[]
): Array<T & EndpointDisplayFields> => {
  const baseLabels = new Map<T, string>()
  const labelCounts = new Map<string, number>()

  for (const endpoint of endpoints) {
    const label = formatEndpointDisplayLabel(endpoint)
    baseLabels.set(endpoint, label)
    labelCounts.set(label, (labelCounts.get(label) || 0) + 1)
  }

  const withTagLabels = endpoints.map(endpoint => {
    const baseLabel = baseLabels.get(endpoint) || ""
    const tag = endpoint.tags?.find(Boolean)
    const displayName =
      tag && labelCounts.get(baseLabel)! > 1
        ? `${baseLabel} - ${tag}`
        : baseLabel
    return { endpoint, displayName }
  })

  const tagLabelCounts = new Map<string, number>()
  for (const { displayName } of withTagLabels) {
    tagLabelCounts.set(displayName, (tagLabelCounts.get(displayName) || 0) + 1)
  }

  return withTagLabels.map(({ endpoint, displayName }) => {
    const method = endpoint.method?.trim().toUpperCase()
    const path = endpoint.path || endpoint.originalPath
    const finalDisplayName =
      method && path && tagLabelCounts.get(displayName)! > 1
        ? `${displayName} - ${method} ${path}`
        : displayName
    return {
      ...endpoint,
      displayName: finalDisplayName,
      searchText: formatEndpointSearchText({
        ...endpoint,
        name: finalDisplayName,
      }),
    }
  })
}

export const formatEndpointLabel = (endpoint: ImportEndpoint) => {
  const path = endpoint.path || ""
  const name = endpoint.name || ""

  if (!path && !name) {
    return ""
  }
  if (!path) {
    return name
  }
  if (!name) {
    return path
  }

  const normalizedPath = normalizeEndpointLabel(path)
  const normalizedName = normalizeEndpointLabel(name)
  if (normalizedPath && normalizedPath === normalizedName) {
    return path
  }
  return name
}

export const getRestTemplateImportInfoRequest = (
  spec?: RestTemplateSpec | null
): ImportRestQueryInfoRequest | undefined => {
  if (!spec) {
    return undefined
  }
  const payload: ImportRestQueryInfoRequest = {}
  if (spec.url) {
    payload.url = spec.url
  }
  if (!payload.url) {
    return undefined
  }
  return payload
}
