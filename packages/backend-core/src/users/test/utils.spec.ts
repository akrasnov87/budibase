import { User, UserGroup } from "@budibase/types"
import { generator, structures } from "../../../tests"
import { DBTestConfiguration } from "../../../tests/extra"
import { getGlobalDB } from "../../context"
import { isCreatorSync, creatorsInList } from "../utils"

const config = new DBTestConfiguration()

describe("Users", () => {
  it("User is a creator if it is configured as a global builder", () => {
    const user: User = structures.users.user({ builder: { global: true } })
    expect(isCreatorSync(user, [])).toBe(true)
  })

  it("User is a creator if it is configured as a global admin", () => {
    const user: User = structures.users.user({ admin: { global: true } })
    expect(isCreatorSync(user, [])).toBe(true)
  })

  it("User is a creator if it is configured with creator permission", () => {
    const user: User = structures.users.user({ builder: { creator: true } })
    expect(isCreatorSync(user, [])).toBe(true)
  })

  it("User is a creator if it is a builder in some application", () => {
    const user: User = structures.users.user({ builder: { apps: ["app1"] } })
    expect(isCreatorSync(user, [])).toBe(true)
  })

  it("User is a creator if it has CREATOR permission in some application", () => {
    const user: User = structures.users.user({ roles: { app1: "CREATOR" } })
    expect(isCreatorSync(user, [])).toBe(true)
  })

  it("User is a not a creator if it has ADMIN permission in some application", () => {
    const user: User = structures.users.user({ roles: { app1: "ADMIN" } })
    expect(isCreatorSync(user, [])).toBe(false)
  })

  it("User is a not a creator if it remains to a group with ADMIN permissions", async () => {
    const usersInGroup = 10
    const groupId = "gr_17abffe89e0b40268e755b952f101a59"
    const group: UserGroup = {
      ...structures.userGroups.userGroup(),
      ...{ _id: groupId, roles: { app1: "ADMIN" } },
    }
    const users: User[] = []
    for (let i = 0; i < usersInGroup; i++) {
      const userId = `us_${generator.guid()}`
      const user: User = structures.users.user({
        _id: userId,
        userGroups: [groupId],
      })
      users.push(user)
    }

    await config.doInTenant(async () => {
      const db = getGlobalDB()
      await db.put(group)
      for (let user of users) {
        await db.put(user)
        const creator = (await creatorsInList([user]))[0]
        expect(creator).toBe(false)
      }
    })
  })
})
