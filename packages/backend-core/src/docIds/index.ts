import { DocumentType, prefixed } from "@budibase/types"

export * from "./ids"
export * from "./params"

export function isType(id: string, type: DocumentType) {
  return id.startsWith(prefixed(type))
}
