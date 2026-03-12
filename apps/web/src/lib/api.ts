export const TRANSACTION_PAGE_SIZE = 100

export const apiFetch = async <T,>(
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || "Request failed.")
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
