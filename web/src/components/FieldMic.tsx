import { Microphone, Stop } from "@phosphor-icons/react"
import { useEffect, useRef, useState } from "react"
import { createSpeech, speechSupported, transcriptFrom } from "../lib/speech"

export function FieldMic({
  onText,
  label,
}: {
  onText: (value: string) => void
  label: string
}) {
  const [on, setOn] = useState(false)
  const recRef = useRef<ReturnType<typeof createSpeech>>(null)

  useEffect(() => () => recRef.current?.stop(), [])

  if (!speechSupported()) return null

  function toggle() {
    if (on) {
      recRef.current?.stop()
      setOn(false)
      return
    }
    const rec = createSpeech()
    if (!rec) return
    rec.lang = "fr-FR"
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (ev) => onText(transcriptFrom(ev))
    rec.onerror = () => setOn(false)
    rec.onend = () => setOn(false)
    recRef.current = rec
    rec.start()
    setOn(true)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={`Dicter ${label}`}
      className={`grid h-8 w-8 place-items-center rounded-full border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] ${on ? "mic-on bg-[var(--accent)] text-[var(--accent-ink)]" : ""}`}
    >
      {on ? <Stop size={13} weight="bold" /> : <Microphone size={13} weight="light" />}
    </button>
  )
}
