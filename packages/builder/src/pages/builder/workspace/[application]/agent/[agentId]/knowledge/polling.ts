interface PollingState {
  agentId: string
  interval: ReturnType<typeof setInterval>
  inFlight: boolean
}

interface LimitedPollingState extends PollingState {
  remaining: number
}

interface CreateAgentPollingControllerConfig {
  intervalMs: number
  onPoll: (agentId: string) => Promise<void>
  onError?: (error: unknown) => void
}

export interface AgentPollingController {
  start: (agentId: string) => void
  stop: () => void
  isRunningFor: (agentId: string) => boolean
}

export interface LimitedAgentPollingController {
  start: (agentId: string, pollCount: number) => void
  stop: () => void
  isRunningFor: (agentId: string) => boolean
}

export const createAgentPollingController = ({
  intervalMs,
  onPoll,
  onError,
}: CreateAgentPollingControllerConfig): AgentPollingController => {
  let state: PollingState | undefined

  const stop = () => {
    if (!state) {
      return
    }
    clearInterval(state.interval)
    state = undefined
  }

  const pollOnce = async (agentId: string) => {
    if (!state || state.agentId !== agentId || state.inFlight) {
      return
    }
    state.inFlight = true
    try {
      await onPoll(agentId)
    } finally {
      if (state?.agentId === agentId) {
        state.inFlight = false
      }
    }
  }

  const start = (agentId: string) => {
    if (!agentId) {
      return
    }
    if (state?.agentId === agentId) {
      return
    }
    stop()
    const interval = setInterval(() => {
      pollOnce(agentId).catch(error => {
        onError?.(error)
      })
    }, intervalMs)
    state = {
      agentId,
      interval,
      inFlight: false,
    }
  }

  const isRunningFor = (agentId: string) => {
    return !!state && state.agentId === agentId
  }

  return {
    start,
    stop,
    isRunningFor,
  }
}

export const createLimitedAgentPollingController = ({
  intervalMs,
  onPoll,
  onError,
}: CreateAgentPollingControllerConfig): LimitedAgentPollingController => {
  let state: LimitedPollingState | undefined

  const stop = () => {
    if (!state) {
      return
    }
    clearInterval(state.interval)
    state = undefined
  }

  const pollOnce = async (agentId: string) => {
    if (!state || state.agentId !== agentId || state.inFlight) {
      return
    }
    if (state.remaining <= 0) {
      stop()
      return
    }

    state.inFlight = true
    try {
      await onPoll(agentId)
    } finally {
      if (state?.agentId === agentId) {
        state.remaining -= 1
        state.inFlight = false
        if (state.remaining <= 0) {
          stop()
        }
      }
    }
  }

  const start = (agentId: string, pollCount: number) => {
    if (!agentId || pollCount <= 0) {
      return
    }
    if (state?.agentId === agentId) {
      state.remaining = Math.max(state.remaining, pollCount)
      return
    }
    stop()
    const interval = setInterval(() => {
      pollOnce(agentId).catch(error => {
        onError?.(error)
      })
    }, intervalMs)
    state = {
      agentId,
      interval,
      inFlight: false,
      remaining: pollCount,
    }
  }

  const isRunningFor = (agentId: string) => {
    return !!state && state.agentId === agentId
  }

  return {
    start,
    stop,
    isRunningFor,
  }
}
