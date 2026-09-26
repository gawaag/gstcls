export type SpeechRec = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string; isFinal?: boolean }>> }) => void) | null
  onerror: ((ev: { error?: string }) => void) | null
  onend: (() => void) | null
}

export function speechSupported() {
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRec
    webkitSpeechRecognition?: new () => SpeechRec
  }
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition)
}

export function createSpeech(): SpeechRec | null {
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRec
    webkitSpeechRecognition?: new () => SpeechRec
  }
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
  return Ctor ? new Ctor() : null
}

export function transcriptFrom(ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) {
  const parts: string[] = []
  for (let i = 0; i < ev.results.length; i++) parts.push(ev.results[i][0].transcript)
  return parts.join(" ").replace(/\s+/g, " ").trim()
}
