import { cp, mkdir, rm, writeFile } from "node:fs/promises"

await rm("dist", { recursive: true, force: true })
await cp(".open-next", "dist", { recursive: true })
await mkdir("dist/server", { recursive: true })
await writeFile(
  "dist/server/index.js",
  'export { default } from "../worker.js"\n',
  "utf8"
)
