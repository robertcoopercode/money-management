if (process.env.NODE_ENV !== "production") {
  const { resolve } = await import("node:path")
  const dotenv = await import("dotenv")
  dotenv.config({ path: resolve(import.meta.dirname, "../../../.env") })
}
