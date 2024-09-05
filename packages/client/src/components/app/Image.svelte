<script>
  import { getContext } from "svelte"
  import Placeholder from "./Placeholder.svelte"

  const { styleable, builderStore } = getContext("sdk")
  const component = getContext("component")

  export let url
  export let title
  export let onClick
</script>

{#if url}
  <img src={url} alt={$component.name} title={title} use:styleable={$component.styles} on:click={onClick} />
{:else if $builderStore.inBuilder}
  <div
    class="placeholder"
    use:styleable={{ ...$component.styles, empty: true }}
  >
    <Placeholder />
  </div>
{/if}

<style>
  .placeholder {
    display: grid;
    place-items: center;
  }
</style>
