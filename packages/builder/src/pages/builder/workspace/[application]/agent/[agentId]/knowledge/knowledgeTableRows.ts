import { helpers } from "@budibase/shared-core"
import {
  KnowledgeBaseFileStatus,
  type KnowledgeBaseFile,
  type KnowledgeSourceOption,
  type KnowledgeSourceSyncRun,
} from "@budibase/types"
import type {
  FileKnowledgeTableRow,
  SharePointConnectionTableRow,
} from "./renderers/types"

export const formatTimestamp = (value?: string | number) => {
  if (value == null || value === "") {
    return "—"
  }
  try {
    return new Date(value).toLocaleString()
  } catch (error) {
    return value
  }
}

const readableStatus: Record<KnowledgeBaseFileStatus, string> = {
  [KnowledgeBaseFileStatus.PROCESSING]: "Processing",
  [KnowledgeBaseFileStatus.READY]: "Ready",
  [KnowledgeBaseFileStatus.FAILED]: "Failed",
}

const formatFileStatus = (file: KnowledgeBaseFile) =>
  readableStatus[file.status] || file.status

export const toFileTableRows = (
  list: KnowledgeBaseFile[],
  onDelete: (file: KnowledgeBaseFile) => Promise<void>
): FileKnowledgeTableRow[] =>
  list
    .map(file => ({
      kind: "file" as const,
      _id: file._id,
      filename: file.filename,
      status: file.status,
      displayStatus: formatFileStatus(file),
      size: helpers.formatBytes(file.size, " "),
      updatedAt: formatTimestamp(
        file.processedAt || file.updatedAt || file.createdAt
      ),
      mimetype: file.mimetype,
      onDelete: () => onDelete(file),
      errorMessage: file.errorMessage,
    }))
    .sort((a, b) => a.filename.localeCompare(b.filename))

type ReadOnlyFileKnowledgeTableRow = Omit<FileKnowledgeTableRow, "onDelete">

export const toReadOnlyFileTableRows = (
  list: KnowledgeBaseFile[]
): ReadOnlyFileKnowledgeTableRow[] =>
  toFileTableRows(list, async () => {}).map(
    ({ onDelete: _onDelete, ...row }) => row
  )

export const getSharePointFilesForSite = (
  files: KnowledgeBaseFile[],
  siteId: string
) =>
  files.filter(file =>
    file.externalSourceId?.startsWith(`sharepoint:${siteId}:`)
  )

export const getSharePointFileProcessingCounts = (
  files: KnowledgeBaseFile[],
  siteId: string
) => {
  const siteFiles = getSharePointFilesForSite(files, siteId)
  const ready = siteFiles.filter(
    file => file.status === KnowledgeBaseFileStatus.READY
  ).length
  const failed = siteFiles.filter(
    file => file.status === KnowledgeBaseFileStatus.FAILED
  ).length
  const processing = siteFiles.filter(
    file => file.status === KnowledgeBaseFileStatus.PROCESSING
  ).length
  return { ready, failed, processing }
}

export const getSharePointLastSyncLabel = (
  runsBySiteId: Record<string, KnowledgeSourceSyncRun>,
  siteId: string
) => {
  const run = runsBySiteId[siteId]
  if (!run?.lastRunAt) {
    return "SharePoint"
  }
  return `Last sync at ${formatTimestamp(run.lastRunAt)} - SharePoint`
}

export const toSharePointConnectionRows = ({
  hasSharePointConnection,
  selectedSiteIds,
  sharePointSources,
  sharePointSites,
  sharePointSyncRunsBySiteId,
  files,
  loadingSharePointSites,
  onDelete,
  onSync,
}: {
  hasSharePointConnection: boolean
  selectedSiteIds: string[]
  sharePointSources: Array<{
    id: string
    config: { site?: { id: string; name?: string; webUrl?: string } }
  }>
  sharePointSites: KnowledgeSourceOption[]
  sharePointSyncRunsBySiteId: Record<string, KnowledgeSourceSyncRun>
  files: KnowledgeBaseFile[]
  loadingSharePointSites: boolean
  onDelete: (siteId: string) => Promise<void>
  onSync: (sourceId: string) => Promise<void>
}): SharePointConnectionTableRow[] => {
  if (!hasSharePointConnection) {
    return []
  }

  return selectedSiteIds
    .map(siteId => {
      const source = sharePointSources.find(
        source => source.config.site?.id === siteId
      )
      const site =
        source?.config.site ||
        sharePointSites.find(entry => entry.id === siteId)
      const run = sharePointSyncRunsBySiteId[siteId]
      const hasSynced = !!run?.lastRunAt
      const { ready, failed, processing } = getSharePointFileProcessingCounts(
        files,
        siteId
      )
      const total = run?.totalDiscovered || 0
      const completed = Math.min(ready + failed, total)
      const siteDisplayName =
        site?.name ||
        site?.webUrl ||
        (loadingSharePointSites
          ? "Loading SharePoint site..."
          : "SharePoint site")
      const displayStatus = !hasSynced
        ? "Processing"
        : total === 0
          ? "No files found"
          : `${completed}/${total} files`
      return {
        kind: "sharepoint_connection" as const,
        __clickable: true,
        _id: `sharepoint-site-${siteId}`,
        sourceId: source?.id || `sharepoint_site_${siteId}`,
        siteId,
        filename: siteDisplayName,
        subtitle: getSharePointLastSyncLabel(
          sharePointSyncRunsBySiteId,
          siteId
        ),
        displayStatus,
        syncedCount: ready,
        totalCount: total,
        failedCount: failed,
        processingCount: processing,
        hasSynced,
        runStatus: run?.status,
        onDelete: () => onDelete(siteId),
        onSync: () => onSync(source?.id || `sharepoint_site_${siteId}`),
      }
    })
    .sort((a, b) => a.filename.localeCompare(b.filename))
}
