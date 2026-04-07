import { auth } from "@budibase/backend-core"
import { aiRagEnabled } from "../../middleware/aiRagEnabled"
import * as ai from "../controllers/ai"
import { builderAdminRoutes, endpointGroupList } from "./endpointGroups"
import {
  completeAgentSharePointConnectionValidator,
  createAgentValidator,
  provisionAgentSlackChannelValidator,
  provisionAgentMSTeamsChannelValidator,
  setAgentSharePointSitesValidator,
  syncAgentDiscordCommandsValidator,
  syncAgentSharePointValidator,
  toggleAgentDiscordDeploymentValidator,
  toggleAgentMSTeamsDeploymentValidator,
  toggleAgentSlackDeploymentValidator,
  updateAgentValidator,
} from "./utils/validators/agent"

builderAdminRoutes
  .get("/api/agent", ai.fetchAgents)
  .post("/api/agent", createAgentValidator(), ai.createAgent)
  .put("/api/agent", updateAgentValidator(), ai.updateAgent)
  .post("/api/agent/:agentId/duplicate", ai.duplicateAgent)
  .delete("/api/agent/:agentId", ai.deleteAgent)
  .post(
    "/api/agent/:agentId/discord/sync",
    syncAgentDiscordCommandsValidator(),
    ai.syncAgentDiscordCommands
  )
  .post(
    "/api/agent/:agentId/discord/toggle",
    toggleAgentDiscordDeploymentValidator(),
    ai.toggleAgentDiscordDeployment
  )
  .post(
    "/api/agent/:agentId/ms-teams/provision",
    provisionAgentMSTeamsChannelValidator(),
    ai.provisionAgentMSTeamsChannel
  )
  .post(
    "/api/agent/:agentId/ms-teams/toggle",
    toggleAgentMSTeamsDeploymentValidator(),
    ai.toggleAgentMSTeamsDeployment
  )
  .post(
    "/api/agent/:agentId/slack/toggle",
    toggleAgentSlackDeploymentValidator(),
    ai.toggleAgentSlackDeployment
  )
  .post(
    "/api/agent/:agentId/slack/provision",
    provisionAgentSlackChannelValidator(),
    ai.provisionAgentSlackChannel
  )
  .get("/api/agent/tools", ai.fetchTools)
  .get("/api/agent/:agentId/logs", ai.fetchAgentLogs)
  .get("/api/agent/:agentId/logs/session", ai.fetchAgentLogSession)
  .get("/api/agent/:agentId/logs/:requestId", ai.fetchAgentLogDetail)

const aiRagBuilderAdminRoutes = endpointGroupList
  .group(auth.builderOrAdmin)
  .addGroupMiddleware(aiRagEnabled)

aiRagBuilderAdminRoutes
  .get("/api/agent/:agentId/files", ai.fetchAgentFiles)
  .post("/api/agent/:agentId/files", ai.uploadAgentFile)
  .delete("/api/agent/:agentId/files/:fileId", ai.deleteAgentFile)
  .post(
    "/api/agent/:agentId/sharepoint/connect/complete",
    completeAgentSharePointConnectionValidator(),
    ai.completeAgentSharePointConnection
  )
  .get("/api/agent/:agentId/sharepoint/sites", ai.fetchAgentSharePointSites)
  .put(
    "/api/agent/:agentId/sharepoint/sites",
    setAgentSharePointSitesValidator(),
    ai.setAgentSharePointSites
  )
  .delete("/api/agent/:agentId/sharepoint", ai.disconnectAgentSharePoint)
  .post(
    "/api/agent/:agentId/sharepoint/sync",
    syncAgentSharePointValidator(),
    ai.syncAgentSharePoint
  )
