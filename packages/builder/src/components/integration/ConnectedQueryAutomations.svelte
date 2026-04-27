<script lang="ts">
  import AutomationsPopover from "@/components/common/AutomationsPopover.svelte"
  import { automationStore } from "@/stores/builder"
  import type { Automation, AutomationUsage } from "@budibase/types"

  export let sourceId: string
  export let buttonText = "Automations"
  export let icon = "path"

  let popover: AutomationsPopover

  export function show() {
    popover?.show()
  }

  export function hide() {
    popover?.hide()
  }

  const findConnectedAutomations = (
    automations: Automation[],
    queryId: string
  ): AutomationUsage[] => {
    if (!queryId) {
      return []
    }
    const needle = `"${queryId}"`
    return automations
      .filter(automation =>
        JSON.stringify(automation.definition || {}).includes(needle)
      )
      .map(automation => ({
        _id: automation._id!,
        name: automation.name,
        disabled: automation.disabled,
      }))
  }

  $: connectedAutomations = findConnectedAutomations(
    $automationStore.automations,
    sourceId
  )
</script>

<AutomationsPopover
  bind:this={popover}
  automations={connectedAutomations}
  {icon}
  {buttonText}
  showCount
/>
