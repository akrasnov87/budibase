import { Optional } from "../../../shared"
import {
  Agent,
  AgentSharePointSyncRunStatus,
  ChatApp,
  ChatConversation,
  ChatConversationRequest,
  CreateChatConversationRequest,
  KnowledgeBaseFile,
} from "../../../documents"

export type ChatAgentRequest = ChatConversationRequest

export type FetchAgentHistoryResponse = ChatConversation[]

export type { CreateChatConversationRequest }

export type CreateChatAppRequest = Omit<
  ChatApp,
  "_id" | "_rev" | "createdAt" | "updatedAt"
>
export type UpdateChatAppRequest = Omit<ChatApp, "createdAt" | "updatedAt">

export interface FetchAgentsResponse {
  agents: Agent[]
}

export interface FetchAgentFilesResponse {
  files: KnowledgeBaseFile[]
}

export interface AgentFileUploadResponse {
  file: KnowledgeBaseFile
}

export interface SharePointSite {
  id: string
  name?: string
  webUrl?: string
}

export interface FetchAgentSharePointSitesResponse {
  sites: SharePointSite[]
  runs: SharePointSyncRun[]
}

export interface SharePointSyncRun {
  siteId: string
  lastRunAt: string
  synced: number
  failed: number
  skipped: number
  totalDiscovered: number
  status: AgentSharePointSyncRunStatus
}

export interface CompleteAgentSharePointConnectionRequest {
  appId: string
  continueSetupId: string
}

export interface CompleteAgentSharePointConnectionResponse {
  agentId: string
  connected: true
}

export interface SyncAgentSharePointRequest {
  siteIds?: string[]
}

export interface SyncAgentSharePointResponse {
  agentId: string
  synced: number
  failed: number
  skipped: number
  totalDiscovered: number
}

export interface SetAgentSharePointSitesRequest {
  siteIds: string[]
}

export interface SetAgentSharePointSitesResponse {
  agentId: string
  siteIds: string[]
}

export interface DisconnectAgentSharePointResponse {
  agentId: string
  disconnected: true
}

export interface FetchChatAppAgentsResponse {
  agents: Pick<Agent, "_id" | "name" | "icon" | "iconColor" | "live">[]
}

interface ConfigureAgentDeploymentChannelRequest {
  chatAppId?: string
}

interface ConfigureAgentDeploymentChannelResponse {
  success: boolean
  chatAppId: string
}

export type SyncAgentDiscordCommandsRequest =
  ConfigureAgentDeploymentChannelRequest

export interface SyncAgentDiscordCommandsResponse
  extends ConfigureAgentDeploymentChannelResponse {
  interactionsEndpointUrl: string
  inviteUrl: string
}

export type ProvisionAgentMSTeamsChannelRequest =
  ConfigureAgentDeploymentChannelRequest

export interface ProvisionAgentMSTeamsChannelResponse
  extends ConfigureAgentDeploymentChannelResponse {
  messagingEndpointUrl: string
}

export type ProvisionAgentSlackChannelRequest =
  ConfigureAgentDeploymentChannelRequest

export interface ProvisionAgentSlackChannelResponse
  extends ConfigureAgentDeploymentChannelResponse {
  messagingEndpointUrl: string
}

export interface ToggleAgentDeploymentRequest {
  enabled: boolean
}

export interface ToggleAgentDeploymentResponse {
  success: boolean
  enabled: boolean
}

export type CreateAgentRequest = Optional<
  Omit<
    Agent,
    | "_id"
    | "_rev"
    | "createdAt"
    | "updatedAt"
    | "knowledgeSources"
    | "knowledgeBases"
  >,
  "aiconfig"
>
export type CreateAgentResponse = Omit<
  Agent,
  "knowledgeSources" | "knowledgeBases"
>
export type DuplicateAgentResponse = Agent

export type UpdateAgentRequest = Omit<
  Agent,
  | "createdAt"
  | "updatedAt"
  | "_deleted"
  | "createdBy"
  | "knowledgeSources"
  | "knowledgeBases"
>
export type UpdateAgentResponse = Omit<
  Agent,
  "knowledgeSources" | "knowledgeBases"
>
