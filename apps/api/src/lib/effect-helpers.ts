import { Effect } from "effect"

export const runApiEffect = <A>(effect: Effect.Effect<A, Error>) => {
  return Effect.runPromise(effect)
}

export const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error
  }

  return new Error("Unknown error")
}
