import {
  type Datasource,
  OAuth2GrantType,
  RestAuthType,
} from "@budibase/types"
import { fetchSharePointSitesByDatasourceAuthConfig } from "./connection"
import sdk from "../../../.."

describe("fetchSharePointSitesByDatasourceAuthConfig app token pagination", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("caps app-token pagination when @odata.nextLink keeps chaining", async () => {
    jest.spyOn(sdk.datasources, "get").mockResolvedValue({
      _id: "datasource_1",
      type: "datasource",
      source: "REST",
      config: {
        authConfigs: [
          {
            _id: "auth_1",
            type: RestAuthType.OAUTH2,
            url: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            clientId: "client-id",
            clientSecret: "secret",
            grantType: OAuth2GrantType.CLIENT_CREDENTIALS,
            accessToken: "token",
            tokenType: "Bearer",
            expiresAt: Date.now() + 60_000,
          },
        ],
      },
    } as Datasource)

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

    const sites = await fetchSharePointSitesByDatasourceAuthConfig(
      "datasource_1",
      "auth_1"
    )

    expect(fetchMock).toHaveBeenCalledTimes(50)
    expect(sites).toEqual([])
  })
})
