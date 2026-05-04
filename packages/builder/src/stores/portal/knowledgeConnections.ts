import {
  AgentKnowledgeSourceConnectionAuthType,
  AgentKnowledgeSourceConnectionSummary,
  AgentKnowledgeSourceType,
} from "@budibase/types"
import { API } from "@/api"
import { BudiStore } from "../BudiStore"

interface KnowledgeConnectionsState {
  connections: AgentKnowledgeSourceConnectionSummary[]
  loaded: boolean
}

class KnowledgeConnectionsStore extends BudiStore<KnowledgeConnectionsState> {
  constructor() {
    super({
      connections: [],
      loaded: false,
    })
  }

  fetch = async () => {
    const response = await API.fetchAgentKnowledgeSourceConnections()
    this.update(state => {
      state.connections = response.connections || []
      state.loaded = true
      return state
    })
    return response.connections || []
  }

  create = async (input: {
    sourceType: AgentKnowledgeSourceType.SHAREPOINT
    authType: AgentKnowledgeSourceConnectionAuthType.CLIENT_CREDENTIALS
    account: string
    tenantId: string
    tokenEndpoint: string
    clientId: string
    clientSecret: string
    scope?: string
  }) => {
    await API.createAgentKnowledgeSourceConnection(input)
    await this.fetch()
  }
}

export const knowledgeConnectionsStore = new KnowledgeConnectionsStore()
