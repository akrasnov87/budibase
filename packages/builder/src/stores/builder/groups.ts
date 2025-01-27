import { writable, get } from "svelte/store"
import { API } from "@/api"
import { licensing } from "@/stores/portal"

export function createGroupsStore() {
  const { subscribe, update, set } = writable([])

  function setGroups(groups:any) {
    set(groups)
  }

  const actions = {
    fetch: async () => {
      if (get(licensing).groupsEnabled) {
        const groups:any = await API.getGroups()
        setGroups(groups)
      }
    }
  }

  return {
    subscribe,
    ...actions,
  }
}

export const groups = createGroupsStore()
