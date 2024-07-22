import { writable, get } from "svelte/store"
import { API } from "api"
import { licensing } from "stores/portal"

export function createGroupsStore() {
  const { subscribe, update, set } = writable([])

  function setGroups(groups) {
    set(groups)
  }

  const actions = {
    fetch: async () => {
      if (get(licensing).groupsEnabled) {
        const groups = await API.getGroups()
        setGroups(groups.data)
      }
    }
  }

  return {
    subscribe,
    ...actions,
  }
}

export const groups = createGroupsStore()
