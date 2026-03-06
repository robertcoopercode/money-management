import path from "node:path"
import { loadEnvFile } from "node:process"

const envPath = path.resolve(import.meta.dirname, "../../../.env")

try {
  loadEnvFile(envPath)
} catch {}
