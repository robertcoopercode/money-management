import { useState } from "react"
import { TextInput } from "../components/text-input.js"

type LoginPageProps = {
  onSuccess: () => void
}

export const LoginPage = ({ onSuccess }: LoginPageProps) => {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.message ?? "Login failed.")
        return
      }

      onSuccess()
    } catch {
      setError("Unable to connect to server.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <img className="brand-mark" src="/ledgr-favicon.svg" alt="Ledgr logo" />
        <h1>Ledgr</h1>
        <form onSubmit={handleSubmit}>
          <TextInput
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </button>
          {error && <p className="login-error">{error}</p>}
        </form>
      </div>
    </div>
  )
}
