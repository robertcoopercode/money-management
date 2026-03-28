import path from "node:path"
import { loadEnvFile } from "node:process"
import { defineConfig } from "prisma/config"

try {
  loadEnvFile(path.join(__dirname, "../../.env"))
} catch {}

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL!,
    directUrl: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL!,
  },
})
