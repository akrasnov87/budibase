<script lang="ts">
  import {
    List,
    ListItem,
    ActionButton,
    PopoverAlignment,
  } from "@budibase/bbui"
  import DetailPopover from "@/components/common/DetailPopover.svelte"
  import { appStore } from "@/stores/builder"
  import type { AutomationUsage } from "@budibase/types"

  export let automations: AutomationUsage[] = []
  export let icon = "path"
  export let accentColor: string | null | undefined = "#4b75ff"
  export let showCount = false
  export let align = PopoverAlignment.Left
  export let buttonText = "Automations"

  let popover: DetailPopover

  export function show() {
    popover?.show()
  }

  export function hide() {
    popover?.hide()
  }
</script>

<DetailPopover title={buttonText} bind:this={popover} {align}>
  <svelte:fragment slot="anchor" let:open>
    <ActionButton
      {icon}
      quiet
      selected={open || !!(showCount && automations.length)}
      {accentColor}
      on:click={show}
    >
      {buttonText}{showCount && automations.length
        ? `: ${automations.length}`
        : ""}
    </ActionButton>
  </svelte:fragment>

  {#if !automations.length}
    There aren't any automations connected to this data.
  {:else}
    The following automations are connected to this data.
    <List>
      {#each automations as automation}
        <ListItem
          icon={automation.disabled ? "PauseCircle" : "PlayCircle"}
          iconColor={automation.disabled
            ? "var(--spectrum-global-color-gray-600)"
            : "var(--spectrum-global-color-green-600)"}
          title={automation.name}
          url={`/builder/workspace/${$appStore.appId}/automation/${automation._id}`}
          showArrow
        />
      {/each}
    </List>
  {/if}

  <slot name="footer" />
</DetailPopover>
