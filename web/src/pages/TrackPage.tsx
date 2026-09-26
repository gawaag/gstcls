import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { api } from "../api"
import { STATUS_LABEL, STATUS_TONE, when } from "../lib/status"
import type { Shipment } from "../types"

export function TrackPage() {
  const { ref = "" } = useParams()
  const [row, setRow] = useState<Shipment | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    api.shipment(ref).then(setRow).catch((e) => setError(e.message))
  }, [ref])

  if (error) return <p className="px-4 py-10 text-sm text-[#f3b3aa]">{error}</p>
  if (!row) return <p className="px-4 py-10 text-sm text-[var(--muted)]">Recherche…</p>

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <p className="text-[11px] tracking-[0.14em] text-[var(--accent)]">SUIVI S.A.M</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">{row.ref}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {row.sender.city} → {row.receiver.city}
      </p>
      <p className={`pill mt-4 w-fit ${STATUS_TONE[row.status] || "tone-stock"}`}>{STATUS_LABEL[row.status] || row.status}</p>
      <ol className="mt-6 space-y-2 text-sm text-[var(--muted)]">
        {row.events.map((ev, i) => (
          <li key={i}>
            {when(ev.at)} · {STATUS_LABEL[ev.status] || ev.status}
          </li>
        ))}
      </ol>
    </main>
  )
}
