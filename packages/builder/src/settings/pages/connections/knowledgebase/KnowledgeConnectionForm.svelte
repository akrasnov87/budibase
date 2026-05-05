<script lang="ts">
  import RouteActions from "@/settings/components/RouteActions.svelte"
  import EnvVariableInput from "@/components/portal/environment/EnvVariableInput.svelte"
  import { bb } from "@/stores/bb"
  import { knowledgeConnectionsStore } from "@/stores/portal"
  import { onMount } from "svelte"
  import { Button, Input, Layout, notifications } from "@budibase/bbui"
  import {
    AgentKnowledgeSourceConnectionAuthType,
    AgentKnowledgeSourceType,
  } from "@budibase/types"
  import { z } from "zod"

  export interface Props {
    connectionId?: string
  }

  let { connectionId }: Props = $props()

  interface ConnectionDraft {
    account: string
    tokenEndpoint: string
    clientId: string
    clientSecret: string
    scope: string
  }

  const createDraft = (): ConnectionDraft => ({
    account: "",
    tokenEndpoint:
      "https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token",
    clientId: "",
    clientSecret: "",
    scope: "https://graph.microsoft.com/.default",
  })

  let submitting = $state(false)
  let editingConnectionId = $state<string | null>(null)
  let isEdit = $derived(!!editingConnectionId)
  let submitLabel = $derived.by(() => {
    if (submitting) {
      return isEdit ? "Saving..." : "Creating..."
    }
    return isEdit ? "Save connection" : "Create connection"
  })
  let draft = $state<ConnectionDraft>(createDraft())

  const validator = z.object({
    account: z.string().trim().min(1),
    tokenEndpoint: z.string().trim().url(),
    clientId: z.string().trim().min(1),
    clientSecret: z.string().trim().min(1),
  })

  let validationResult = $derived(validator.safeParse(draft))

  const getErrorMessage = (error: unknown, fallback: string): string => {
    const asAny = error as any
    return asAny?.cause?.message || asAny?.message || fallback
  }

  const createConnection = async () => {
    await knowledgeConnectionsStore.create({
      sourceType: AgentKnowledgeSourceType.SHAREPOINT,
      authType: AgentKnowledgeSourceConnectionAuthType.CLIENT_CREDENTIALS,
      account: draft.account.trim(),
      tokenEndpoint: draft.tokenEndpoint.trim(),
      clientId: draft.clientId.trim(),
      clientSecret: draft.clientSecret.trim(),
      scope: draft.scope.trim() || undefined,
    })
    notifications.success("Knowledge connection created")
  }

  const updateConnection = async (connectionId: string) => {
    await knowledgeConnectionsStore.updateConnection(connectionId, {
      account: draft.account.trim(),
      tokenEndpoint: draft.tokenEndpoint.trim(),
      clientId: draft.clientId.trim(),
      clientSecret: draft.clientSecret.trim(),
      scope: draft.scope.trim() || undefined,
    })
    notifications.success("Knowledge connection updated")
  }

  const submitConnection = async () => {
    if (!validationResult.success) {
      notifications.error("Please complete all required fields")
      return
    }
    submitting = true
    try {
      if (isEdit && editingConnectionId) {
        await updateConnection(editingConnectionId)
      } else {
        await createConnection()
      }
      bb.settings("/connections/knowledge")
    } catch (error) {
      const actionLabel = isEdit ? "update" : "create"
      console.error(`Failed to ${actionLabel} knowledge connection`, error)
      notifications.error(
        getErrorMessage(error, `Failed to ${actionLabel} knowledge connection`)
      )
    } finally {
      submitting = false
    }
  }

  onMount(async () => {
    if (!connectionId || connectionId === "new") {
      return
    }
    editingConnectionId = connectionId
    try {
      if (!$knowledgeConnectionsStore.loaded) {
        await knowledgeConnectionsStore.fetch()
      }
      const existing = $knowledgeConnectionsStore.connections.find(
        connection => connection._id === connectionId
      )
      if (!existing) {
        notifications.error("Knowledge connection not found")
        bb.settings("/connections/knowledge")
        return
      }
      if (
        existing.authType ===
        AgentKnowledgeSourceConnectionAuthType.DELEGATED_OAUTH
      ) {
        notifications.error(
          "OAuth delegated connections cannot be edited here. Reconnect instead."
        )
        bb.settings("/connections/knowledge")
        return
      }
      draft = {
        account: existing.account || "",
        tokenEndpoint: existing.tokenEndpoint || createDraft().tokenEndpoint,
        clientId: existing.clientId || "",
        clientSecret: existing.clientSecret || "",
        scope: existing.scope || createDraft().scope,
      }
    } catch (error) {
      console.error("Failed to load knowledge connection", error)
      notifications.error(
        getErrorMessage(error, "Failed to load knowledge connection")
      )
      bb.settings("/connections/knowledge")
    }
  })
</script>

<Layout noPadding gap="XS">
  <RouteActions>
    <div class="actions">
      <Button
        cta
        on:click={submitConnection}
        disabled={submitting || !validationResult.success}
      >
        {submitLabel}
      </Button>
    </div>
  </RouteActions>
  <Input label="Account label" required bind:value={draft.account} />
  <Input label="Token endpoint" required bind:value={draft.tokenEndpoint} />
  <EnvVariableInput label="Client ID" required bind:value={draft.clientId} />
  <EnvVariableInput
    label="Client secret"
    required
    type="password"
    bind:value={draft.clientSecret}
  />
  <Input label="Scope" bind:value={draft.scope} />
</Layout>

<style>
  .actions {
    display: flex;
    gap: var(--spacing-s);
  }
</style>
