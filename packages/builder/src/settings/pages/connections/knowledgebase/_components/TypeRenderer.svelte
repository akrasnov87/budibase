<script lang="ts">
  import { Tags, Tag } from "@budibase/bbui"
  import type { AgentKnowledgeSourceConnectionAuthType } from "@budibase/types"

  export let row: {
    id: string
    authType: AgentKnowledgeSourceConnectionAuthType
  }

  const authTypeLabels: Record<AgentKnowledgeSourceConnectionAuthType, string> =
    {
      client_credentials: "Client Credentials",
      delegated_oauth: "OAuth2",
    }
</script>

<Tags>
  <Tag>{authTypeLabels[row.authType]}</Tag>
</Tags>
