type MSTeamsIdRef = { id?: string }

export interface MSTeamsChannelData {
  channel?: MSTeamsIdRef
  team?: MSTeamsIdRef
  tenant?: MSTeamsIdRef
}

export interface MSTeamsChannelAccount {
  id?: string
  aadObjectId?: string
  name?: string
  tenantId?: string
}

export interface MSTeamsConversationAccount {
  id?: string
  conversationType?: string
}

export interface MSTeamsActivity {
  type?: string
  text?: string
  channelId?: string
  serviceUrl?: string
  from?: MSTeamsChannelAccount
  conversation?: MSTeamsConversationAccount
  channelData?: MSTeamsChannelData
}

export interface MSTeamsConversationScope {
  chatAppId: string
  agentId: string
  conversationId: string
  channelId?: string
  externalUserId: string
}

export type MSTeamsCommand = "ask" | "new" | "unsupported"

export interface ResolvedMSTeamsIntegration {
  appId: string
  appPassword: string
  tenantId?: string
  chatAppId?: string
}
