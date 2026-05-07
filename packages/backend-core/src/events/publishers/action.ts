import { publishEvent } from "../events"
import {
  Event,
  ActionAutomationStepExecuted,
  ActionAutomationStepFailed,
  ActionCrudExecuted,
  ActionCrudFailed,
  ActionAiAgentExecuted,
  ActionAiAgentFailed,
} from "@budibase/types"

async function automationStepExecuted(
  action: ActionAutomationStepExecuted,
  timestamp?: string | number
) {
  await publishEvent(Event.ACTION_AUTOMATION_STEP_EXECUTED, action, timestamp)
}

async function automationStepFailed(action: ActionAutomationStepFailed) {
  await publishEvent(Event.ACTION_AUTOMATION_STEP_FAILED, action)
}

async function crudExecuted(
  action: ActionCrudExecuted,
  timestamp?: string | number
) {
  await publishEvent(Event.ACTION_CRUD_EXECUTED, action, timestamp)
}

function crudFailed(action: ActionCrudFailed) {
  publishEvent(Event.ACTION_CRUD_FAILED, action).catch(err => {
    console.error("crudFailed telemetry failed", { action, err })
  })
}

function aiAgentExecuted(
  action: ActionAiAgentExecuted,
  timestamp?: string | number
) {
  publishEvent(Event.ACTION_AI_AGENT_EXECUTED, action, timestamp).catch(err => {
    console.error("aiAgentExecuted telemetry failed", { action, err })
  })
}

function aiAgentFailed(action: ActionAiAgentFailed) {
  publishEvent(Event.ACTION_AI_AGENT_FAILED, action).catch(err => {
    console.error("aiAgentFailed telemetry failed", { action, err })
  })
}

export default {
  aiAgentExecuted,
  aiAgentFailed,
  automationStepExecuted,
  automationStepFailed,
  crudExecuted,
  crudFailed,
}
