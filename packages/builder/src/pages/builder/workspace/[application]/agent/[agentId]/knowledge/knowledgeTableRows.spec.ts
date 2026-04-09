import { describe, expect, it, vi } from "vitest"
import {
  AgentSharePointSyncRunStatus,
  KnowledgeBaseFileStatus,
  type KnowledgeBaseFile,
  type KnowledgeSourceSyncRun,
} from "@budibase/types"
import {
  formatTimestamp,
  getSharePointFileProcessingCounts,
  getSharePointFilesForSite,
  getSharePointLastSyncLabel,
  toFileTableRows,
  toSharePointConnectionRows,
} from "./knowledgeTableRows"

const makeFile = (
  overrides: Partial<KnowledgeBaseFile>
): KnowledgeBaseFile => ({
  _id: "file_1",
  knowledgeBaseId: "kb_1",
  filename: "file.txt",
  objectStoreKey: "object/key",
  ragSourceId: "rag_source_1",
  status: KnowledgeBaseFileStatus.READY,
  uploadedBy: "user_1",
  ...overrides,
})

describe("knowledgeTableRows", () => {
  it("formats timestamp fallback safely", () => {
    expect(formatTimestamp(undefined)).toBe("—")
  })

  it("builds and sorts file rows", async () => {
    const onDelete = vi.fn(async () => {})
    const rows = toFileTableRows(
      [
        makeFile({ _id: "2", filename: "z.md" }),
        makeFile({ _id: "1", filename: "a.md" }),
      ],
      onDelete
    )

    expect(rows.map(row => row.filename)).toEqual(["a.md", "z.md"])
    await rows[0].onDelete()
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it("filters and counts sharepoint files by site", () => {
    const files = [
      makeFile({
        _id: "f1",
        status: KnowledgeBaseFileStatus.READY,
        externalSourceId: "sharepoint:site-1:drive-1:item-1",
      }),
      makeFile({
        _id: "f2",
        status: KnowledgeBaseFileStatus.PROCESSING,
        externalSourceId: "sharepoint:site-1:drive-1:item-2",
      }),
      makeFile({
        _id: "f3",
        status: KnowledgeBaseFileStatus.FAILED,
        externalSourceId: "sharepoint:site-2:drive-1:item-3",
      }),
    ]

    expect(
      getSharePointFilesForSite(files, "site-1").map(file => file._id)
    ).toEqual(["f1", "f2"])
    expect(getSharePointFileProcessingCounts(files, "site-1")).toEqual({
      ready: 1,
      failed: 0,
      processing: 1,
    })
  })

  it("formats sharepoint last sync label from run state", () => {
    const runsBySiteId: Record<string, KnowledgeSourceSyncRun> = {
      "site-1": {
        sourceId: "site-1",
        lastRunAt: "2026-04-08T10:00:00.000Z",
        synced: 1,
        failed: 0,
        skipped: 0,
        totalDiscovered: 1,
        status: AgentSharePointSyncRunStatus.SUCCESS,
      },
    }
    expect(getSharePointLastSyncLabel(runsBySiteId, "site-1")).toContain(
      "Last sync at"
    )
    expect(getSharePointLastSyncLabel({}, "site-1")).toBe("SharePoint")
  })

  it("builds sharepoint connection rows with sensible fallbacks", () => {
    const rows = toSharePointConnectionRows({
      hasSharePointConnection: true,
      selectedSiteIds: ["site-1", "site-2"],
      sharePointSources: [
        {
          id: "sharepoint_site_site-1",
          config: { site: { id: "site-1", name: "Team docs" } },
        },
      ],
      sharePointSites: [
        { id: "site-2", webUrl: "https://contoso.sharepoint.com/sites/a" },
      ],
      sharePointSyncRunsBySiteId: {
        "site-1": {
          sourceId: "site-1",
          lastRunAt: "2026-04-08T10:00:00.000Z",
          synced: 0,
          failed: 0,
          skipped: 0,
          totalDiscovered: 0,
          status: AgentSharePointSyncRunStatus.SUCCESS,
        },
      },
      files: [],
      loadingSharePointSites: false,
      onDelete: async () => {},
      onSync: async () => {},
    })

    expect(rows).toHaveLength(2)
    expect(rows.find(row => row.siteId === "site-1")?.filename).toBe(
      "Team docs"
    )
    expect(rows.find(row => row.siteId === "site-1")?.displayStatus).toBe(
      "No files found"
    )
    expect(rows.find(row => row.siteId === "site-2")?.filename).toContain(
      "https://contoso.sharepoint.com/sites/a"
    )
    expect(rows.find(row => row.siteId === "site-2")?.displayStatus).toBe(
      "Processing"
    )
  })
})
