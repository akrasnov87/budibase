import { middleware } from "@budibase/pro"
import * as ai from "../controllers/ai"
import { builderAdminRoutes, endpointGroupList } from "./endpointGroups"
import { generateAgentInstructionsValidator } from "./utils/validators/agent"
import {
  createAIConfigValidator,
  updateAIConfigValidator,
} from "./utils/validators/aiConfig"
import { auth } from "@budibase/backend-core"
import { aiRagEnabled } from "../../middleware/aiRagEnabled"

export const licensedRoutes = endpointGroupList.group(middleware.licenseAuth)

builderAdminRoutes
  .post(
    "/api/ai/agent-instructions",
    generateAgentInstructionsValidator(),
    ai.generateAgentInstructions
  )
  .post("/api/ai/tables", ai.generateTables)
  .get("/api/configs", ai.fetchAIConfigs)
  .post("/api/configs", createAIConfigValidator(), ai.createAIConfig)
  .put("/api/configs", updateAIConfigValidator(), ai.updateAIConfig)
  .delete("/api/configs/:id", ai.deleteAIConfig)
  .post("/api/ai/cron", ai.generateCronExpression)
  .post("/api/ai/js", ai.generateJs)

const aiRagBuilderAdminRoutes = endpointGroupList
  .group(auth.builderOrAdmin)
  .addGroupMiddleware(aiRagEnabled)
aiRagBuilderAdminRoutes
  .get("/api/agent/:agentId/files", ai.fetchAgentFiles)
  .post("/api/agent/:agentId/files", ai.uploadAgentFile)
  .delete("/api/agent/:agentId/files/:fileId", ai.deleteAgentFile)

builderAdminRoutes.get("/api/configs/providers", ai.fetchAIProviders)

// these are Budibase AI routes
licensedRoutes
  /** @deprecated Use the openai compatible /api/ai/chat/completions instead */
  .post("/api/ai/chat", ai.chatCompletion)
  .post("/api/ai/chat/completions", ai.chatCompletionV2)
  .get("/api/ai/quotas", ai.getAIQuotaUsage)
  .post("/api/ai/upload-file", ai.uploadFile)
