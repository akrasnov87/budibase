import Router from "@koa/router"
import * as controller from "../controllers/filer"
import { authorizedMiddleware as authorized } from "../../middleware/authorized"
import { permissions } from "@budibase/backend-core"

const router: Router = new Router()

router
  .post(
    "/api/filer/:folder",
    authorized(permissions.GLOBAL_BUILDER),
    controller.upload
  )
  .get("/api/filer/list/:folder", authorized(permissions.GLOBAL_BUILDER), controller.fetch)
  .delete(
    "/api/filer/:filePath",
    authorized(permissions.GLOBAL_BUILDER),
    controller.destroy
  )
  .get("/api/filer/:filePath", 
    authorized(permissions.GLOBAL_BUILDER), 
    controller.get)

export default router
