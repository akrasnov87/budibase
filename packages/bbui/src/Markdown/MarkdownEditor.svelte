<script lang="ts">
  import type EasyMDE from "easymde"
  import { onDestroy, tick } from "svelte"
  import SpectrumMDE from "./SpectrumMDE.svelte"
  import ColorPicker from "../ColorPicker/ColorPicker.svelte"
  import { createEventDispatcher } from "svelte"

  export let value: string | null = null
  export let height: string | null = null
  export let placeholder: string | null = null
  export let id: string | null = null
  export let fullScreenOffset: { x: string; y: string } | null = null
  export let disabled: boolean = false
  export let readonly: boolean = false
  export let easyMDEOptions: Record<string, any> = {}

  const dispatch = createEventDispatcher()

  let latestValue: string | null
  interface EditorInstance extends EasyMDE {
    togglePreview: () => void
    value: (_value?: string) => string
  }
  let mde: EditorInstance | null = null
  const colorDefaults = {
    text: "#d73f09",
    highlight: "#fff59d",
  } as const
  const modeConfig = {
    text: {
      toolbarButtonName: "text-color",
      wrapperTag: "span",
      stylePrefix: "color",
    },
    highlight: {
      toolbarButtonName: "text-highlight",
      wrapperTag: "mark",
      stylePrefix: "background-color",
    },
  } as const
  type ColorMode = keyof typeof colorDefaults
  interface EditorSelectionRange {
    anchor: { line: number; ch: number }
    head: { line: number; ch: number }
  }
  interface EasyMDEWithToolbar extends EasyMDE {
    toolbarElements?: Record<string, HTMLElement>
  }
  let colorPickerAnchor: HTMLDivElement | undefined = undefined
  let colorPickerX = 0
  let colorPickerY = 0
  let colorPickerKey = 0
  let activeMode: ColorMode = "text"
  let selectedColors: Record<ColorMode, string> = {
    text: colorDefaults.text,
    highlight: colorDefaults.highlight,
  }
  let pendingSelections: EditorSelectionRange[] | null = null
  let lastNonEmptySelections: EditorSelectionRange[] | null = null
  let eventsBoundTo: EditorInstance | null = null

  const cloneSelections = (selections: EditorSelectionRange[]) =>
    selections.map(selection => ({
      anchor: { ...selection.anchor },
      head: { ...selection.head },
    }))

  const hasSelectedText = (editor: EasyMDE) =>
    editor.codemirror.getSelections().some((text: string) => text.length > 0)

  const getSelections = (editor: EasyMDE) =>
    cloneSelections(
      editor.codemirror.listSelections() as EditorSelectionRange[]
    )

  const cacheSelection = () => {
    if (!mde) {
      return
    }
    if (!hasSelectedText(mde)) {
      return
    }
    lastNonEmptySelections = getSelections(mde)
  }

  const bindEditorEvents = () => {
    if (!mde || eventsBoundTo === mde) {
      return
    }
    if (eventsBoundTo) {
      eventsBoundTo.codemirror.off("blur", update)
      eventsBoundTo.codemirror.off("cursorActivity", cacheSelection)
    }
    mde.codemirror.on("blur", update)
    mde.codemirror.on("cursorActivity", cacheSelection)
    eventsBoundTo = mde
  }

  const openColorPicker = async (editor: EasyMDE, mode: ColorMode) => {
    const currentSelections = getSelections(editor)
    const activeSelections = hasSelectedText(editor)
      ? currentSelections
      : lastNonEmptySelections || currentSelections
    pendingSelections = cloneSelections(activeSelections)
    activeMode = mode
    const toolbarButtonName = modeConfig[mode].toolbarButtonName
    const toolbarButton = (editor as EasyMDEWithToolbar).toolbarElements?.[
      toolbarButtonName
    ]
    if (toolbarButton) {
      const rect = toolbarButton.getBoundingClientRect()
      colorPickerX = Math.round(rect.left + rect.width / 2)
      colorPickerY = Math.round(rect.bottom)
    }
    colorPickerKey += 1
    await tick()
    const trigger = colorPickerAnchor?.querySelector(".preview") as
      | HTMLElement
      | undefined
    trigger?.click()
  }

  const applyStyledSelections = (color: string, mode: ColorMode) => {
    if (!pendingSelections || !mde) {
      return
    }
    const safeColor = color.replace(/[<>"']/g, "")
    if (!safeColor) {
      return
    }
    mde.codemirror.focus()
    mde.codemirror.setSelections(pendingSelections)
    const selectedTexts = mde.codemirror.getSelections()
    const hasText = selectedTexts?.some((text: string) => text.length > 0)
    if (!selectedTexts?.length || !hasText) {
      pendingSelections = null
      return
    }
    const { wrapperTag, stylePrefix } = modeConfig[mode]
    const styleAttr = `${stylePrefix}: ${safeColor};`
    const replacements = selectedTexts.map(
      (text: string) =>
        `<${wrapperTag} style="${styleAttr}">${text}</${wrapperTag}>`
    )
    mde.codemirror.replaceSelections(replacements)
    pendingSelections = null
  }

  const onColorChange = (event: CustomEvent<string | undefined>) => {
    const color = event.detail?.trim()
    if (!color) {
      return
    }
    selectedColors = {
      ...selectedColors,
      [activeMode]: color,
    }
    applyStyledSelections(color, activeMode)
  }

  onDestroy(() => {
    if (!eventsBoundTo) {
      return
    }
    eventsBoundTo.codemirror.off("blur", update)
    eventsBoundTo.codemirror.off("cursorActivity", cacheSelection)
  })

  const textColorToolbarButton = {
    name: "text-color",
    action: (editor: EasyMDE) => openColorPicker(editor, "text"),
    className: "fa fa-font",
    title: "Text Color",
  }

  const highlightToolbarButton = {
    name: "text-highlight",
    action: (editor: EasyMDE) => openColorPicker(editor, "highlight"),
    className: "fa fa-paint-brush",
    title: "Highlight Color",
  }

  const defaultToolbar = [
    "bold",
    "italic",
    "heading",
    "|",
    "quote",
    "unordered-list",
    "ordered-list",
    "|",
    "link",
    "image",
    "|",
    textColorToolbarButton,
    highlightToolbarButton,
    "|",
    "preview",
    "side-by-side",
    "fullscreen",
    "|",
    "guide",
  ]

  // Ensure the value is updated if the value prop changes outside the editor's
  // control
  $: checkValue(value)
  $: bindEditorEvents()
  $: if (readonly || disabled) {
    mde?.togglePreview?.()
  }

  const checkValue = (val: string | null) => {
    if (mde && val !== latestValue) {
      mde.value(val ?? "")
    }
  }

  const update = () => {
    if (!mde) {
      return
    }
    latestValue = mde.value()
    dispatch("change", latestValue)
  }

  const getToolbar = (
    disabled: boolean,
    readonly: boolean,
    easyMDEOptions: Record<string, any>
  ) => {
    if (disabled || readonly) {
      return false
    }
    return easyMDEOptions.toolbar ?? defaultToolbar
  }
</script>

{#key height}
  <SpectrumMDE
    bind:mde
    scroll={true}
    {height}
    {id}
    {fullScreenOffset}
    {disabled}
    easyMDEOptions={{
      initialValue: value,
      placeholder,
      ...easyMDEOptions,
      toolbar: getToolbar(disabled, readonly, easyMDEOptions),
    }}
  />
{/key}

<div
  bind:this={colorPickerAnchor}
  class="budibase-color-picker-anchor"
  style={`left:${colorPickerX}px;top:${colorPickerY}px;`}
>
  {#key colorPickerKey}
    <ColorPicker
      value={selectedColors[activeMode]}
      size="S"
      on:change={onColorChange}
    />
  {/key}
</div>

<style>
  .budibase-color-picker-anchor {
    position: fixed;
    width: 1px;
    height: 1px;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
  }
</style>
