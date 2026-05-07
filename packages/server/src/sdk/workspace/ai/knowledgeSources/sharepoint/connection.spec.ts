import {
  collectSharePointFilesRecursive,
  fetchSharePointSitesByDatasourceAuthConfig,
  isAllowedSharePointNextLink,
  listSharePointDrives,
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
            hitsContainers: [
              {
                moreResultsAvailable: false,
                hits: [
                  {
                    resource: {
                      id: "site-1",
                      displayName: "Site One",
                      name: "Ignored Name",
                      webUrl: "https://contoso.sharepoint.com/sites/site-1",
                    },
                  },
                ],
              },
            ],
          },
        ],
      }),
    } as Response)

    const sites = await fetchSharePointSitesByDatasourceAuthConfig(
      datasourceId,
      authConfigId
    )

    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.microsoft.com/v1.0/search/query",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: bearerToken,
          "Content-Type": "application/json",
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
              hitsContainers: [
                {
                  moreResultsAvailable: true,
                  hits: [
                    {
                      resource: {
                        id: "site-1",
                        displayName: "Site One",
                        webUrl: "https://contoso.sharepoint.com/sites/site-1",
                      },
                    },
                    {
                      resource: {
                        id: "site-2",
                        displayName: "Site Two",
                        webUrl: "https://contoso.sharepoint.com/sites/site-2",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [
            {
              hitsContainers: [
                {
                  moreResultsAvailable: false,
                  hits: [
                    {
                      resource: {
                        id: "site-2",
                        displayName: "Site Two Updated",
                        webUrl: "https://contoso.sharepoint.com/sites/site-2",
                      },
                    },
                    {
                      resource: {
                        id: "site-3",
                        displayName: "Site Three",
                        webUrl: "https://contoso.sharepoint.com/sites/site-3",
                      },
                    },
                  ],
                },
              ],
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
      "https://graph.microsoft.com/v1.0/search/query",
      expect.objectContaining({
        body: JSON.stringify({
          requests: [
            {
              entityTypes: ["site"],
              query: { queryString: "*" },
              fields: ["id", "displayName", "name", "webUrl"],
              from: 0,
              size: 25,
            },
          ],
        }),
      })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://graph.microsoft.com/v1.0/search/query",
      expect.objectContaining({
        body: JSON.stringify({
          requests: [
            {
              entityTypes: ["site"],
              query: { queryString: "*" },
              fields: ["id", "displayName", "name", "webUrl"],
              from: 25,
              size: 25,
            },
          ],
        }),
      })
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

describe("SharePoint Graph retries", () => {
  const bearerToken = "Bearer token"
  const datasourceId = "datasource_1"
  const authConfigId = "auth_1"

  const mockDatasource = () => {
    jest.spyOn(sdk.datasources, "get").mockResolvedValue({
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
    } as Datasource)
  }

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("retries site search on 429 then succeeds", async () => {
    mockDatasource()
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { get: () => null },
        json: async () => ({}),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({
          value: [
            {
              hitsContainers: [
                {
                  moreResultsAvailable: false,
                  hits: [
                    {
                      resource: {
                        id: "site-1",
                        displayName: "Site One",
                        webUrl: "https://contoso.sharepoint.com/sites/site-1",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        }),
      } as unknown as Response)

    const sites = await fetchSharePointSitesByDatasourceAuthConfig(
      datasourceId,
      authConfigId
    )

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(sites).toEqual([
      {
        id: "site-1",
        name: "Site One",
        webUrl: "https://contoso.sharepoint.com/sites/site-1",
      },
    ])
  })

  it("uses Retry-After for site search delays", async () => {
    mockDatasource()
    const logSpy = jest.spyOn(console, "log").mockImplementation()
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: {
          get: (name: string) => (name === "Retry-After" ? "2" : null),
        },
        json: async () => ({}),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({
          value: [
            {
              hitsContainers: [
                {
                  moreResultsAvailable: false,
                  hits: [],
                },
              ],
            },
          ],
        }),
      } as unknown as Response)

    await fetchSharePointSitesByDatasourceAuthConfig(datasourceId, authConfigId)

    expect(logSpy).toHaveBeenCalledWith(
      "Retrying SharePoint Graph request after failure",
      expect.objectContaining({
        operation: "fetchSharePointSites",
        status: 429,
        delayMs: 2000,
      })
    )
  })

  it("retries listSharePointDrives on 429 then succeeds", async () => {
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { get: () => null },
        json: async () => ({}),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({ value: [{ id: "drive-1" }] }),
      } as unknown as Response)

    const drives = await listSharePointDrives(bearerToken, "site-1")

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(drives).toEqual(["drive-1"])
  })

  it("does not retry listSharePointDrives on 403", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 403,
      headers: { get: () => null },
      json: async () => ({}),
    } as unknown as Response)

    await expect(listSharePointDrives(bearerToken, "site-1")).rejects.toEqual(
      expect.objectContaining({
        message:
          "Access denied by Microsoft Graph. Ensure delegated SharePoint read permissions are granted.",
        status: 400,
      })
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("retries paginated drive items requests and continues", async () => {
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: { get: () => null },
        json: async () => ({}),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({
          value: [
            {
              id: "item-1",
              name: "doc-1.txt",
              file: { mimeType: "text/plain" },
            },
          ],
          "@odata.nextLink":
            "https://graph.microsoft.com/v1.0/drives/drive-1/root/children?$skiptoken=abc",
        }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({
          value: [
            {
              id: "item-2",
              name: "doc-2.txt",
              file: { mimeType: "text/plain" },
            },
          ],
        }),
      } as unknown as Response)

    const files = await collectSharePointFilesRecursive(bearerToken, "drive-1")

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(files.map(file => file.path)).toEqual(["doc-1.txt", "doc-2.txt"])
  })
})
