import { publishEvent } from "../events"
import {
  Agent,
  Event,
  AIConfigCreatedEvent,
  AIConfigUpdatedEvent,
  AIAgentCreatedEvent,
  AIAgentUpdatedEvent,
  AIAgentDeletedEvent,
} from "@budibase/types"

async function configCreated(timestamp?: string | number) {
  const properties: AIConfigCreatedEvent = {}
  await publishEvent(Event.AI_CONFIG_CREATED, properties, timestamp)
}

async function configUpdated() {
  const properties: AIConfigUpdatedEvent = {}
  await publishEvent(Event.AI_CONFIG_UPDATED, properties)
}

async function agentCreated(agent: Agent) {
  const properties: AIAgentCreatedEvent = {
    agentId: agent._id as string,
    audited: { name: agent.name },
  }
  await publishEvent(Event.AI_AGENT_CREATED, properties)
}

async function agentUpdated(agent: Agent) {
  const properties: AIAgentUpdatedEvent = {
    agentId: agent._id as string,
    audited: { name: agent.name },
  }
  await publishEvent(Event.AI_AGENT_UPDATED, properties)
}

async function agentDeleted(agent: Agent) {
  const properties: AIAgentDeletedEvent = {
    agentId: agent._id as string,
    audited: { name: agent.name },
  }
  await publishEvent(Event.AI_AGENT_DELETED, properties)
}

export default {
  configCreated,
  configUpdated,
  agentCreated,
  agentUpdated,
  agentDeleted,
}
