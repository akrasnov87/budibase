<script lang="ts">
  import { createEventDispatcher } from "svelte"

  export let label = ""
  export let value: string[] = []
  export let inputValue = ""
  export let error: string | undefined = undefined

  const dispatch = createEventDispatcher()

  const handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    const nextValue = target.value
    if (nextValue.includes(",")) {
      const parts = nextValue.split(",").map(token => token.trim())
      const endsWithSeparator = /\s*,\s*$/.test(nextValue)
      const committed = endsWithSeparator ? parts : parts.slice(0, -1)
      const trailing = endsWithSeparator ? "" : (parts.at(-1) ?? "")

      value = [
        ...new Set([...value, ...committed.filter(token => token.length > 0)]),
      ]
      inputValue = trailing
    } else {
      inputValue = nextValue
    }
    dispatch("change", value)
  }
</script>

<label>
  <span>{label}</span>
  <input aria-label={label} bind:value={inputValue} on:input={handleInput} />
  {#if error}
    <span>{error}</span>
  {/if}
</label>
