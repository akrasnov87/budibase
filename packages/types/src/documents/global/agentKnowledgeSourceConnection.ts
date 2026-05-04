import { AgentKnowledgeSourceType, Document } from "../../"

export enum AgentKnowledgeSourceConnectionAuthType {
  DELEGATED_OAUTH = "delegated_oauth",
  CLIENT_CREDENTIALS = "client_credentials",
}

interface AgentKnowledgeSourceConnectionBase extends Document {
  sourceType: AgentKnowledgeSourceType
  account: string
  tokenEndpoint: string
  scope?: string
  clientId: string
  clientSecret: string
}

export interface DelegatedOAuthKnowledgeSourceConnection
  extends AgentKnowledgeSourceConnectionBase {
  authType: AgentKnowledgeSourceConnectionAuthType.DELEGATED_OAUTH
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresAt: number
}

export interface ClientCredentialsKnowledgeSourceConnection
  extends AgentKnowledgeSourceConnectionBase {
  authType: AgentKnowledgeSourceConnectionAuthType.CLIENT_CREDENTIALS
  accessToken?: string
  refreshToken?: string
  tokenType?: string
  expiresAt?: number
}

export type AgentKnowledgeSourceConnection =
  | DelegatedOAuthKnowledgeSourceConnection
  | ClientCredentialsKnowledgeSourceConnection
