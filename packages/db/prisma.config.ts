import path from "node:path"
import { defineConfig } from "prisma/config"
import { loadEnvFile } from "node:process"

try {
  loadEnvFile(path.join(__dirname, "../../.env"))
} catch {}

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
})
