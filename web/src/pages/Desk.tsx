import { MagnifyingGlass, Plus, QrCode } from "@phosphor-icons/react"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../api"
import { AgentBar } from "../components/AgentBar"
import { FieldMic } from "../components/FieldMic"
import { Scanner } from "../components/Scanner"
import { money, STATUS_LABEL, STATUS_ORDER, STATUS_TONE, when } from "../lib/status"
import type { ParcelItem, ParseResult, Person, Settings, Shipment } from "../types"

const emptyPerson = (): Person => ({ name: "", phone: "", city: "", address: "" })
const emptyItem = (): ParcelItem => ({ qty: 1, weightKg: 0, description: "colis", color: "" })

export function Desk() {
  const nav = useNavigate()
  const [rows, setRows] = useState<Shipment[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("")
  const [scan, setScan] = useState(false)
  const [error, setError] = useState("")
  const [hot, setHot] = useState<Set<string>>(new Set())
  const [draft, setDraft] = useState(blankDraft(1.5))

  async function reload() {
    const [list, s] = await Promise.all([api.shipments(q, status), api.settings()])
    setRows(list)
    setSettings(s)
  }

  useEffect(() => {
    reload().catch((e) => setError(e.message))
  }, [q, status])

  function flash(keys: string[]) {
    setHot(new Set(keys))
    window.setTimeout(() => setHot(new Set()), 900)
  }

  function applyParse(parsed: ParseResult, raw: string) {
    const keys: string[] = []
    setDraft((prev) => {
      const next = { ...prev, sourceText: raw, confidence: parsed.confidence }
      if (parsed.sender.name) {
        next.sender = { ...next.sender, name: parsed.sender.name }
        keys.push("s.name")
      }
      if (parsed.sender.phone) {
        next.sender = { ...next.sender, phone: parsed.sender.phone }
        keys.push("s.phone")
      }
      if (parsed.sender.city) {
        next.sender = { ...next.sender, city: parsed.sender.city }
        keys.push("s.city")
      }
      if (parsed.receiver.name) {
        next.receiver = { ...next.receiver, name: parsed.receiver.name }
        keys.push("r.name")
      }
      if (parsed.receiver.phone) {
        next.receiver = { ...next.receiver, phone: parsed.receiver.phone }
        keys.push("r.phone")
      }
      if (parsed.receiver.city) {
        next.receiver = { ...next.receiver, city: parsed.receiver.city }
        keys.push("r.city")
      }
      if (parsed.unitPrice) {
        next.unitPrice = parsed.unitPrice
        keys.push("price")
      }
      if (parsed.currency) next.currency = parsed.currency
      if (parsed.items.some((i) => i.weightKg)) {
        next.items = parsed.items
        keys.push("items")
      }
      next.notes = parsed.warnings.join(" · ")
      return next
    })
    flash(keys)
  }

  async function save() {
    setError("")
    if (!draft.sender.name || !draft.receiver.name) {
      setError("Nom expéditeur et destinataire obligatoires.")
      return
    }
    try {
      const created = await api.create({
        sender: draft.sender,
        receiver: draft.receiver,
        unitPrice: draft.unitPrice,
        currency: draft.currency,
        notes: draft.notes,
        sourceText: draft.sourceText,
        items: draft.items.filter((i) => i.weightKg > 0 || i.description),
      })
      setDraft(blankDraft(settings?.unitPrice || 1.5))
      nav(`/colis/${created.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible")
    }
  }

  async function onScan(code: string) {
    setScan(false)
    const clean = code.replace(/^https?:\/\/[^/]+\/s\//, "")
    try {
      const found = await api.shipment(clean)
      nav(`/colis/${found.id}`)
    } catch {
      setError(`Référence inconnue: ${clean}`)
    }
  }

  const stats = useMemo(() => {
    const kg = rows.reduce((n, r) => n + (r.totals?.weightKg || 0), 0)
    const eur = rows.reduce((n, r) => n + (r.totals?.total || 0), 0)
    const live = rows.filter((r) => !["livre", "annule"].includes(r.status)).length
    return { n: rows.length, kg, eur, live }
  }, [rows])

  const previewKg = draft.items.reduce((n, i) => n + i.qty * i.weightKg, 0)
  const previewTotal = previewKg * draft.unitPrice

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 pt-6">
      <section className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-[11px] font-medium tracking-[0.16em] text-[var(--accent)]">COMPTOIR</p>
          <h1 className="mt-2 max-w-[14ch] text-[clamp(2rem,5vw,3.4rem)] leading-[0.95] font-medium tracking-[-0.04em]">
            Saisie, suivi, étiquette.
          </h1>
          <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-[var(--muted)]">
            Tu parles, les cases se remplissent. Tu contrôles. Tu valides. L'historique reste ici.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 self-end">
          <Stat k={String(stats.n)} l="Dossiers" />
          <Stat k={`${stats.kg}`} l="kg" />
          <Stat k={money(stats.eur)} l="Total" />
        </div>
      </section>

      <AgentBar onLive={applyParse} onCommit={applyParse} />

      <section className="shell rounded-[28px] p-1.5">
        <div className="rounded-[22px] bg-[var(--panel)] p-4 md:p-5">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium">Fiche avant validation</h2>
              <p className="text-xs text-[var(--muted)]">
                {draft.confidence != null ? `Lecture ${draft.confidence}% · ` : ""}
                micro sur une case pour dicter uniquement ce champ.
              </p>
            </div>
            <p className="text-sm text-[var(--muted)]">
              {previewKg || 0} kg · {money(previewTotal, draft.currency)}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <PersonFields
              title="Expéditeur"
              prefix="s"
              person={draft.sender}
              hot={hot}
              onChange={(sender) => setDraft({ ...draft, sender })}
            />
            <PersonFields
              title="Destinataire"
              prefix="r"
              person={draft.receiver}
              hot={hot}
              onChange={(receiver) => setDraft({ ...draft, receiver })}
            />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Field label="Prix / kg" mic={<FieldMic label="prix" onText={(t) => setDraft((d) => ({ ...d, unitPrice: Number(t.replace(",", ".")) || d.unitPrice }))} />}>
              <input
                type="number"
                step="0.01"
                min="0"
                value={draft.unitPrice}
                onChange={(e) => setDraft({ ...draft, unitPrice: Number(e.target.value) })}
                className={`field ${hot.has("price") ? "hot" : ""}`}
              />
            </Field>
            <Field label="Devise">
              <select value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} className="field">
                <option value="EUR">EUR</option>
                <option value="MAD">MAD</option>
              </select>
            </Field>
            <Field label="Notes">
              <input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="field" />
            </Field>
          </div>

          <div className={`mt-5 space-y-3 ${hot.has("items") ? "rounded-2xl ring-1 ring-[var(--accent)]" : ""}`}>
            {draft.items.map((item, i) => (
              <div key={i} className="grid gap-2 rounded-2xl border border-[var(--line)] bg-[#14161b] p-3 md:grid-cols-5">
                <Num label="Qté" value={item.qty} onChange={(qty) => patchItem(i, { qty })} />
                <Num label="Poids kg" value={item.weightKg} onChange={(weightKg) => patchItem(i, { weightKg })} />
                <Field label="Description">
                  <input className="field" value={item.description} onChange={(e) => patchItem(i, { description: e.target.value })} />
                </Field>
                <Field label="Couleur">
                  <input className="field" value={item.color} onChange={(e) => patchItem(i, { color: e.target.value })} />
                </Field>
                <button
                  type="button"
                  className="self-end pb-2 text-sm text-[#f3b3aa]"
                  onClick={() => setDraft({ ...draft, items: draft.items.filter((_, j) => j !== i) })}
                >
                  Retirer
                </button>
              </div>
            ))}
            <button type="button" className="text-sm text-[var(--accent)]" onClick={() => setDraft({ ...draft, items: [...draft.items, emptyItem()] })}>
              + Ligne de colis
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setDraft(blankDraft(settings?.unitPrice || 1.5))}
              className="text-sm text-[var(--muted)]"
            >
              Vider la fiche
            </button>
            <button
              type="button"
              onClick={save}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--accent-ink)] active:scale-[0.98]"
            >
              <Plus size={16} weight="bold" />
              Valider et enregistrer
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-[#f3b3aa]">{error}</p>}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="relative min-w-[220px] flex-1">
            <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nom, ville, téléphone, référence"
              className="field pl-9"
            />
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="field w-auto">
            <option value="">Tous les statuts</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <button
            id="scan"
            type="button"
            onClick={() => setScan(true)}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-2.5 text-sm"
          >
            <QrCode size={16} /> Scanner
          </button>
        </div>

        <div className="shell overflow-hidden rounded-[28px]">
          {rows.length === 0 ? (
            <p className="px-5 py-12 text-sm text-[var(--muted)]">Aucun dossier. Dicte une saisie ou teste l'exemple.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[11px] uppercase tracking-[0.08em] text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Réf</th>
                    <th className="px-4 py-3 font-medium">Expéditeur</th>
                    <th className="px-4 py-3 font-medium">Destinataire</th>
                    <th className="px-4 py-3 font-medium">Poids</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium">MAJ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-t border-[var(--line)] hover:bg-white/4"
                      onClick={() => nav(`/colis/${row.id}`)}
                    >
                      <td className="px-4 py-3 font-medium">{row.ref}</td>
                      <td className="px-4 py-3">
                        {row.sender.name}
                        <span className="block text-xs text-[var(--muted)]">{row.sender.city}</span>
                      </td>
                      <td className="px-4 py-3">
                        {row.receiver.name}
                        <span className="block text-xs text-[var(--muted)]">{row.receiver.city}</span>
                      </td>
                      <td className="px-4 py-3">{row.totals.weightKg} kg</td>
                      <td className="px-4 py-3">{money(row.totals.total, row.totals.currency)}</td>
                      <td className="px-4 py-3">
                        <span className={`pill ${STATUS_TONE[row.status] || "tone-stock"}`}>{STATUS_LABEL[row.status] || row.status}</span>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">{when(row.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {scan && <Scanner onClose={() => setScan(false)} onCode={onScan} />}
    </main>
  )

  function patchItem(i: number, patch: Partial<ParcelItem>) {
    setDraft({
      ...draft,
      items: draft.items.map((item, j) => (j === i ? { ...item, ...patch } : item)),
    })
  }
}

function blankDraft(unitPrice: number) {
  return {
    sender: emptyPerson(),
    receiver: emptyPerson(),
    unitPrice,
    currency: "EUR",
    notes: "",
    sourceText: "",
    items: [emptyItem()],
    confidence: undefined as number | undefined,
  }
}

function Stat({ k, l }: { k: string; l: string }) {
  return (
    <div className="shell rounded-2xl px-3 py-3">
      <p className="text-lg font-medium tracking-tight">{k}</p>
      <p className="text-[11px] text-[var(--muted)]">{l}</p>
    </div>
  )
}

function Field({ label, children, mic }: { label: string; children: ReactNode; mic?: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs text-[var(--muted)]">
      <span className="flex items-center justify-between gap-2">
        {label}
        {mic}
      </span>
      {children}
    </label>
  )
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <Field label={label}>
      <input type="number" min="0" step="0.1" className="field" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </Field>
  )
}

function PersonFields({
  title,
  prefix,
  person,
  hot,
  onChange,
}: {
  title: string
  prefix: string
  person: Person
  hot: Set<string>
  onChange: (p: Person) => void
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium">{title}</legend>
      <Field label="Nom" mic={<FieldMic label={`nom ${title}`} onText={(name) => onChange({ ...person, name })} />}>
        <input className={`field ${hot.has(`${prefix}.name`) ? "hot" : ""}`} value={person.name} onChange={(e) => onChange({ ...person, name: e.target.value })} />
      </Field>
      <Field label="Téléphone" mic={<FieldMic label="téléphone" onText={(phone) => onChange({ ...person, phone })} />}>
        <input className={`field ${hot.has(`${prefix}.phone`) ? "hot" : ""}`} value={person.phone} onChange={(e) => onChange({ ...person, phone: e.target.value })} />
      </Field>
      <Field label="Ville" mic={<FieldMic label="ville" onText={(city) => onChange({ ...person, city })} />}>
        <input className={`field ${hot.has(`${prefix}.city`) ? "hot" : ""}`} value={person.city} onChange={(e) => onChange({ ...person, city: e.target.value })} />
      </Field>
      <Field label="Adresse" mic={<FieldMic label="adresse" onText={(address) => onChange({ ...person, address })} />}>
        <input className="field" value={person.address} onChange={(e) => onChange({ ...person, address: e.target.value })} />
      </Field>
    </fieldset>
  )
}
