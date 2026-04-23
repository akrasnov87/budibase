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

export type SettingsLocked = "self" | "subtree"

export interface Settings {
  open: boolean
  route?: MatchedRoute
  locked?: SettingsLocked
}

export interface BBState {
  settings: Settings
}

export const INITIAL_GLOBAL_STATE: BBState = {
  settings: {
    open: false,
  },
}

type BeforeCloseGuard = () => Promise<boolean>

export class BBStore extends BudiStore<BBState> {
  private beforeCloseGuard: BeforeCloseGuard | null = null

  registerBeforeClose(guard: BeforeCloseGuard) {
    this.beforeCloseGuard = guard
    return () => {
      if (this.beforeCloseGuard === guard) {
        this.beforeCloseGuard = null
      }
    }
  }

  async runBeforeClose(): Promise<boolean> {
    if (!this.beforeCloseGuard) return true
    return this.beforeCloseGuard()
  }

  constructor() {
    super(INITIAL_GLOBAL_STATE)
    this.clearSettings = this.clearSettings.bind(this)
    this.hideSettings = this.hideSettings.bind(this)
    this.goToParent = this.goToParent.bind(this)
  }

  reset() {
    this.store.set({ ...INITIAL_GLOBAL_STATE })
  }

  settings(path?: string, { locked }: { locked?: SettingsLocked } = {}) {
    const currentState = get(this.store).settings

    // blocks all navigation when locked
    if (currentState.locked === "self" && locked === undefined) {
      return
    }

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
      if (currentState.locked === "subtree" && locked === undefined) {
        const currentSection = currentState.route?.entry?.section
        if (currentSection && matchedRoute.entry.section !== currentSection) {
          return
        }
      }

      this.update(state => ({
        ...state,
        settings: {
          ...state.settings,
          route: matchedRoute,
          locked: locked ?? currentState.locked,
          open: true,
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
        locked: undefined,
        open: false,
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
}

export const bb = new BBStore()
