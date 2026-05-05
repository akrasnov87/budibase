import { env, features } from "@budibase/backend-core"
import { AgentKnowledgeSourceType, FeatureFlag } from "@budibase/types"
import sdk from "../../../../sdk"
import { createKnowledgeSourceConnection } from "../../../../sdk/workspace/ai/knowledgeSources"
import { installHttpMocking, resetHttpMocking } from "../../../../tests/jestEnv"
import TestConfiguration from "../../../../tests/utilities/TestConfiguration"

describe("sharepoint oauth callback", () => {
  const config = new TestConfiguration()
  let originalClientId: string | undefined
  let originalClientSecret: string | undefined
  let originalTenantId: string | undefined
  let originalScope: string | undefined

  beforeAll(() => {
    originalClientId = env.MICROSOFT_CLIENT_ID
    originalClientSecret = env.MICROSOFT_CLIENT_SECRET
    originalTenantId = env.MICROSOFT_TENANT_ID
    originalScope = env.RAG_SHAREPOINT_DEFAULT_SCOPE
    env._set("MICROSOFT_CLIENT_ID", "client-id")
    env._set("MICROSOFT_CLIENT_SECRET", "client-secret")
    env._set("MICROSOFT_TENANT_ID", "common")
    env._set(
      "RAG_SHAREPOINT_DEFAULT_SCOPE",
      "offline_access User.Read Sites.Read.All"
    )
    installHttpMocking()
  })

  afterAll(async () => {
    await resetHttpMocking()
    config.end()
    env._set("MICROSOFT_CLIENT_ID", originalClientId)
    env._set("MICROSOFT_CLIENT_SECRET", originalClientSecret)
    env._set("MICROSOFT_TENANT_ID", originalTenantId)
    env._set("RAG_SHAREPOINT_DEFAULT_SCOPE", originalScope)
  })

  beforeEach(async () => {
    await resetHttpMocking()
    installHttpMocking()
    await config.newTenant()
    jest.restoreAllMocks()
  })

  it("stores oauth expiry with a 60 second safety buffer", async () => {
    await features.testutils.withFeatureFlags(
      config.getTenantId(),
      { [FeatureFlag.AI_RAG]: true },
      async () => {
        const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1_000_000)

        const connectionId = await config.doInContext(
          config.getDevWorkspaceId(),
          async () => {
            const connection = await createKnowledgeSourceConnection({
              sourceType: AgentKnowledgeSourceType.SHAREPOINT,
              account: "existing@budibase.com",
              tokenEndpoint:
                "https://login.microsoftonline.com/common/oauth2/v2.0/token",
              accessToken: "old-access-token",
              refreshToken: "old-refresh-token",
              tokenType: "Bearer",
              expiresAt: Date.now() + 60_000,
              clientId: "client-id",
              clientSecret: "client-secret",
            })
            return connection._id!
          }
        )

        const headers = config.defaultHeaders()
        const connectResponse = await config
          .getRequest()!
          .get("/api/agent/knowledge-sources/sharepoint/connect")
          .query({
            appId: config.getDevWorkspaceId(),
            connectionId,
            returnPath: `/builder/workspace/${config.getDevWorkspaceId()}`,
          })
          .set(headers)
          .expect(302)

        const authorizeLocation = String(connectResponse.headers.location)
        const state = new URL(authorizeLocation).searchParams.get("state")
        expect(state).toBeTruthy()

        const tokenPool = installHttpMocking().get(
          "https://login.microsoftonline.com"
        )
        tokenPool
          .intercept({
            method: "POST",
            path: "/common/oauth2/v2.0/token",
          })
          .reply(200, {
            access_token: "new-access-token",
            refresh_token: "new-refresh-token",
            expires_in: 3600,
            token_type: "Bearer",
          })

        const graphPool = installHttpMocking().get(
          "https://graph.microsoft.com"
        )
        graphPool
          .intercept({
            method: "GET",
            path: "/v1.0/me?$select=displayName,mail,userPrincipalName",
          })
          .reply(200, {
            mail: "test@example.com",
          })

        const callbackHeaders = {
          Host: config.tenantHost(),
          Cookie: connectResponse.headers["set-cookie"],
        }

        await config
          .getRequest()!
          .get("/api/agent/knowledge-sources/sharepoint/callback")
          .query({
            state,
            code: "oauth-code",
          })
          .set(callbackHeaders)
          .expect(302)

        const updatedConnection = await config.doInContext(
          config.getDevWorkspaceId(),
          async () => {
            return await sdk.ai.knowledgeSources.getKnowledgeSourceConnection(
              connectionId
            )
          }
        )

        expect(updatedConnection?.expiresAt).toBe(
          1_000_000 + (3600 - 60) * 1000
        )

        nowSpy.mockRestore()
      }
    )
  })
})
