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

  let creating = $state(false)
  let editingConnectionId = $state<string | null>(null)
  let manualAccount = $state("")
  let manualTenantId = $state("common")
  let manualTokenEndpoint = $state(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token"
  )
  let manualClientId = $state("")
  let manualClientSecret = $state("")
  let manualScope = $state("https://graph.microsoft.com/.default")

  const validator = z.object({
    manualAccount: z.string().trim().min(1),
    manualTenantId: z.string().trim().min(1),
    manualTokenEndpoint: z.string().trim().url(),
    manualClientId: z.string().trim().min(1),
    manualClientSecret: z.string().trim().min(1),
  })

  let validationResult = $derived(
    validator.safeParse({
      manualAccount,
      manualTenantId,
      manualTokenEndpoint,
      manualClientId,
      manualClientSecret,
    })
  )

  const getErrorMessage = (error: unknown, fallback: string): string => {
    const asAny = error as any
    return asAny?.cause?.message || asAny?.message || fallback
  }

  const createConnection = async () => {
    await knowledgeConnectionsStore.create({
      sourceType: AgentKnowledgeSourceType.SHAREPOINT,
      authType: AgentKnowledgeSourceConnectionAuthType.CLIENT_CREDENTIALS,
      account: manualAccount.trim(),
      tenantId: manualTenantId.trim(),
      tokenEndpoint: manualTokenEndpoint.trim(),
      clientId: manualClientId.trim(),
      clientSecret: manualClientSecret.trim(),
      scope: manualScope.trim() || undefined,
    })
    notifications.success("Knowledge connection created")
  }

  const updateConnection = async (connectionId: string) => {
    await knowledgeConnectionsStore.updateConnection(connectionId, {
      account: manualAccount.trim(),
      tenantId: manualTenantId.trim(),
      tokenEndpoint: manualTokenEndpoint.trim(),
      clientId: manualClientId.trim(),
      clientSecret: manualClientSecret.trim(),
      scope: manualScope.trim() || undefined,
    })
    notifications.success("Knowledge connection updated")
  }

  const submitConnection = async () => {
    if (!validationResult.success) {
      notifications.error("Please complete all required fields")
      return
    }
    creating = true
    try {
      if (editingConnectionId) {
        await updateConnection(editingConnectionId)
      } else {
        await createConnection()
      }
      bb.settings("/connections/knowledge")
    } catch (error) {
      const actionLabel = editingConnectionId ? "update" : "create"
      console.error(`Failed to ${actionLabel} knowledge connection`, error)
      notifications.error(
        getErrorMessage(error, `Failed to ${actionLabel} knowledge connection`)
      )
    } finally {
      creating = false
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
      manualAccount = existing.account || ""
      manualTenantId = existing.tenantId || "common"
      manualTokenEndpoint = existing.tokenEndpoint || manualTokenEndpoint
      manualClientId = existing.clientId || ""
      manualClientSecret = existing.clientSecret || ""
      manualScope = existing.scope || "https://graph.microsoft.com/.default"
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
        disabled={creating || !validationResult.success}
      >
        {creating
          ? editingConnectionId
            ? "Saving..."
            : "Creating..."
          : editingConnectionId
            ? "Save connection"
            : "Create connection"}
      </Button>
    </div>
  </RouteActions>
  <Input label="Account label" required bind:value={manualAccount} />
  <Input label="Tenant ID" required bind:value={manualTenantId} />
  <Input label="Token endpoint" required bind:value={manualTokenEndpoint} />
  <EnvVariableInput label="Client ID" required bind:value={manualClientId} />
  <EnvVariableInput
    label="Client secret"
    required
    type="password"
    bind:value={manualClientSecret}
  />
  <Input label="Scope" bind:value={manualScope} />
</Layout>

<style>
  .actions {
    display: flex;
    gap: var(--spacing-s);
  }
</style>
