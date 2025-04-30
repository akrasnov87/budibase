var i18n = require("i18n")

export function initJSLocales(defaultLocale) {
  /**
   * configure shared state
   */
  i18n.configure({
    staticCatalog: {
      ru: require("../locales/ru.json"),
      en: require("../locales/en.json"),
    },
    defaultLocale: defaultLocale || "en",
  })
}
