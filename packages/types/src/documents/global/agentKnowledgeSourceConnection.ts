import { AgentKnowledgeSourceType, Document } from "../../"

export enum AgentKnowledgeSourceConnectionAuthType {
  DELEGATED_OAUTH = "delegated_oauth",
  CLIENT_CREDENTIALS = "client_credentials",
}

export interface AgentKnowledgeSourceConnection extends Document {
  sourceType: AgentKnowledgeSourceType
  authType?: AgentKnowledgeSourceConnectionAuthType
  account: string
  tenantId: string
  tokenEndpoint: string
  scope?: string
  accessToken?: string
  refreshToken?: string
  tokenType?: string
  expiresAt?: number
  clientId: string
  clientSecret: string
}
