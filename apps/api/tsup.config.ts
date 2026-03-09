import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  target: "node20",
  platform: "node",
  outDir: "dist",
  clean: true,
  noExternal: ["@ledgr/db", "@ledgr/shared"],
  external: [/^@prisma\/client/, /^@prisma\/adapter-pg/, /^pg$/],
})
