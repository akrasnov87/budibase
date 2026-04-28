<script lang="ts">
  import {
    List,
    ListItem,
    ActionButton,
    PopoverAlignment,
  } from "@budibase/bbui"
  import DetailPopover from "@/components/common/DetailPopover.svelte"
  import { appStore, workspaceAppStore } from "@/stores/builder"
  import type { ScreenUsage, AutomationUsage } from "@budibase/types"

  export let screens: ScreenUsage[] = []
  export let automations: AutomationUsage[] = []
  export let icon = "link-simple-horizontal-break"
  export let accentColor: string | null | undefined = null
  export let showCount = false
  export let align = PopoverAlignment.Left
  export let buttonText = "Usage"

  let popover: DetailPopover

  $: total = screens.length + automations.length

  $: screensByApp = screens.reduce<Record<string, ScreenUsage[]>>(
    (acc, screen) => {
      acc[screen.workspaceAppId] ??= []
      acc[screen.workspaceAppId].push(screen)
      return acc
    },
    {}
  )

  $: hasManyWorkspaceApps = $workspaceAppStore.workspaceApps.length > 1

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
      selected={open || !!(showCount && total)}
      {accentColor}
      on:click={show}
    >
      {buttonText}{showCount && total ? `: ${total}` : ""}
    </ActionButton>
  </svelte:fragment>

  {#if !total}
    Nothing is connected to this data yet.
  {:else}
    {#if screens.length}
      <div class="section-title">Screens</div>
      {#each Object.entries(screensByApp) as [workspaceAppId, appScreens]}
        {@const title = !hasManyWorkspaceApps
          ? undefined
          : $workspaceAppStore.workspaceApps.find(a => a._id === workspaceAppId)
              ?.name}
        <List {title}>
          {#each appScreens as screen}
            <ListItem
              title={screen.url}
              url={`/builder/workspace/${$appStore.appId}/design/${screen._id}`}
              showArrow
            />
          {/each}
        </List>
      {/each}
    {/if}
    {#if automations.length}
      <div class="section-title">Automations</div>
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
  {/if}

  <slot name="footer" />
</DetailPopover>

<style>
  .section-title {
    font-size: var(--font-size-s);
    font-weight: 600;
    color: var(--spectrum-global-color-gray-700);
    margin-top: var(--spacing-s);
  }
  .section-title:first-child {
    margin-top: 0;
  }
</style>
