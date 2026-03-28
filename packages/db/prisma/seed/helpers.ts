import { randomUUID } from "node:crypto"

function mulberry32(seed: number) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return hash
}

const rng = mulberry32(hashString("ledgr-demo"))

export function random(): number {
  return rng()
}

export function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min
}

export function randomChoice<T>(arr: readonly T[]): T {
  return arr[Math.floor(random() * arr.length)] as T
}

export function weightedChoice<T>(items: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((sum, w) => sum + w, 0)
  let r = random() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i] ?? 0
    if (r <= 0) return items[i] as T
  }
  return items[items.length - 1] as T
}

export function randomDate(year: number, month: number, dayMin: number, dayMax: number): Date {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const clampedMax = Math.min(dayMax, daysInMonth)
  const day = randomInt(dayMin, clampedMax)
  return new Date(year, month, day)
}

export type MonthKey = `${number}-${string}`

export function monthsInRange(today: Date): MonthKey[] {
  const keys: MonthKey[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const m = String(d.getMonth() + 1).padStart(2, "0")
    keys.push(`${d.getFullYear()}-${m}`)
  }
  return keys
}

export function startOfRange(today: Date): Date {
  return new Date(today.getFullYear(), today.getMonth() - 5, 1)
}

export function parseMonthKey(key: MonthKey): { year: number; month: number } {
  const [y, m] = key.split("-")
  return { year: Number(y), month: Number(m) - 1 }
}

export type ClearingStatus = "UNCLEARED" | "CLEARED" | "RECONCILED"

export function clearingStatusForDate(txDate: Date, today: Date): ClearingStatus {
  const diffMs = today.getTime() - txDate.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  if (diffDays > 14) return "RECONCILED"
  if (diffDays >= 3) return "CLEARED"
  return "UNCLEARED"
}

export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, "")
}

export function generateTransferPairId(): string {
  return randomUUID()
}
