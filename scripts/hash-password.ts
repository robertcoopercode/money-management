import { createInterface } from "node:readline"
import { hash } from "@node-rs/argon2"

function readLines(): Promise<string[]> {
  return new Promise((resolve) => {
    const lines: string[] = []
    const rl = createInterface({ input: process.stdin })
    rl.on("line", (line) => lines.push(line))
    rl.on("close", () => resolve(lines))
  })
}

function readHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding("utf8")

    let input = ""
    const onData = (ch: string) => {
      const c = ch.toString()
      if (c === "\n" || c === "\r" || c === "\u0004") {
        process.stdin.setRawMode(false)
        process.stdin.pause()
        process.stdin.removeListener("data", onData)
        process.stdout.write("\n")
        resolve(input)
      } else if (c === "\u0003") {
        process.stdout.write("\n")
        process.exit(1)
      } else if (c === "\u007F" || c === "\b") {
        if (input.length > 0) {
          input = input.slice(0, -1)
        }
      } else {
        input += c
      }
    }
    process.stdin.on("data", onData)
  })
}

async function main() {
  let password: string
  let confirm: string

  if (process.stdin.isTTY) {
    password = await readHidden("Enter password: ")
    confirm = await readHidden("Confirm password: ")
  } else {
    const lines = await readLines()
    password = lines[0] ?? ""
    confirm = lines[1] ?? ""
  }

  if (!password) {
    console.error("Password cannot be empty.")
    process.exit(1)
  }

  if (password !== confirm) {
    console.error("Passwords do not match.")
    process.exit(1)
  }

  const passwordHash = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  })

  console.log("\nYour AUTH_PASSWORD_HASH:\n")
  console.log(passwordHash)
  console.log(
    "\nPaste this value into your AUTH_PASSWORD_HASH environment variable.",
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
