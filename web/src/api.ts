import type { ParseResult, Settings, Shipment } from "./types"

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `Erreur ${res.status}`)
  }
  return res.json()
}

export const api = {
  settings: () => req<Settings>("/api/settings"),
  shipments: (q = "", status = "") =>
    req<Shipment[]>(`/api/shipments?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`),
  shipment: (id: string) => req<Shipment>(`/api/shipments/${encodeURIComponent(id)}`),
  parse: (text: string) =>
    req<ParseResult>("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }),
  create: (body: unknown) =>
    req<Shipment>("/api/shipments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  update: (id: string, body: unknown) =>
    req<Shipment>(`/api/shipments/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  remove: (id: string) =>
    req<{ ok: boolean }>(`/api/shipments/${encodeURIComponent(id)}`, { method: "DELETE" }),
  uploadPhoto: async (id: string, itemId: string, file: File) => {
    const fd = new FormData()
    fd.append("photo", file)
    fd.append("itemId", itemId)
    return req<Shipment>(`/api/shipments/${encodeURIComponent(id)}/photos`, { method: "POST", body: fd })
  },
}
