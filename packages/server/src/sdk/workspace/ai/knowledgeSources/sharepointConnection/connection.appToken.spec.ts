const mockGetKnowledgeSourceConnection = jest.fn()

jest.mock("..", () => ({
  getKnowledgeSourceConnection: (...args: any[]) =>
    mockGetKnowledgeSourceConnection(...args),
  updateKnowledgeSourceConnection: jest.fn(),
}))

import {
  AgentKnowledgeSourceConnectionAuthType,
  AgentKnowledgeSourceType,
} from "@budibase/types"
import { fetchSharePointSitesByConnection } from "./connection"

describe("fetchSharePointSitesByConnection app token pagination", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetKnowledgeSourceConnection.mockResolvedValue({
      _id: "agentknowledgeconn_1",
      sourceType: AgentKnowledgeSourceType.SHAREPOINT,
      authType: AgentKnowledgeSourceConnectionAuthType.CLIENT_CREDENTIALS,
      account: "app-conn",
      tokenEndpoint:
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      clientId: "client-id",
      clientSecret: "client-secret",
      accessToken: "access-token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60_000,
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("caps app-token pagination when @odata.nextLink keeps chaining", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch").mockImplementation(
      async input =>
        ({
          ok: true,
          status: 200,
          json: async () => ({
            value: [],
            "@odata.nextLink": input.toString(),
          }),
        }) as Response
    )

    const sites = await fetchSharePointSitesByConnection("agentknowledgeconn_1")

    expect(fetchMock).toHaveBeenCalledTimes(50)
    expect(sites).toEqual([])
  })
})
