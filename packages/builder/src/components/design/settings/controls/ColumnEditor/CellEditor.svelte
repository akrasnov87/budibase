<script lang="ts">
  import { Drawer, Button, Icon } from "@budibase/bbui"
  import CellDrawer from "./CellDrawer.svelte"

  interface ColumnConfig {
    id?: string
    name?: string
    displayName?: string
  }

  export let column: ColumnConfig

  let boundValue: ColumnConfig
  let drawer: Drawer

  $: updateBoundValue(column)

  const updateBoundValue = (value: ColumnConfig) => {
    boundValue = { ...value }
  }

  const open = () => {
    updateBoundValue(column)
    drawer.show()
  }

  const save = () => {
    column = boundValue
    drawer.hide()
  }
</script>

<Icon name="gear" hoverable size="S" on:click={open} />
<Drawer bind:this={drawer} title={column.name}>
  <Button cta slot="buttons" on:click={save}>Save</Button>
  <CellDrawer slot="body" bind:column={boundValue} />
</Drawer>
