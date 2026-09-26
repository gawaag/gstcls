import { Microphone, PaperPlaneTilt, Sparkle, Stop } from "@phosphor-icons/react"
import { useEffect, useRef, useState } from "react"
import { DEMO_PHRASE, parseShipmentText } from "../lib/parse"
import { createSpeech, speechSupported, transcriptFrom } from "../lib/speech"
import type { ParseResult } from "../types"

export function AgentBar({
  onLive,
  onCommit,
}: {
  onLive: (parsed: ParseResult, raw: string) => void
  onCommit: (parsed: ParseResult, raw: string) => void
}) {
  const [text, setText] = useState("")
  const [listening, setListening] = useState(false)
  const [error, setError] = useState("")
  const recRef = useRef<ReturnType<typeof createSpeech>>(null)

  useEffect(() => () => recRef.current?.stop(), [])

  function push(raw: string, commit = false) {
    const value = raw.trim()
    setText(value)
    if (!value) return
    const parsed = parseShipmentText(value)
    if (commit) onCommit(parsed, value)
    else onLive(parsed, value)
  }

  function toggleVoice() {
    if (listening) {
      recRef.current?.stop()
      setListening(false)
      if (text.trim()) push(text, true)
      return
    }
    const rec = createSpeech()
    if (!rec) {
      setError("Dictée dispo sur Chrome ou Edge. Tu peux aussi coller le texte.")
      return
    }
    rec.lang = "fr-FR"
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (ev) => push(transcriptFrom(ev))
    rec.onerror = (ev) => {
      setError(ev.error === "not-allowed" ? "Micro bloqué. Autorise-le dans le navigateur." : "Dictée interrompue.")
      setListening(false)
    }
    rec.onend = () => setListening(false)
    recRef.current = rec
    rec.start()
    setListening(true)
    setError("")
  }

  return (
    <section className="shell rounded-[28px] p-1.5">
      <div className="rounded-[22px] bg-[var(--panel)] px-4 py-4 md:px-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--accent)]">SAISIE AGENCE</p>
            <h2 className="mt-1 text-lg font-medium tracking-tight">Dicte, les cases se remplissent</h2>
            <p className="mt-1 max-w-[46ch] text-sm text-[var(--muted)]">
              Rien n'est enregistré tant que tu n'as pas validé la fiche.
            </p>
          </div>
          {listening && (
            <span className="pill tone-route">
              <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
              Écoute
            </span>
          )}
        </div>
        <textarea
          value={text}
          onChange={(e) => push(e.target.value)}
          rows={3}
          placeholder={DEMO_PHRASE}
          className="field min-h-[88px] resize-y"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={toggleVoice}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm active:scale-[0.98] ${
              listening
                ? "bg-[var(--accent)] font-medium text-[var(--accent-ink)]"
                : "border border-[var(--line)]"
            }`}
          >
            {listening ? <Stop size={16} weight="bold" /> : <Microphone size={16} weight="light" />}
            {listening ? "Stop et remplir" : speechSupported() ? "Dicter" : "Dicter indisponible"}
          </button>
          <button
            type="button"
            disabled={!text.trim()}
            onClick={() => push(text, true)}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent-ink)] disabled:opacity-35 active:scale-[0.98]"
          >
            <PaperPlaneTilt size={16} weight="fill" />
            Préparer la fiche
          </button>
          <button
            type="button"
            onClick={() => push(DEMO_PHRASE, true)}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-2.5 text-sm text-[var(--muted)]"
          >
            <Sparkle size={16} weight="light" />
            Tester un exemple
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-[#f3b3aa]">{error}</p>}
      </div>
    </section>
  )
}
