import { ai, quotas } from "@budibase/pro"
import {
  Agent,
  AgentMessageMetadata,
  ChatConversationRequest,
  ContextUser,
} from "@budibase/types"
import {
  extractReasoningMiddleware,
  stepCountIs,
  tool,
  ToolLoopAgent,
  type StreamTextResult,
  type ToolSet,
  wrapLanguageModel,
} from "ai"
import { z } from "zod"
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
  getUsedKnowledgeSourcesMetadata: () => AgentMessageMetadata["ragSources"]
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
  const retrievedKnowledgeSourceById = new Map<
    string,
    NonNullable<AgentMessageMetadata["ragSources"]>[number]
  >()
  const usedKnowledgeSourceById = new Map<
    string,
    NonNullable<AgentMessageMetadata["ragSources"]>[number]
  >()
  const setUsedKnowledgeSources = (
    accepted?: AgentMessageMetadata["ragSources"]
  ) => {
    usedKnowledgeSourceById.clear()
    for (const source of accepted || []) {
      if (!source?.sourceId) {
        continue
      }
      usedKnowledgeSourceById.set(source.sourceId, source)
    }
  }
  const reportUsedSourcesTool = tool({
    description:
      "Report the specific knowledge sources that were actually used in the final answer. Only sourceIds returned by search_knowledge in this run are valid.",
    inputSchema: z.object({
      sourceIds: z.array(z.string().trim().min(1)).default([]),
    }),
    execute: async ({ sourceIds }) => {
      const accepted: NonNullable<AgentMessageMetadata["ragSources"]> = []
      const ignored: string[] = []

      for (const sourceId of sourceIds || []) {
        const source = retrievedKnowledgeSourceById.get(sourceId)
        if (!source) {
          ignored.push(sourceId)
          continue
        }
        accepted.push(source)
      }
      setUsedKnowledgeSources(accepted)

      return {
        accepted,
        acceptedCount: accepted.length,
        ignored,
        ignoredCount: ignored.length,
      }
    },
  })
  if (tools.search_knowledge) {
    tools.report_used_sources = reportUsedSourcesTool
  }

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
    getUsedKnowledgeSourcesMetadata: () =>
      Array.from(usedKnowledgeSourceById.values()),
    toolDisplayNames: promptAndTools.toolDisplayNames,
    stream: async ({ onFinish, pendingToolCalls } = {}) =>
      await agentRunner.stream({
        messages: modelMessages,
        async onStepFinish({ content, toolCalls, toolResults, response }) {
          sessionLogIndexer.addRequestId(response?.id)
          if (pendingToolCalls) {
            updatePendingToolCalls(pendingToolCalls, toolCalls, toolResults)
          }

          for (const toolResult of toolResults) {
            if (
              toolResult.toolName === "search_knowledge" &&
              !toolResult.preliminary
            ) {
              const output = toolResult.output as
                | { sources?: AgentMessageMetadata["ragSources"] }
                | undefined
              for (const source of output?.sources || []) {
                if (!source?.sourceId) {
                  continue
                }
                retrievedKnowledgeSourceById.set(source.sourceId, source)
              }
            }
            if (
              toolResult.toolName === "report_used_sources" &&
              !toolResult.preliminary
            ) {
              const output = toolResult.output as
                | { accepted?: AgentMessageMetadata["ragSources"] }
                | undefined
              setUsedKnowledgeSources(output?.accepted)
            }
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
