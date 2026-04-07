export enum JobQueue {
  AUTOMATION = "automationQueue",
  APP_BACKUP = "appBackupQueue",
  AUDIT_LOG = "auditLogQueue",
  SYSTEM_EVENT_QUEUE = "systemEventQueue",
  APP_MIGRATION = "appMigration",
  DOC_WRITETHROUGH_QUEUE = "docWritethroughQueue",
  DEV_REVERT_PROCESSOR = "devRevertProcessorQueue",
  BATCH_USER_SYNC_PROCESSOR = "batchUserSyncProcessorQueue",
  RAG_INGESTION = "ragIngestionQueue",
  SHAREPOINT_SYNC = "sharePointSyncQueue",
  AGENT_LOG_INDEXING = "agentLogIndexingQueue",
}
