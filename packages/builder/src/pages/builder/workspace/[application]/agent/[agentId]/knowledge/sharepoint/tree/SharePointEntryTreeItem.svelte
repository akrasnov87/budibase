<script lang="ts">
  import { KnowledgeBaseFileStatus } from "@budibase/types"
  import {
    Body,
    Modal,
    ModalContent,
    StatusLight,
    TreeItem,
  } from "@budibase/bbui"
  import SharePointEntryTreeItem from "./SharePointEntryTreeItem.svelte"
  import type { SharePointEntryTreeNode } from "./sharePointEntryTree"

  export interface Props {
    node: SharePointEntryTreeNode
    selectedPaths?: string[]
    onTogglePaths?: (_paths: string[], _nextSelected: boolean) => void
    showStatus?: boolean
  }

  let {
    node,
    selectedPaths,
    onTogglePaths,
    showStatus = true,
  }: Props = $props()

  const getSharePointStatusText = (
    status?: SharePointEntryTreeNode["status"]
  ) => {
    switch (status) {
      case KnowledgeBaseFileStatus.PROCESSING:
        return "Processing"
      case KnowledgeBaseFileStatus.READY:
        return "Ready"
      case KnowledgeBaseFileStatus.FAILED:
        return "Failed"
      default:
        return undefined
    }
  }

  const getSharePointStatusLightProps = (
    status?: SharePointEntryTreeNode["status"]
  ) => {
    switch (status) {
      case KnowledgeBaseFileStatus.READY:
        return { positive: true }
      case KnowledgeBaseFileStatus.FAILED:
        return { negative: true }
      default:
        return { notice: true }
    }
  }

  let errorModal = $state<Modal>()
  let hasChildren = $derived(node.children.length > 0)
  let hasError = $derived(
    node.status === KnowledgeBaseFileStatus.FAILED && !!node.errorMessage
  )

  const openErrorModal = (event: MouseEvent | KeyboardEvent) => {
    event.preventDefault()
    event.stopPropagation()
    errorModal?.show()
  }
</script>

<div class="sharepoint-entry-tree-item">
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <TreeItem
    title={node.name}
    open={hasChildren}
    {hasChildren}
    on:click={openErrorModal}
  >
    <svelte:fragment slot="post">
      {#if showStatus && node.type === "file" && getSharePointStatusText(node.status)}
        <StatusLight size="S" {...getSharePointStatusLightProps(node.status)}>
          {getSharePointStatusText(node.status)}
        </StatusLight>
      {/if}
    </svelte:fragment>

    {#if hasChildren}
      {#each node.children as child (child.path)}
        <SharePointEntryTreeItem
          node={child}
          {selectedPaths}
          {onTogglePaths}
          {showStatus}
        />
      {/each}
    {/if}
  </TreeItem>

  {#if hasError}
    <Modal bind:this={errorModal}>
      <ModalContent
        title={`SharePoint sync error - ${node.name}`}
        showDivider={false}
        size="L"
        showCloseIcon
        showConfirmButton={false}
        showCancelButton={false}
      >
        <Body size="S">The file failed to sync with this error:</Body>
        <pre class="error-detail">{node.errorMessage}</pre>
      </ModalContent>
    </Modal>
  {/if}
</div>

<style>
  .error-detail {
    margin-top: 0;
    max-height: 320px;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--spectrum-semantic-negative-color-default);
    border: 1px solid var(--spectrum-global-color-gray-300);
    border-radius: 6px;
    padding: var(--spacing-m);
    font-size: 12px;
    line-height: 1.4;
  }

  .sharepoint-entry-tree-item :global(.spectrum-TreeView-itemLink) {
    padding-inline-end: 8px;
  }
</style>
