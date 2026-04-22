import {
  EXCLUDE_ALL_PATTERN,
  matchesConfiguredPatterns,
} from "../globFilters"

describe("globFilters", () => {
  it("excludes all files when using !**", () => {
    expect(matchesConfiguredPatterns("activities.txt", [EXCLUDE_ALL_PATTERN])).toBe(
      false
    )
    expect(
      matchesConfiguredPatterns("folder 1/sub 1/tesla 2023 annual report.pdf", [
        EXCLUDE_ALL_PATTERN,
      ])
    ).toBe(false)
  })

  it("applies ordered include/exclude patterns", () => {
    const patterns = ["!**", "folder 1/**", "!folder 1/sub 2/**"]
    expect(matchesConfiguredPatterns("folder 1/dataset.txt", patterns)).toBe(true)
    expect(matchesConfiguredPatterns("folder 1/sub 2/pg78428.txt", patterns)).toBe(
      false
    )
  })

  it("does not normalize case or separators", () => {
    expect(matchesConfiguredPatterns("Folder/File.TXT", ["folder/**"])).toBe(false)
    expect(matchesConfiguredPatterns("folder\\file.txt", ["folder/**"])).toBe(
      false
    )
  })
})
