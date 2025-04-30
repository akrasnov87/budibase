import { register, init, getLocaleFromNavigator } from "svelte-i18n"

export function initSvelteLocales() {
  register("en", () => import(`../locales/en.json`))
  register("ru", () => import(`../locales/ru.json`))

  init({
    //fallbackLocale: "en",
    initialLocale: window.BB.lang || getLocaleFromNavigator(),
  })
}
