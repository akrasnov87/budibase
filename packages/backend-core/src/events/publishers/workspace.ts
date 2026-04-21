import { publishEvent } from "../events"
import {
  Event,
  WorkspaceApp,
  WorkspaceAppCreatedEvent,
  WorkspaceAppDeletedEvent,
  WorkspaceAppUpdatedEvent,
} from "@budibase/types"

async function appCreated(workspaceApp: WorkspaceApp, appId: string) {
  const properties: WorkspaceAppCreatedEvent = {
    workspaceAppId: workspaceApp._id as string,
    audited: {
      name: workspaceApp.name,
    },
    appId,
  }
  await publishEvent(Event.WORKSPACE_APP_CREATED, properties)
}

async function appUpdated(workspaceApp: WorkspaceApp, appId: string) {
  const properties: WorkspaceAppUpdatedEvent = {
    workspaceAppId: workspaceApp._id as string,
    audited: {
      name: workspaceApp.name,
    },
    appId,
  }
  await publishEvent(Event.WORKSPACE_APP_UPDATED, properties)
}

async function appDeleted(workspaceApp: WorkspaceApp, appId: string) {
  const properties: WorkspaceAppDeletedEvent = {
    workspaceAppId: workspaceApp._id as string,
    audited: {
      name: workspaceApp.name,
    },
    appId,
  }
  await publishEvent(Event.WORKSPACE_APP_DELETED, properties)
}

export default {
  appCreated,
  appUpdated,
  appDeleted,
}
