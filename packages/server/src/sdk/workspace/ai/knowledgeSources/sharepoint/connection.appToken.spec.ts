import { fetchSharePointSitesByConnection } from "./connection"

describe("fetchSharePointSitesByConnection app token pagination", () => {
  beforeEach(() => {
    jest.clearAllMocks()
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

    const sites = await fetchSharePointSitesByConnection(
      "datasource_1",
      "auth_1"
    )

    expect(fetchMock).toHaveBeenCalledTimes(50)
    expect(sites).toEqual([])
  })
})
