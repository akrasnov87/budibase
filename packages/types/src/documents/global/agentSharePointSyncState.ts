import { Document } from "../../"

export enum AgentSharePointSyncRunStatus {
  SUCCESS = "success",
  PARTIAL = "partial",
  FAILED = "failed",
}

export interface AgentSharePointSyncState extends Document {
  agentId: string
  siteId: string
  lastRunAt: string
  synced: number
  failed: number
  skipped: number
  totalDiscovered: number
  status: AgentSharePointSyncRunStatus
}
