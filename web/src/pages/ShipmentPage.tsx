import { ArrowLeft, Printer, Trash } from "@phosphor-icons/react"
import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { api } from "../api"
import { LabelPrint } from "../components/LabelPrint"
import { money, STATUS_LABEL, STATUS_ORDER, STATUS_TONE, when } from "../lib/status"
import type { ParcelItem, Shipment } from "../types"

export function ShipmentPage() {
  const { id = "" } = useParams()
  const nav = useNavigate()
  const [row, setRow] = useState<Shipment | null>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.shipment(id).then(setRow).catch((e) => setError(e.message))
  }, [id])

  async function save(patch: Partial<Shipment> & { statusNote?: string }) {
    if (!row) return
    setSaving(true)
    try {
      setRow(await api.update(row.id, patch))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Maj impossible")
    } finally {
      setSaving(false)
    }
  }

  async function onPhoto(item: ParcelItem, file: File) {
    if (!row || !item.id) return
    setRow(await api.uploadPhoto(row.id, item.id, file))
  }

  async function remove() {
    if (!row || !confirm(`Supprimer ${row.ref} ?`)) return
    await api.remove(row.id)
    nav("/")
  }

  if (!row) {
    return <p className="px-4 py-10 text-sm text-[var(--muted)]">{error || "Chargement…"}</p>
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-5 px-4 py-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
          <ArrowLeft size={16} /> Bureau
        </Link>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-ink)]">
            <Printer size={16} /> Imprimer
          </button>
          <button type="button" onClick={remove} className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-2 text-sm text-[#f3b3aa]">
            <Trash size={16} /> Supprimer
          </button>
        </div>
      </div>

      <section className="no-print shell rounded-[28px] p-1.5">
        <div className="rounded-[22px] bg-[var(--panel)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] tracking-[0.12em] text-[var(--muted)]">RÉFÉRENCE</p>
              <h1 className="mt-1 text-3xl font-medium tracking-tight">{row.ref}</h1>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {row.totals.itemCount} colis · {row.totals.weightKg} kg · {money(row.totals.total, row.totals.currency)}
              </p>
            </div>
            <label className="grid gap-1 text-xs text-[var(--muted)]">
              Statut
              <select
                value={row.status}
                onChange={(e) => save({ status: e.target.value, statusNote: "Maj bureau" })}
                className="field"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <span className={`pill w-fit ${STATUS_TONE[row.status] || "tone-stock"}`}>{STATUS_LABEL[row.status]}</span>
            </label>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <EditPerson title="Expéditeur" person={row.sender} onSave={(sender) => save({ sender })} />
            <EditPerson title="Destinataire" person={row.receiver} onSave={(receiver) => save({ receiver })} />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-xs text-[var(--muted)]">
              Prix / kg
              <input type="number" step="0.01" className="field" defaultValue={row.unitPrice} onBlur={(e) => save({ unitPrice: Number(e.target.value) })} />
            </label>
            <label className="grid gap-1 text-xs text-[var(--muted)]">
              Notes
              <input className="field" defaultValue={row.notes} onBlur={(e) => save({ notes: e.target.value })} />
            </label>
            <p className="self-end text-xs text-[var(--muted)]">{saving ? "Enregistrement…" : error || "Chaque case se sauve toute seule"}</p>
          </div>
        </div>
      </section>

      <section className="no-print grid gap-3">
        {row.items.map((item) => (
          <article key={item.id} className="shell rounded-[24px] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>{item.ref}</strong>
              <span className="text-sm text-[var(--muted)]">
                {item.qty} × {item.weightKg} kg · {item.description} {item.color}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(item.photos || []).map((file) => (
                <img key={file} src={`/uploads/${file}`} alt="" className="h-20 w-20 rounded-xl object-cover" />
              ))}
              <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-xl border border-dashed border-[var(--line)] text-xs text-[var(--muted)]">
                Photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) onPhoto(item, file)
                  }}
                />
              </label>
            </div>
          </article>
        ))}
      </section>

      <section className="no-print shell rounded-[24px] p-4">
        <h2 className="mb-3 text-sm font-medium">Historique</h2>
        <ol className="space-y-2 text-sm">
          {row.events.map((ev, i) => (
            <li key={i} className="flex justify-between gap-4 text-[var(--muted)]">
              <span>
                {STATUS_LABEL[ev.status] || ev.status}
                {ev.note ? ` · ${ev.note}` : ""}
              </span>
              <span>{when(ev.at)}</span>
            </li>
          ))}
        </ol>
      </section>

      <LabelPrint shipment={row} />
    </main>
  )
}

function EditPerson({
  title,
  person,
  onSave,
}: {
  title: string
  person: Shipment["sender"]
  onSave: (p: Shipment["sender"]) => void
}) {
  const [p, setP] = useState(person)
  useEffect(() => setP(person), [person])
  const labels = { name: "Nom", phone: "Téléphone", city: "Ville", address: "Adresse" } as const
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">{title}</legend>
      {(Object.keys(labels) as Array<keyof typeof labels>).map((k) => (
        <input
          key={k}
          className="field"
          value={p[k]}
          placeholder={labels[k]}
          onChange={(e) => setP({ ...p, [k]: e.target.value })}
          onBlur={() => onSave(p)}
        />
      ))}
    </fieldset>
  )
}
