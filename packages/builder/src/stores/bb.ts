import type { MatchedRoute } from "@/types/routing"
import { get } from "svelte/store"
import { BudiStore } from "./BudiStore"

type SettingsRouteResolver = (path: string) => MatchedRoute | null

let settingsRouteResolver: SettingsRouteResolver | null = null

export const setSettingsRouteResolver = (resolver: SettingsRouteResolver) => {
  settingsRouteResolver = resolver
}

const resolvePathParams = (
  path: string | undefined,
  params: Record<string, string>
) => {
  if (!path) {
    return path
  }
  return path.replace(/:([^/]+)/g, (_match, key) => params[key] ?? `:${key}`)
}

export interface Settings {
  open: boolean
  route?: MatchedRoute
  pendingPath?: string
  pendingParams?: Record<string, any>
}

export interface BBState {
  settings: Settings
}

export const INITIAL_GLOBAL_STATE: BBState = {
  settings: {
    open: false,
  },
}

export class BBStore extends BudiStore<BBState> {
  constructor() {
    super(INITIAL_GLOBAL_STATE)
    this.clearSettings = this.clearSettings.bind(this)
    this.hideSettings = this.hideSettings.bind(this)
    this.goToParent = this.goToParent.bind(this)
    this.tryResolvePendingSettings = this.tryResolvePendingSettings.bind(this)
  }

  reset() {
    this.store.set({ ...INITIAL_GLOBAL_STATE })
  }

  settings(path?: string, params?: Record<string, any>) {
    if (!path) {
      this.update(state => ({
        ...state,
        settings: {
          ...state.settings,
          open: true,
        },
      }))
      return
    }

    const matchedRoute = settingsRouteResolver?.(path)
    if (matchedRoute) {
      this.update(state => ({
        ...state,
        settings: {
          ...state.settings,
          route: {
            ...matchedRoute,
            params: {
              ...matchedRoute.params,
              ...(params || {}),
            },
          },
          open: true,
        },
      }))
    } else {
      this.update(state => ({
        ...state,
        settings: {
          ...state.settings,
          pendingPath: path,
          pendingParams: params,
        },
      }))
    }
  }

  clearSettings() {
    this.update(state => ({
      ...state,
      settings: {
        open: false,
      },
    }))
  }

  hideSettings(path?: string) {
    const matchedRoute = path ? settingsRouteResolver?.(path) : undefined
    this.update(state => ({
      ...state,
      settings: {
        ...state.settings,
        ...(matchedRoute ? { route: matchedRoute } : {}),
        open: false,
        pendingPath: undefined,
        pendingParams: undefined,
      },
    }))
  }

  goToParent() {
    const route = get(this.store).settings.route
    const parentRoute = route?.entry.crumbs?.at(-2)
    const parentPath = resolvePathParams(parentRoute?.path, route?.params || {})

    if (!parentPath) {
      console.error("Parent from route not valid", { route })
      return
    }
    this.settings(parentPath)
  }

  tryResolvePendingSettings() {
    const pendingPath = get(this.store).settings.pendingPath
    const pendingParams = get(this.store).settings.pendingParams
    if (!pendingPath) {
      return
    }
    const matchedRoute = settingsRouteResolver?.(pendingPath)
    if (!matchedRoute) {
      return
    }
    this.update(state => ({
      ...state,
      settings: {
        ...state.settings,
        route: {
          ...matchedRoute,
          params: {
            ...matchedRoute.params,
            ...(pendingParams || {}),
          },
        },
        open: true,
        pendingPath: undefined,
        pendingParams: undefined,
      },
    }))
  }
}

export const bb = new BBStore()
