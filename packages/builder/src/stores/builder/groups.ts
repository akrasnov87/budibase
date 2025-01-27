import { derived, get, type Writable } from "svelte/store"
import { API } from "@/api"
import { licensing } from "@/stores/portal"
import { BudiStore } from "../BudiStore"
import { UserGroup } from "@budibase/types"

export class UserGroupStore extends BudiStore<UserGroup[]> {
  constructor() {
    super([])
  }

  setGroups = (groups: UserGroup[]) => {
    this.set(groups)
  }

  fetch = async () => {
    if (get(licensing).groupsEnabled) {
      const groups = await API.getGroups()
      this.setGroups(groups)
    }
  }
}

// export function createGroupsStore() {
//   const { subscribe, update, set } = writable([])

//   function setGroups(groups:any) {
//     set(groups)
//   }

//   const actions = {
//     fetch: async () => {
//       if (get(licensing).groupsEnabled) {
//         const groups:any = await API.getGroups()
//         debugger;
//         setGroups(groups)
//       }
//     }
//   }

//   return {
//     subscribe,
//     ...actions,
//   }
// }

export const groups = new UserGroupStore()
