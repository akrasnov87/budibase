<script lang="ts">
  import RouteActions from "@/settings/components/RouteActions.svelte"
  import { bb } from "@/stores/bb"
  import { knowledgeConnectionsStore } from "@/stores/portal"
  import { Button, Input, Layout, notifications } from "@budibase/bbui"
  import {
    AgentKnowledgeSourceConnectionAuthType,
    AgentKnowledgeSourceType,
  } from "@budibase/types"
  import { z } from "zod"

  let creating = $state(false)
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
    if (!validationResult.success) {
      notifications.error("Please complete all required fields")
      return
    }
    creating = true
    try {
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
      bb.settings("/connections/knowledge")
    } catch (error) {
      console.error("Failed to create knowledge connection", error)
      notifications.error(
        getErrorMessage(error, "Failed to create knowledge connection")
      )
    } finally {
      creating = false
    }
  }
</script>

<Layout noPadding gap="M">
  <RouteActions>
    <div class="actions">
      <Button
        cta
        on:click={createConnection}
        disabled={creating || !validationResult.success}
      >
        {creating ? "Creating..." : "Create connection"}
      </Button>
    </div>
  </RouteActions>
  <Input label="Account label" required bind:value={manualAccount} />
  <Input label="Tenant ID" required bind:value={manualTenantId} />
  <Input label="Token endpoint" required bind:value={manualTokenEndpoint} />
  <Input label="Client ID" required bind:value={manualClientId} />
  <Input
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
