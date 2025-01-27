import env from "../../environment"

import * as fs from 'fs';
import {join, basename} from 'path';
import { streamFile } from "../../utilities/fileSystem"

const root = env.EXPLORER_DIR;

export async function upload(ctx: any) {
  if(root) {
    const { folder } = ctx.params

    const fullPath = join(root, folder);

    if(fullPath.indexOf(root) == 0) {
        const files: any[] =
            ctx.request.files.file.length > 1
            ? Array.from(ctx.request.files.file)
            : [ctx.request.files.file]
        
        let docs = []
        // can do single or multiple plugins
        for (let file of files) {
            await fs.promises.rename(file.path, join(fullPath, file.name));
            docs.push(file.name)
        }
        ctx.body = {
            message: "File(s) uploaded successfully",
            plugins: docs,
        }
    }
  } else {
    ctx.throw(404, `Root folder not found. Please add EXPLORER_DIR environment.`)
  }
}

export async function fetch(ctx: any) {
  if(root) {
    const { folder } = ctx.params

    const fullPath = join(root, folder);

    if(fullPath.indexOf(root) == 0) {
      ctx.body = await fs.promises.readdir(fullPath)
    } else {
      ctx.throw(404, `Folder out from root folder`)
    }
  } else {
    ctx.throw(404, `Root folder not found. Please add EXPLORER_DIR environment.`)
  }
}

export async function get(ctx: any) {
  if(root) {
    const { filePath } = ctx.params

    const fullPath = join(root, filePath);

    if(fullPath.indexOf(root) == 0) {
      ctx.attachment(basename(fullPath));
      ctx.body = streamFile(fullPath);
    } else {
      ctx.throw(404, `File out from root folder`)
    }
  } else {
    ctx.throw(404, `Root folder not found. Please add EXPLORER_DIR environment.`)
  }
}

export async function destroy(ctx: any) {
  if(root) {
    const { filePath } = ctx.params

    const fullPath = join(root, filePath);

    if(fullPath.indexOf(root) == 0) {
      if(fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        ctx.body = { message: `File ${filePath} deleted.` }
      } else {
        ctx.throw(404, `File ${filePath} not found.`)
      }
    } else {
      ctx.throw(404, `File out from root folder`)
    }
  } else {
    ctx.throw(404, `Root folder not found. Please add EXPLORER_DIR environment.`)
  }
}
