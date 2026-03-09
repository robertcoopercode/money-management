import { createHash, getRandomValues } from "node:crypto"

import { prisma } from "@ledgr/db"

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const SESSION_HALFWAY_MS = SESSION_DURATION_MS / 2

const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567"

function encodeBase32(bytes: Uint8Array): string {
  let result = ""
  let bits = 0
  let value = 0

  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      result += BASE32_ALPHABET[(value >>> bits) & 0x1f]
    }
  }

  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f]
  }

  return result
}

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20)
  getRandomValues(bytes)
  return encodeBase32(bytes)
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export async function createSession(token: string) {
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

  return prisma.session.create({
    data: { tokenHash, expiresAt },
  })
}

export async function validateSession(token: string) {
  const tokenHash = hashToken(token)

  const session = await prisma.session.findUnique({
    where: { tokenHash },
  })

  if (!session || session.expiresAt < new Date()) {
    return null
  }

  const elapsed = Date.now() - session.createdAt.getTime()
  if (elapsed > SESSION_HALFWAY_MS) {
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() + SESSION_DURATION_MS) },
    })
  }

  return session
}

export async function deleteSession(token: string) {
  const tokenHash = hashToken(token)
  await prisma.session.deleteMany({ where: { tokenHash } })
}

export async function deleteExpiredSessions() {
  await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
}
