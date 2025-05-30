import { get } from "svelte/store"
import { createWebsocket } from "../../../utils"
import { SocketEvent, GridSocketEvent } from "@budibase/shared-core"
import { Store } from "../stores"
import { UIDatasource, UIUser } from "@budibase/types"

export const createGridWebsocket = (context: Store) => {
  const { rows, datasource, users, focusedCellId, definition, API } = context
  const socket = createWebsocket("/socket/grid")

  const connectToDatasource = (datasource: UIDatasource) => {
    if (!socket.connected) {
      return
    }
    // Identify which table we are editing
    const appId = API.getAppID()
    socket.emit(
      GridSocketEvent.SelectDatasource,
      {
        datasource,
        appId,
      },
      ({ users: gridUsers }: { users: UIUser[] }) => {
        users.set(gridUsers)
      }
    )
  }

  // Built-in events
  socket.on("connect", () => {
    connectToDatasource(get(datasource))
  })
  socket.on("connect_error", err => {
    console.error("Failed to connect to grid websocket:", err.message)
  })

  // User events
  socket.onOther(SocketEvent.UserUpdate, ({ user }) => {
    users.actions.updateUser(user)
  })
  socket.onOther(SocketEvent.UserDisconnect, ({ sessionId }) => {
    users.actions.removeUser(sessionId)
  })

  // Row events
  socket.onOther(GridSocketEvent.RowChange, async ({ id, row }) => {
    if (id) {
      rows.actions.replaceRow(id, row)
    } else if (row.id) {
      // Handle users table edge cased
      await rows.actions.refreshRow(row.id)
    }
  })

  // Table events
  socket.onOther(
    GridSocketEvent.DatasourceChange,
    ({ datasource: newDatasource }) => {
      // Only update definition if one exists. If the datasource was deleted
      // then we don't want to know - let the builder navigate away
      if (newDatasource) {
        definition.set(newDatasource)
      }
    }
  )
  socket.on(
    GridSocketEvent.DatasourceChange,
    ({ datasource: newDatasource }) => {
      // Listen builder renames, as these aren't handled otherwise
      if (newDatasource?.name !== get(definition)?.name) {
        definition.set(newDatasource)
      }
    }
  )

  // Change websocket connection when table changes
  datasource.subscribe(connectToDatasource)

  // Notify selected cell changes
  focusedCellId.subscribe($focusedCellId => {
    socket.emit(GridSocketEvent.SelectCell, { cellId: $focusedCellId })
  })

  return () => socket?.disconnect()
}
