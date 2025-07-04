<script>
  import {
    Body,
    Button,
    Heading,
    Layout,
    ProgressCircle,
    notifications,
  } from "@budibase/bbui"
  import { goto, params } from "@roxi/routify"
  import { auth, organisation, admin } from "@/stores/portal"
  import Logo from "assets/bb-emblem.svg"
  import { TestimonialPage, PasswordRepeatInput } from "@budibase/frontend-core"
  import { onMount } from "svelte"

  const resetCode = $params["?code"]
  let form
  let loaded = false
  let loading = false
  let password
  let passwordError

  $: forceResetPassword = $auth?.user?.forceResetPassword

  async function reset() {
    if (!form.validate() || passwordError) {
      return
    }
    try {
      loading = true
      if (forceResetPassword) {
        const email = $auth.user.email
        const tenantId = $auth.user.tenantId
        await auth.updateSelf({
          password,
          forceResetPassword: false,
        })
        if (!$auth.user) {
          // Update self will clear the platform user, so need to login
          await auth.login(email, password, tenantId)
        }
        $goto("../portal/")
      } else {
        await auth.resetPassword(password, resetCode)
        notifications.success("Password reset successfully")
        // send them to login if reset successful
        $goto("./login")
      }
    } catch (err) {
      loading = false
      notifications.error(err.message || "Unable to reset password")
    }
  }

  onMount(async () => {
    try {
      await auth.getSelf()
      await organisation.init()
    } catch (error) {
      notifications.error("Error getting org config")
    }
    loaded = true
  })

  const handleKeydown = evt => {
    if (evt.key === "Enter") {
      reset()
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />
<TestimonialPage enabled={$organisation.testimonialsEnabled}>
  <Layout gap="S" noPadding>
    {#if loaded}
      <img alt="logo" src={$organisation.logoUrl || Logo} />
    {/if}
    <Layout gap="S" noPadding>
      <Heading size="M">Reset your password</Heading>
      <Body size="M">Must contain at least {$admin.passwordMinLength || 12} characters</Body>
      <PasswordRepeatInput
        bind:passwordForm={form}
        bind:password
        bind:error={passwordError}
        minLength={$admin.passwordMinLength || 12}
      />
      <Button secondary cta on:click={reset}>
        {#if loading}
          <ProgressCircle overBackground={true} size="S" />
        {:else}
          Reset
        {/if}
      </Button>
    </Layout>
    <div />
  </Layout>
</TestimonialPage>

<style>
  img {
    width: 48px;
  }
</style>
