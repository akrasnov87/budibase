import { describe, expect, it } from "vitest"
import {
  addEndpointDisplayLabels,
  formatEndpointDisplayLabel,
} from "./restTemplates"

describe("formatEndpointDisplayLabel", () => {
  it("uses the OpenAPI summary when present", () => {
    expect(
      formatEndpointDisplayLabel({
        id: "sendSingleEmail",
        name: "sendSingleEmail",
        operationId: "sendSingleEmail",
        summary: " Send a single email ",
        method: "POST",
        path: "/email",
      })
    ).toBe("Send a single email")
  })

  it("falls back to a humanized operationId when summary is blank", () => {
    expect(
      formatEndpointDisplayLabel({
        id: "Sending_sendSingleEmail",
        name: "Sending_sendSingleEmail",
        operationId: "Sending_sendSingleEmail",
        summary: " ",
        method: "POST",
        path: "/email",
      })
    ).toBe("Send Single Email")
  })

  it("falls back to method and path when summary and operationId are missing", () => {
    expect(
      formatEndpointDisplayLabel({
        id: "post::/email",
        name: "",
        method: "POST",
        path: "/email",
      })
    ).toBe("POST /email")
  })
})

describe("addEndpointDisplayLabels", () => {
  it("disambiguates duplicate labels by tag, then method and path", () => {
    const endpoints = addEndpointDisplayLabels([
      {
        id: "list-bounces",
        name: "listBounces",
        summary: "List",
        tags: ["Bounces"],
        method: "GET",
        path: "/bounces",
      },
      {
        id: "list-templates",
        name: "listTemplates",
        summary: "List",
        tags: ["Templates"],
        method: "GET",
        path: "/templates",
      },
      {
        id: "list-bounces-archived",
        name: "listArchivedBounces",
        summary: "List",
        tags: ["Bounces"],
        method: "GET",
        path: "/bounces/archived",
      },
    ])

    expect(endpoints.map(endpoint => endpoint.displayName)).toEqual([
      "List - Bounces - GET /bounces",
      "List - Templates",
      "List - Bounces - GET /bounces/archived",
    ])
  })

  it("includes operationId in search text", () => {
    const [endpoint] = addEndpointDisplayLabels([
      {
        id: "postmark-email",
        name: "sendSingleEmail",
        operationId: "sendSingleEmail",
        summary: "Send a single email",
        tags: ["Sending"],
        method: "POST",
        path: "/email",
      },
    ])

    expect(endpoint.searchText).toContain("Send a single email")
    expect(endpoint.searchText).toContain("sendSingleEmail")
    expect(endpoint.searchText).toContain("Sending")
    expect(endpoint.searchText).toContain("POST")
    expect(endpoint.searchText).toContain("/email")
  })
})
