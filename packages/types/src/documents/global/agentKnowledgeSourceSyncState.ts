import { Document } from "../../"

export enum AgentKnowledgeSourceSyncRunStatus {
  SUCCESS = "success",
  PARTIAL = "partial",
  FAILED = "failed",
}

export interface AgentKnowledgeSourceSyncState extends Document {
  agentId: string
  sourceType: string
  sourceId: string
  lastRunAt: string
  synced: number
  failed: number
  skipped: number
  totalDiscovered: number
  status: AgentKnowledgeSourceSyncRunStatus
}
