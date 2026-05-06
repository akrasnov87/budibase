import {
  fetchSharePointSitesByDatasourceAuthConfig,
  isAllowedSharePointNextLink,
} from "./connection"
import { type Datasource, OAuth2GrantType, RestAuthType } from "@budibase/types"
import sdk from "../../../.."

describe("isAllowedSharePointNextLink", () => {
  it("accepts Graph v1.0 root and nested paths", () => {
    expect(
      isAllowedSharePointNextLink(
        "https://graph.microsoft.com/v1.0/sites?$top=200"
      )
    ).toBe(true)
    expect(
      isAllowedSharePointNextLink(
        "https://graph.microsoft.com/v1.0/drives/abc/items/def/children?$skiptoken=x"
      )
    ).toBe(true)
  })

  it("rejects non-https protocol", () => {
    expect(
      isAllowedSharePointNextLink("http://graph.microsoft.com/v1.0/sites")
    ).toBe(false)
  })

  it("rejects non-Graph hosts", () => {
    expect(isAllowedSharePointNextLink("https://example.com/v1.0/sites")).toBe(
      false
    )
    expect(
      isAllowedSharePointNextLink("https://graph.microsoft.com.evil.com/v1.0")
    ).toBe(false)
  })

  it("rejects paths outside Graph v1.0", () => {
    expect(
      isAllowedSharePointNextLink("https://graph.microsoft.com/beta/sites")
    ).toBe(false)
    expect(
      isAllowedSharePointNextLink("https://graph.microsoft.com/v1.0evil/sites")
    ).toBe(false)
  })

  it("rejects invalid URLs", () => {
    expect(isAllowedSharePointNextLink("not-a-url")).toBe(false)
  })
})

describe("fetchSharePointSitesByDatasourceAuthConfig (token-backed)", () => {
  const bearerToken = "Bearer token"
  const datasourceId = "datasource_1"
  const authConfigId = "auth_1"

  const mockDatasource = () => {
    const datasource = {
      _id: datasourceId,
      type: "datasource",
      source: "REST",
      config: {
        authConfigs: [
          {
            _id: authConfigId,
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
    } as Datasource

    jest.spyOn(sdk.datasources, "get").mockResolvedValue(datasource)
  }

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("uses Graph search query and maps displayName with webUrl", async () => {
    mockDatasource()
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        value: [
          {
            id: "site-1",
            displayName: "Site One",
            name: "Ignored Name",
            webUrl: "https://contoso.sharepoint.com/sites/site-1",
          },
        ],
      }),
    } as Response)

    const sites = await fetchSharePointSitesByDatasourceAuthConfig(
      datasourceId,
      authConfigId
    )

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://graph.microsoft.com/v1.0/sites?"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: bearerToken,
        }),
      })
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(sites).toEqual([
      {
        id: "site-1",
        name: "Site One",
        webUrl: "https://contoso.sharepoint.com/sites/site-1",
      },
    ])
  })

  it("paginates and deduplicates by site id", async () => {
    mockDatasource()
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [
            {
              id: "site-1",
              displayName: "Site One",
              webUrl: "https://contoso.sharepoint.com/sites/site-1",
            },
            {
              id: "site-2",
              displayName: "Site Two",
              webUrl: "https://contoso.sharepoint.com/sites/site-2",
            },
          ],
          "@odata.nextLink":
            "https://graph.microsoft.com/v1.0/sites?$skiptoken=abc",
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [
            {
              id: "site-2",
              displayName: "Site Two Updated",
              webUrl: "https://contoso.sharepoint.com/sites/site-2",
            },
            {
              id: "site-3",
              displayName: "Site Three",
              webUrl: "https://contoso.sharepoint.com/sites/site-3",
            },
          ],
        }),
      } as Response)

    const sites = await fetchSharePointSitesByDatasourceAuthConfig(
      datasourceId,
      authConfigId
    )

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining(
        "https://graph.microsoft.com/v1.0/sites?search=*&$top=200&$select=id,displayName,name,webUrl"
      ),
      expect.any(Object)
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(
        "https://graph.microsoft.com/v1.0/sites?$skiptoken=abc"
      ),
      expect.any(Object)
    )
    expect(sites).toEqual([
      {
        id: "site-1",
        name: "Site One",
        webUrl: "https://contoso.sharepoint.com/sites/site-1",
      },
      {
        id: "site-3",
        name: "Site Three",
        webUrl: "https://contoso.sharepoint.com/sites/site-3",
      },
      {
        id: "site-2",
        name: "Site Two Updated",
        webUrl: "https://contoso.sharepoint.com/sites/site-2",
      },
    ])
  })

  it("throws access denied error for 403", async () => {
    mockDatasource()
    jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({}),
    } as Response)

    await expect(
      fetchSharePointSitesByDatasourceAuthConfig(datasourceId, authConfigId)
    ).rejects.toEqual(
      expect.objectContaining({
        message:
          "Access denied by Microsoft Graph. Ensure SharePoint application permissions are granted.",
        status: 400,
      })
    )
  })

  it("throws authentication failed error for 401", async () => {
    mockDatasource()
    jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response)

    await expect(
      fetchSharePointSitesByDatasourceAuthConfig(datasourceId, authConfigId)
    ).rejects.toEqual(
      expect.objectContaining({
        message:
          "Authentication failed with Microsoft Graph. Verify SharePoint application credentials and try again.",
        status: 400,
      })
    )
  })
})

describe("fetchSharePointSitesByDatasourceAuthConfig", () => {
  const datasourceId = "datasource_1"
  const authConfigId = "auth_1"

  const mockDatasource = () => {
    const datasource = {
      _id: datasourceId,
      type: "datasource",
      source: "REST",
      config: {
        authConfigs: [
          {
            _id: authConfigId,
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
    } as Datasource

    jest.spyOn(sdk.datasources, "get").mockResolvedValue(datasource)
  }

  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  it("uses app-permission guidance for client credentials 403", async () => {
    mockDatasource()
    jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({}),
    } as Response)

    await expect(
      fetchSharePointSitesByDatasourceAuthConfig(datasourceId, authConfigId)
    ).rejects.toEqual(
      expect.objectContaining({
        message:
          "Access denied by Microsoft Graph. Ensure SharePoint application permissions are granted.",
      })
    )
  })

  it("uses credential guidance for client credentials 401", async () => {
    mockDatasource()
    jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response)

    await expect(
      fetchSharePointSitesByDatasourceAuthConfig(datasourceId, authConfigId)
    ).rejects.toEqual(
      expect.objectContaining({
        message:
          "Authentication failed with Microsoft Graph. Verify SharePoint application credentials and try again.",
      })
    )
  })
})
