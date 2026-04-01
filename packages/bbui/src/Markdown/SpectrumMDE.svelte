<script lang="ts">
  import type EasyMDE from "easymde"
  import "easymde/dist/easymde.min.css"
  import { onDestroy, onMount, tick } from "svelte"
  import ColorPicker from "../ColorPicker/ColorPicker.svelte"

  export let height: string | null = null
  export let scroll: boolean = true
  export let easyMDEOptions: Record<string, any> | null = null
  interface EditorInstance extends EasyMDE {
    toolbarElements?: Record<string, HTMLElement>
  }
  interface EditorSelectionRange {
    anchor: { line: number; ch: number }
    head: { line: number; ch: number }
  }
  type ColorMode = "text" | "highlight"

  export let mde: EditorInstance | null = null
  export let id: string | null = null
  export let fullScreenOffset: { x: string; y: string } | null = null
  export let disabled: boolean = false

  let element: HTMLTextAreaElement | undefined = undefined
  let colorPickerAnchor: HTMLDivElement | undefined = undefined
  let colorPickerX = 0
  let colorPickerY = 0
  let colorPickerKey = 0
  let activeMode: ColorMode = "text"
  let selectedColors: Record<ColorMode, string> = {
    text: "#d73f09",
    highlight: "#fff59d",
  }
  let pendingSelections: EditorSelectionRange[] | null = null
  let lastNonEmptySelections: EditorSelectionRange[] | null = null
  let cursorBoundTo: EditorInstance | null = null

  const modeConfig = {
    text: {
      toolbarButtonName: "text-color",
      wrapperTag: "span",
      stylePrefix: "color",
      className: "fa fa-font",
      title: "Text Color",
    },
    highlight: {
      toolbarButtonName: "text-highlight",
      wrapperTag: "mark",
      stylePrefix: "background-color",
      className: "fa fa-paint-brush",
      title: "Highlight Color",
    },
  } as const

  const cloneSelections = (selections: EditorSelectionRange[]) =>
    selections.map(selection => ({
      anchor: { ...selection.anchor },
      head: { ...selection.head },
    }))

  const hasSelectedText = (editor: EditorInstance) =>
    editor.codemirror.getSelections().some((text: string) => text.length > 0)

  const getSelections = (editor: EditorInstance) =>
    cloneSelections(
      editor.codemirror.listSelections() as EditorSelectionRange[]
    )

  const cacheSelection = () => {
    if (!mde || !hasSelectedText(mde)) {
      return
    }
    lastNonEmptySelections = getSelections(mde)
  }

  const bindCursorListener = (editor: EditorInstance) => {
    if (cursorBoundTo === editor) {
      return
    }
    if (cursorBoundTo) {
      cursorBoundTo.codemirror.off("cursorActivity", cacheSelection)
    }
    editor.codemirror.on("cursorActivity", cacheSelection)
    cursorBoundTo = editor
  }

  const openColorPicker = async (editor: EasyMDE, mode: ColorMode) => {
    const typedEditor = editor as EditorInstance
    const currentSelections = getSelections(typedEditor)
    const activeSelections = hasSelectedText(typedEditor)
      ? currentSelections
      : lastNonEmptySelections || currentSelections
    pendingSelections = cloneSelections(activeSelections)
    activeMode = mode
    const toolbarButtonName = modeConfig[mode].toolbarButtonName
    const toolbarButton = typedEditor.toolbarElements?.[toolbarButtonName]
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

  const textColorToolbarButton = {
    name: modeConfig.text.toolbarButtonName,
    action: (editor: EasyMDE) => openColorPicker(editor, "text"),
    className: modeConfig.text.className,
    title: modeConfig.text.title,
  }

  const highlightToolbarButton = {
    name: modeConfig.highlight.toolbarButtonName,
    action: (editor: EasyMDE) => openColorPicker(editor, "highlight"),
    className: modeConfig.highlight.className,
    title: modeConfig.highlight.title,
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

  const getToolbar = (options: Record<string, any> | null) => {
    if (options?.toolbar !== undefined) {
      return options.toolbar
    }
    return defaultToolbar
  }

  onMount(async () => {
    height = height || "200px"
    const { default: EasyMDE } = await import("easymde")
    mde = new EasyMDE({
      element,
      spellChecker: false,
      status: false,
      unorderedListStyle: "-",
      maxHeight: scroll ? height : undefined,
      minHeight: scroll ? undefined : height,
      ...easyMDEOptions,
      toolbar: getToolbar(easyMDEOptions),
    })
    bindCursorListener(mde)
  })

  onDestroy(() => {
    if (cursorBoundTo) {
      cursorBoundTo.codemirror.off("cursorActivity", cacheSelection)
    }
    mde?.toTextArea()
  })

  $: styleString = getStyleString(fullScreenOffset)

  const getStyleString = (offset: { x?: string; y?: string } | null) => {
    let string = ""
    string += `--fullscreen-offset-x:${offset?.x || "0px"};`
    string += `--fullscreen-offset-y:${offset?.y || "0px"};`
    return string
  }
</script>

<div class:disabled style={styleString}>
  <textarea disabled {id} bind:this={element}></textarea>
</div>

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

  /* Disabled styles */
  .disabled :global(textarea) {
    display: none;
  }
  .disabled :global(.CodeMirror-cursor) {
    display: none;
  }
  .disabled :global(.EasyMDEContainer) {
    pointer-events: none;
  }
  .disabled :global(.editor-toolbar button i) {
    color: var(--spectrum-global-color-gray-400);
  }
  .disabled :global(.CodeMirror) {
    color: var(--spectrum-global-color-gray-600);
  }

  /* Toolbar container */
  :global(.EasyMDEContainer .editor-toolbar) {
    background: var(--spectrum-global-color-gray-50);
    border-top: 1px solid var(--spectrum-alias-border-color);
    border-left: 1px solid var(--spectrum-alias-border-color);
    border-right: 1px solid var(--spectrum-alias-border-color);
  }
  /* Main code mirror instance and default color */
  :global(.EasyMDEContainer .CodeMirror) {
    border: 1px solid var(--spectrum-alias-border-color);
    background: var(--spectrum-global-color-gray-50);
    color: var(--spectrum-alias-text-color);
  }
  /* Toolbar button active state */
  :global(.EasyMDEContainer .editor-toolbar button.active) {
    background: var(--spectrum-global-color-gray-200);
    border-color: var(--spectrum-global-color-gray-400);
  }
  /* Toolbar button hover state */
  :global(.EasyMDEContainer .editor-toolbar button:hover) {
    background: var(--spectrum-global-color-gray-200);
    border-color: var(--spectrum-global-color-gray-400);
  }
  /* Toolbar button color */
  :global(.EasyMDEContainer .editor-toolbar button) {
    color: var(--spectrum-global-color-gray-800);
  }
  /* Separator between toolbar buttons*/
  :global(.EasyMDEContainer .editor-toolbar i.separator) {
    border-color: var(--spectrum-global-color-gray-300);
  }
  /* Cursor */
  :global(.EasyMDEContainer .CodeMirror-cursor) {
    border-color: var(--spectrum-alias-text-color);
  }
  /* Text selections */
  :global(.EasyMDEContainer .CodeMirror-selectedtext) {
    background: var(--spectrum-global-color-gray-400) !important;
  }
  /* Background of lines containing selected text */
  :global(.EasyMDEContainer .CodeMirror-selected) {
    background: var(--spectrum-global-color-gray-400) !important;
  }
  /* Color of text for images and links */
  :global(.EasyMDEContainer .cm-s-easymde .cm-link) {
    color: var(--spectrum-global-color-gray-600);
  }
  /* Color of URL for images and links */
  :global(.EasyMDEContainer .cm-s-easymde .cm-url) {
    color: var(--spectrum-global-color-gray-500);
  }
  /* Markdown italics in the editor */
  :global(.EasyMDEContainer .cm-s-easymde .cm-em) {
    font-style: italic !important;
  }
  /* Full preview window */
  :global(.EasyMDEContainer .editor-preview) {
    background: var(--spectrum-global-color-gray-50);
  }
  /* Side by side preview window */
  :global(.EasyMDEContainer .editor-preview) {
    border: 1px solid var(--spectrum-alias-border-color);
  }
  /* Code blocks in editor */
  :global(.EasyMDEContainer .cm-s-easymde .cm-comment) {
    background: var(--spectrum-global-color-gray-100);
  }
  /* Code blocks in preview */
  :global(.EasyMDEContainer pre) {
    background: var(--spectrum-global-color-gray-100);
    padding: 4px;
    border-radius: 4px;
  }
  :global(.EasyMDEContainer code) {
    color: #e83e8c;
  }
  :global(.EasyMDEContainer pre code) {
    color: var(--spectrum-alias-text-color);
  }
  /* Block quotes */
  :global(.EasyMDEContainer blockquote) {
    border-left: 4px solid var(--spectrum-global-color-gray-400);
    color: var(--spectrum-global-color-gray-700);
    margin-left: 0;
    padding-left: 20px;
  }
  /* HR's */
  :global(.EasyMDEContainer hr) {
    background-color: var(--spectrum-global-color-gray-300);
    border: none;
    height: 2px;
  }
  /*  Tables */
  :global(.EasyMDEContainer td, .EasyMDEContainer th) {
    border-color: var(--spectrum-alias-border-color) !important;
  }
  /*  Links */
  :global(.EasyMDEContainer a) {
    color: var(--primaryColor);
  }
  :global(.EasyMDEContainer a:hover) {
    color: var(--primaryColorHover);
  }
  /* Markdown italics */
  :global(.EasyMDEContainer .editor-preview em),
  :global(.EasyMDEContainer .editor-preview i),
  :global(.EasyMDEContainer .editor-preview-side em),
  :global(.EasyMDEContainer .editor-preview-side i) {
    font-style: italic !important;
  }
  /* Allow full screen offset */
  :global(.EasyMDEContainer .editor-toolbar.fullscreen) {
    left: var(--fullscreen-offset-x);
    top: var(--fullscreen-offset-y);
  }
  :global(.EasyMDEContainer .CodeMirror-fullscreen) {
    left: var(--fullscreen-offset-x);
    top: calc(50px + var(--fullscreen-offset-y));
  }

  :global(.EasyMDEContainer .CodeMirror-fullscreen.CodeMirror-sided) {
    width: calc((100% - var(--fullscreen-offset-x)) / 2) !important;
  }

  :global(.EasyMDEContainer .editor-preview-side) {
    left: calc(50% + (var(--fullscreen-offset-x) / 2));
    top: calc(50px + var(--fullscreen-offset-y));
    width: calc((100% - var(--fullscreen-offset-x)) / 2) !important;
  }
</style>
