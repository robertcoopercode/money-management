import pino from "pino"

export const apiLogger = pino({
  name: "ledgr-api",
  level: process.env.LOG_LEVEL ?? "info",
})
