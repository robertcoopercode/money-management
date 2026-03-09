import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  target: "node20",
  platform: "node",
  outDir: "dist",
  clean: true,
  deps: {
    alwaysBundle: ["@ledgr/db", "@ledgr/shared"],
    neverBundle: [/^@prisma\/client/, /^@prisma\/adapter-pg/, /^pg$/],
  },
})
