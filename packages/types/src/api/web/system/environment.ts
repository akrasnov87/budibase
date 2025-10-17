export interface GetEnvironmentResponse {
  multiTenancy: boolean
  offlineMode: boolean
  supportEmail: string
  friendMode: boolean
  cloud: boolean
  accountPortalUrl?: string
  disableAccountPortal: boolean
  baseUrl?: string
  isDev: boolean
  maintenance: { type: string }[]
  passwordMinLength?: string
}
