<script>
  import { getContext } from "svelte"
  import { ActionButton, Popover, Icon, notifications } from "@budibase/bbui"
  import { getColumnIcon } from "../lib/utils"
  import ToggleActionButtonGroup from "./ToggleActionButtonGroup.svelte"
  import { helpers } from "@budibase/shared-core"

  export let allowViewReadonlyColumns = false

  const { columns, datasource, stickyColumn, dispatch } = getContext("grid")

  let open = false
  let anchor

  $: allColumns = $stickyColumn ? [$stickyColumn, ...$columns] : $columns

  $: restrictedColumns = allColumns.filter(col => !col.visible || col.readonly)
  $: anyRestricted = restrictedColumns.length
  $: text = anyRestricted ? `Columns (${anyRestricted} restricted)` : "Columns"

  const toggleColumn = async (column, permission) => {
    const visible = permission !== PERMISSION_OPTIONS.HIDDEN
    const readonly = permission === PERMISSION_OPTIONS.READONLY

    await datasource.actions.addSchemaMutation(column.name, {
      visible,
      readonly,
    })
    try {
      await datasource.actions.saveSchemaMutations()
    } catch (e) {
      notifications.error(e.message)
    } finally {
      await datasource.actions.resetSchemaMutations()
      await datasource.actions.refreshDefinition()
    }
    dispatch(visible ? "show-column" : "hide-column")
  }

  const PERMISSION_OPTIONS = {
    WRITABLE: "writable",
    READONLY: "readonly",
    HIDDEN: "hidden",
  }

  $: displayColumns = allColumns.map(c => {
    const isRequired = helpers.schema.isRequired(c.schema.constraints)
    const isDisplayColumn = $stickyColumn === c

    const requiredTooltip = isRequired && "Required columns must be writable"

    const editEnabled =
      !isRequired ||
      columnToPermissionOptions(c) !== PERMISSION_OPTIONS.WRITABLE
    const options = [
      {
        icon: "Edit",
        value: PERMISSION_OPTIONS.WRITABLE,
        tooltip: (!editEnabled && requiredTooltip) || "Writable",
        disabled: !editEnabled,
      },
    ]
    if ($datasource.type === "viewV2") {
      options.push({
        icon: "Visibility",
        value: PERMISSION_OPTIONS.READONLY,
        tooltip: allowViewReadonlyColumns
          ? requiredTooltip || "Read only"
          : "Read only (premium feature)",
        disabled: !allowViewReadonlyColumns || isRequired,
      })
    }

    options.push({
      icon: "VisibilityOff",
      value: PERMISSION_OPTIONS.HIDDEN,
      disabled: isDisplayColumn || isRequired,
      tooltip:
        (isDisplayColumn && "Display column cannot be hidden") ||
        requiredTooltip ||
        "Hidden",
    })

    return { ...c, options }
  })

  function columnToPermissionOptions(column) {
    if (!column.schema.visible) {
      return PERMISSION_OPTIONS.HIDDEN
    }

    if (column.schema.readonly) {
      return PERMISSION_OPTIONS.READONLY
    }

    return PERMISSION_OPTIONS.WRITABLE
  }
</script>

<div bind:this={anchor}>
  <ActionButton
    icon="ColumnSettings"
    quiet
    size="M"
    on:click={() => (open = !open)}
    selected={open || anyRestricted}
    disabled={!$columns.length}
  >
    {text}
  </ActionButton>
</div>

<Popover bind:open {anchor} align="left">
  <div class="content">
    <div class="columns">
      {#each displayColumns as column}
        <div class="column">
          <Icon size="S" name={getColumnIcon(column)} />
          {column.label}
        </div>
        <ToggleActionButtonGroup
          on:click={e => toggleColumn(column, e.detail)}
          value={columnToPermissionOptions(column)}
          options={column.options}
        />
      {/each}
    </div>
  </div>
</Popover>

<style>
  .content {
    padding: 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .columns {
    display: grid;
    align-items: center;
    grid-template-columns: 1fr auto;
    gap: 8px;
  }
  .columns :global(.spectrum-Switch) {
    margin-right: 0;
  }
  .column {
    display: flex;
    gap: 8px;
  }
</style>
