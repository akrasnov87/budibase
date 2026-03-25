<script lang="ts">
  import type EasyMDE from "easymde"
  import SpectrumMDE from "./SpectrumMDE.svelte"
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
  let mde: any
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
  interface EasyMDEWithToolbar extends EasyMDE {
    toolbarElements?: Record<string, HTMLElement>
  }
  let colorInput: HTMLInputElement | undefined = undefined
  let activeMode: ColorMode = "text"
  let selectedColors: Record<ColorMode, string> = {
    text: colorDefaults.text,
    highlight: colorDefaults.highlight,
  }
  let pendingSelections: any[] | null = null
  let lastNonEmptySelections: any[] | null = null
  let eventsBoundTo: EasyMDE | null = null

  const cloneSelections = (selections: any[]) =>
    selections.map(selection => ({
      anchor: { ...selection.anchor },
      head: { ...selection.head },
    }))

  const cacheSelection = () => {
    if (!mde) {
      return
    }
    const hasSelectedText = mde.codemirror
      .getSelections()
      .some((text: string) => text.length > 0)
    if (!hasSelectedText) {
      return
    }
    lastNonEmptySelections = cloneSelections(mde.codemirror.listSelections())
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

  const openColorPicker = (editor: EasyMDE, mode: ColorMode) => {
    const currentSelections = editor.codemirror.listSelections()
    const hasSelectedText = editor.codemirror
      .getSelections()
      .some((text: string) => text.length > 0)
    const activeSelections = hasSelectedText
      ? currentSelections
      : lastNonEmptySelections || currentSelections
    pendingSelections = cloneSelections(activeSelections)
    const picker = colorInput
    if (!picker) {
      return
    }
    activeMode = mode
    picker.value = selectedColors[mode]
    const toolbarButtonName = modeConfig[mode].toolbarButtonName
    const toolbarButton = (editor as EasyMDEWithToolbar).toolbarElements?.[
      toolbarButtonName
    ]
    if (toolbarButton) {
      const rect = toolbarButton.getBoundingClientRect()
      picker.style.left = `${Math.round(rect.left + rect.width / 2)}px`
      picker.style.top = `${Math.round(rect.bottom)}px`
    }
    picker.focus()
    try {
      if (typeof picker.showPicker === "function") {
        picker.showPicker()
        return
      }
      picker.click()
    } catch (_err) {
      picker.click()
    }
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
      (text: string) => `<${wrapperTag} style="${styleAttr}">${text}</${wrapperTag}>`
    )
    mde.codemirror.replaceSelections(replacements)
    pendingSelections = null
  }

  const onColorChange = (event: Event) => {
    const color = (event.target as HTMLInputElement).value?.trim()
    if (!color) {
      return
    }
    selectedColors = {
      ...selectedColors,
      [activeMode]: color,
    }
    applyStyledSelections(color, activeMode)
  }

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
    mde?.togglePreview()
  }

  const checkValue = (val: string | null) => {
    if (mde && val !== latestValue) {
      mde.value(val)
    }
  }

  const update = () => {
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

<input
  bind:this={colorInput}
  class="native-color-picker"
  type="color"
  value={selectedColors[activeMode]}
  on:input={onColorChange}
  on:change={onColorChange}
/>

<style>
  .native-color-picker {
    position: fixed;
    top: 0;
    left: 0;
    width: 1px;
    height: 1px;
    opacity: 0;
    border: 0;
    padding: 0;
  }
</style>
