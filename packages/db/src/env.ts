if (process.env.NODE_ENV !== "production") {
  const path = await import("node:path")
  const { loadEnvFile } = await import("node:process")

  const envPath = path.resolve(import.meta.dirname, "../../../.env")

  try {
    loadEnvFile(envPath)
  } catch {}
}
