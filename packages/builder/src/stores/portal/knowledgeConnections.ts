import {
  AgentKnowledgeSourceConnection,
  AgentKnowledgeSourceConnectionAuthType,
  AgentKnowledgeSourceType,
} from "@budibase/types"
import { API } from "@/api"
import { BudiStore } from "../BudiStore"

interface KnowledgeConnectionsState {
  connections: AgentKnowledgeSourceConnection[]
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

  updateConnection = async (
    connectionId: string,
    input: {
      account: string
      tenantId: string
      tokenEndpoint: string
      clientId: string
      clientSecret: string
      scope?: string
    }
  ) => {
    await API.updateAgentKnowledgeSourceConnection(connectionId, input)
    await this.fetch()
  }

  validate = async (input: {
    sourceType: AgentKnowledgeSourceType.SHAREPOINT
    authType: AgentKnowledgeSourceConnectionAuthType.CLIENT_CREDENTIALS
    tenantId: string
    tokenEndpoint: string
    clientId: string
    clientSecret: string
    scope?: string
  }) => {
    return await API.validateAgentKnowledgeSourceConnection(input)
  }
}

export const knowledgeConnectionsStore = new KnowledgeConnectionsStore()
