import { ai, quotas } from "@budibase/pro"
import { Agent, ChatConversationRequest, ContextUser } from "@budibase/types"
import {
  extractReasoningMiddleware,
  stepCountIs,
  ToolLoopAgent,
  type StreamTextResult,
  type ToolSet,
  wrapLanguageModel,
} from "ai"
import sdk from "../../.."
import { createSessionLogIndexer } from "../agentLogs"
import {
  findLatestUserQuestion,
  prepareModelMessages,
} from "../chatConversations"
import { updatePendingToolCalls } from "./utils"

interface PrepareAgentChatRunParams {
  agent: Agent
  agentId: string
  chat: ChatConversationRequest
  errorLabel: string
  sessionId: string
  user: ContextUser
}

export interface AgentChatRun {
  latestQuestion: string
  sessionLogIndexer: ReturnType<typeof createSessionLogIndexer>
  stream: (
    options?: AgentChatStreamOptions
  ) => Promise<StreamTextResult<ToolSet, never>>
  toolDisplayNames: Record<string, string>
}

export interface AgentChatStreamOptions {
  onFinish?: (responseId?: string) => void | Promise<void>
  pendingToolCalls?: Set<string>
}

export const prepareAgentChatRun = async ({
  agent,
  agentId,
  chat,
  errorLabel,
  sessionId,
  user,
}: PrepareAgentChatRunParams): Promise<AgentChatRun> => {
  const latestQuestion = findLatestUserQuestion(chat)
  const sessionLogIndexer = createSessionLogIndexer({
    agentId,
    sessionId,
    firstInput: latestQuestion,
    errorLabel,
  })

  const [promptAndTools, llm, modelMessages] = await Promise.all([
    sdk.ai.agents.buildPromptAndTools(agent, {
      baseSystemPrompt: ai.agentSystemPrompt(user),
      includeGoal: false,
    }),
    sdk.ai.llm.createLLM(agent.aiconfig, sessionId, undefined, agentId),
    prepareModelMessages(chat.messages),
  ])

  const tools = promptAndTools.tools
  const hasTools = Object.keys(tools).length > 0
  const agentRunner = new ToolLoopAgent({
    model: wrapLanguageModel({
      model: llm.chat,
      middleware: extractReasoningMiddleware({
        tagName: "think",
      }),
    }),
    instructions: promptAndTools.systemPrompt || undefined,
    tools: hasTools ? tools : undefined,
    toolChoice: hasTools ? "auto" : "none",
    stopWhen: stepCountIs(30),
    providerOptions: llm.providerOptions?.(hasTools),
  })

  return {
    latestQuestion,
    sessionLogIndexer,
    toolDisplayNames: promptAndTools.toolDisplayNames,
    stream: async ({ onFinish, pendingToolCalls } = {}) =>
      await agentRunner.stream({
        messages: modelMessages,
        async onStepFinish({ content, toolCalls, toolResults, response }) {
          sessionLogIndexer.addRequestId(response?.id)
          if (pendingToolCalls) {
            updatePendingToolCalls(pendingToolCalls, toolCalls, toolResults)
          }

          for (const _ of toolResults) {
            await quotas.addAction(async () => {})
          }

          if (!pendingToolCalls) {
            return
          }

          for (const part of content) {
            if (part.type === "tool-error") {
              pendingToolCalls.delete(part.toolCallId)
            }
          }
        },
        async onFinish({ response }) {
          sessionLogIndexer.addRequestId(response?.id)
          await onFinish?.(response?.id)
        },
      }),
  }
}
