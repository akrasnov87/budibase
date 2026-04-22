import { minimatch } from "minimatch"

export const EXCLUDE_ALL_PATTERN = "!**"

export const matchesConfiguredPatterns = (path: string, patterns: string[]) => {
  if (!patterns.length) {
    return true
  }
  const hasPositivePattern = patterns.some(pattern => !pattern.startsWith("!"))
  const candidatePath = path.trim()
  if (!candidatePath) {
    return false
  }
  let included = !hasPositivePattern

  for (const pattern of patterns) {
    const isNegated = pattern.startsWith("!")
    const body = (isNegated ? pattern.slice(1) : pattern).trim()
    if (!body) {
      continue
    }
    if (minimatch(candidatePath, body)) {
      included = !isNegated
    }
  }

  return included
}
