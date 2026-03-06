import type { Context } from "hono"
import type { z } from "zod"

export const parseJson = async <T extends z.ZodTypeAny,>(
  context: Context,
  schema: T,
): Promise<z.infer<T>> => {
  const payload = await context.req.json()
  return schema.parse(payload)
}

export const parseQuery = <T extends z.ZodTypeAny,>(
  context: Context,
  schema: T,
): z.infer<T> => {
  const entries = Object.fromEntries(
    new URL(context.req.url).searchParams.entries(),
  )
  return schema.parse(entries)
}
