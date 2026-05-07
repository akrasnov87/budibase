<script lang="ts" module>
  export interface ContextSegment {
    name: string
    tokens: number
    color: string
  }
</script>

<script lang="ts">
  import { Icon } from "@budibase/bbui"
  import { fly } from "svelte/transition"
  import { cubicOut } from "svelte/easing"

  interface Props {
    breakdown: ContextSegment[]
    maxTokens: number
    tokensKnown?: boolean
  }

  let { breakdown, maxTokens, tokensKnown = true }: Props = $props()

  let open = $state(false)
  let containerEl = $state<HTMLDivElement>()
  let triggerEl = $state<HTMLButtonElement>()
  let popoverEl = $state<HTMLDivElement>()
  let triggerRect = $state<DOMRect>()

  const portal = (node: HTMLElement) => {
    document.body.appendChild(node)
    return {
      destroy() {
        node.remove()
      },
    }
  }

  const updateTriggerRect = () => {
    if (triggerEl) {
      triggerRect = triggerEl.getBoundingClientRect()
    }
  }

  const visibleSegments = $derived(breakdown.filter(s => s.tokens > 0))
  const totalTokens = $derived(
    visibleSegments.reduce((sum, s) => sum + s.tokens, 0)
  )
  const percentage = $derived(
    maxTokens > 0
      ? Math.min(100, Math.round((totalTokens / maxTokens) * 100))
      : 0
  )

  const RING_RADIUS = 7
  const RING_CIRC = 2 * Math.PI * RING_RADIUS
  const dashOffset = $derived(RING_CIRC - (percentage / 100) * RING_CIRC)

  const formatTokens = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return `${n}`
  }

  const formatTotal = (n: number) => {
    if (n >= 1_000_000) {
      const v = n / 1_000_000
      return `${v >= 10 ? v.toFixed(0) : v.toFixed(1)}M`
    }
    if (n >= 1000) {
      const v = n / 1000
      return `${v >= 100 ? v.toFixed(0) : v.toFixed(1)}K`
    }
    return `${n}`
  }

  const close = () => (open = false)
  const toggle = () => (open = !open)

  const onDocumentClick = (event: MouseEvent) => {
    if (!open) return
    const target = event.target as Node
    if (containerEl?.contains(target) || popoverEl?.contains(target)) {
      return
    }
    open = false
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && open) {
      open = false
    }
  }

  $effect(() => {
    if (!open) return
    updateTriggerRect()
    window.addEventListener("mousedown", onDocumentClick)
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("resize", updateTriggerRect)
    window.addEventListener("scroll", updateTriggerRect, true)
    return () => {
      window.removeEventListener("mousedown", onDocumentClick)
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("resize", updateTriggerRect)
      window.removeEventListener("scroll", updateTriggerRect, true)
    }
  })
</script>

<div class="context-usage" bind:this={containerEl}>
  <button
    bind:this={triggerEl}
    type="button"
    class="trigger"
    class:active={open}
    onclick={toggle}
    aria-label="Context usage"
    aria-expanded={open}
  >
    <span class="ring" aria-hidden="true">
      <svg viewBox="0 0 18 18">
        <circle cx="9" cy="9" r={RING_RADIUS} class="ring-track" />
        <circle
          cx="9"
          cy="9"
          r={RING_RADIUS}
          class="ring-progress"
          style="stroke-dasharray: {RING_CIRC}; stroke-dashoffset: {dashOffset};"
        />
      </svg>
    </span>
    <span class="trigger-label">
      <span class="trigger-percent">{percentage}%</span>
      <span class="trigger-suffix">context</span>
    </span>
  </button>

  {#if open && triggerRect}
    <div
      bind:this={popoverEl}
      use:portal
      class="popover"
      role="dialog"
      style="bottom: {window.innerHeight -
        triggerRect.top +
        8}px; right: {window.innerWidth - triggerRect.right}px;"
      transition:fly={{ y: 6, duration: 180, easing: cubicOut }}
    >
      <header class="popover-header">
        <div class="popover-titles">
          <span class="popover-title">Context</span>
          <span class="popover-fill">{percentage}% Full</span>
        </div>
        <div class="popover-meta">
          {#if tokensKnown}
            <span class="popover-total"
              >~{formatTotal(totalTokens)} / {formatTotal(maxTokens)} Tokens</span
            >
          {/if}
          <button
            class="popover-close"
            type="button"
            onclick={close}
            aria-label="Close context details"
          >
            <Icon
              name="x"
              size="S"
              color="var(--spectrum-global-color-gray-700)"
            />
          </button>
        </div>
      </header>

      <div class="bar" role="img" aria-label="Context breakdown">
        {#each visibleSegments as segment (segment.name)}
          {@const segPct = (segment.tokens / maxTokens) * 100}
          <span
            class="bar-segment"
            style="width: {segPct}%; background: {segment.color};"
          ></span>
        {/each}
      </div>

      <ul class="legend">
        {#each visibleSegments as segment (segment.name)}
          <li class="legend-row">
            <span class="legend-swatch" style="background: {segment.color};"
            ></span>
            <span class="legend-name">{segment.name}</span>
            <span class="legend-tokens">{formatTokens(segment.tokens)}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .context-usage {
    position: relative;
    display: inline-flex;
    font-family: inherit;
  }

  .trigger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px 4px 6px;
    border: 1px solid transparent;
    border-radius: 999px;
    background: transparent;
    color: var(--spectrum-global-color-gray-700);
    font-size: 12px;
    line-height: 1;
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease;
  }

  .trigger:hover,
  .trigger.active {
    background: var(--spectrum-global-color-gray-100);
    border-color: var(--spectrum-global-color-gray-200);
    color: var(--spectrum-global-color-gray-900);
  }

  .ring {
    display: inline-flex;
    width: 16px;
    height: 16px;
  }

  .ring svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .ring-track {
    fill: none;
    stroke: var(--spectrum-global-color-gray-300);
    stroke-width: 2;
  }

  .ring-progress {
    fill: none;
    stroke: var(--spectrum-global-color-gray-800);
    stroke-width: 2;
    stroke-linecap: round;
    transition:
      stroke-dashoffset 0.4s cubic-bezier(0.22, 1, 0.36, 1),
      stroke 0.2s ease;
  }

  .trigger-label {
    display: inline-flex;
    gap: 4px;
    align-items: baseline;
    font-variant-numeric: tabular-nums;
  }

  .trigger-percent {
    font-weight: 600;
    color: var(--spectrum-global-color-gray-900);
  }

  .trigger-suffix {
    color: var(--spectrum-global-color-gray-700);
  }

  .popover {
    position: fixed;
    width: min(420px, calc(100vw - 24px));
    background: var(--spectrum-global-color-gray-50);
    border: 1px solid var(--spectrum-global-color-gray-200);
    border-radius: 12px;
    padding: 16px 16px 14px;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.04),
      0 12px 32px rgba(0, 0, 0, 0.12);
    z-index: 20;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .popover-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .popover-titles {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .popover-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--spectrum-global-color-gray-900);
    letter-spacing: -0.01em;
  }

  .popover-fill {
    font-size: 12px;
    color: var(--spectrum-global-color-gray-700);
    font-variant-numeric: tabular-nums;
  }

  .popover-meta {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .popover-total {
    font-size: 12px;
    color: var(--spectrum-global-color-gray-700);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .popover-close {
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    border: none;
    background: transparent;
    cursor: pointer;
    color: var(--spectrum-global-color-gray-700);
    transition: background-color 0.15s ease;
  }

  .popover-close:hover {
    background: var(--spectrum-global-color-gray-200);
  }

  .bar {
    display: flex;
    width: 100%;
    height: 8px;
    border-radius: 999px;
    background: var(--spectrum-global-color-gray-200);
    overflow: hidden;
    gap: 2px;
    padding: 0;
  }

  .bar-segment {
    height: 100%;
    transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .bar-segment:first-child {
    border-top-left-radius: 999px;
    border-bottom-left-radius: 999px;
  }

  .legend {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .legend-row {
    display: grid;
    grid-template-columns: 14px 1fr auto;
    align-items: center;
    gap: 10px;
    padding: 6px 2px;
    font-size: 13px;
  }

  .legend-row + .legend-row {
    border-top: 1px solid var(--spectrum-global-color-gray-100);
  }

  .legend-swatch {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    display: inline-block;
  }

  .legend-name {
    color: var(--spectrum-global-color-gray-800);
  }

  .legend-tokens {
    color: var(--spectrum-global-color-gray-700);
    font-variant-numeric: tabular-nums;
    font-size: 12px;
  }
</style>
