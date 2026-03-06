import pino from "pino"

export const apiLogger = pino({
  name: "money-management-api",
  level: process.env.LOG_LEVEL ?? "info",
})
