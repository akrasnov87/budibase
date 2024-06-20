<script>
  import { Router } from "@roxi/routify"
  import { routes } from "../.routify/routes"
  import { NotificationDisplay, BannerDisplay } from "@budibase/bbui"
  import { parse, stringify } from "qs"
  import LicensingOverlays from "components/portal/licensing/LicensingOverlays.svelte"

  const queryHandler = { parse, stringify }

  import { register, init, getLocaleFromNavigator } from "svelte-i18n"

  register("en", () => import("../../../locales/en.json"))
  register("ru", () => import("../../../locales/ru.json"))

  init({
    fallbackLocale: "en",
    initialLocale: window.BB.lang || getLocaleFromNavigator(),
  })
</script>

<div class="banner-container" />
<BannerDisplay />
<NotificationDisplay />
<LicensingOverlays />
<Router {routes} config={{ queryHandler }} />
<div class="modal-container" />

<style>
  .modal-container {
    position: absolute;
  }
</style>
