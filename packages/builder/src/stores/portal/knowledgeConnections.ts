import { DerivedBudiStore } from "../BudiStore"
import { Datasource, OAuth2RestAuthConfig } from "@budibase/types"
import { derived, get, Writable } from "svelte/store"
import { datasources } from "../builder/datasources"

interface KnowledgeConnection {
  _id: string
  datasourceId: string
  authConfigId: string
  sourceType: "sharepoint"
  authType: "client_credentials"
  account: string
}

interface KnowledgeConnectionsState {
  connections: KnowledgeConnection[]
}

class KnowledgeConnectionsStore extends DerivedBudiStore<
  KnowledgeConnectionsState,
  KnowledgeConnectionsState
> {
  constructor() {
    const makeDerivedStore = (_store: Writable<KnowledgeConnectionsState>) =>
      derived([datasources], ([$datasources]) => {
        const list = $datasources.rawList as Datasource[]
        const connections = list.flatMap(datasource => {
          const authConfigs = (datasource.config?.authConfigs ||
            []) as OAuth2RestAuthConfig[]
          return authConfigs.map(config => ({
            _id: `${datasource._id}:${config._id}`,
            datasourceId: datasource._id!,
            authConfigId: config._id,
            sourceType: "sharepoint" as const,
            authType: "client_credentials" as const,
            account: config.name || datasource.name || "OAuth2 connection",
          }))
        })
        return { connections }
      })

    super({ connections: [] }, makeDerivedStore)
  }

  get() {
    return get(this.derivedStore)
  }
}

export const knowledgeConnectionsStore = new KnowledgeConnectionsStore()
