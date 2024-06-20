import { bootstrap } from "global-agent"
import { checkDevelopmentEnvironment } from "./utilities/fileSystem"
const i18n = require("i18n")

/**
 * configure shared state
 */
i18n.configure({
  staticCatalog: {
    ru: require("../../../locales/ru.json"),
    en: require("../../../locales/en.json"),
  },
  defaultLocale: "en",
})

function runServer() {
  // this will shutdown the system if development environment not ready
  // will print an error explaining what to do
  checkDevelopmentEnvironment()

  // this will setup http and https proxies form env variables
  process.env.GLOBAL_AGENT_FORCE_GLOBAL_AGENT = "false"
  bootstrap()
  require("./app")
}

runServer()
