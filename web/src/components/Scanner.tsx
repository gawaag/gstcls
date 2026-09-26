import { Camera, UploadSimple, X } from "@phosphor-icons/react"
import jsQR from "jsqr"
import { useEffect, useRef, useState } from "react"

export function Scanner({ onCode, onClose }: { onCode: (value: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState("")
  const streamRef = useRef<MediaStream | null>(null)
  const loopRef = useRef(0)

  useEffect(() => {
    let dead = false
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        })
        if (dead) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        scanLoop()
      } catch {
        setError("Caméra indisponible. Importe une photo de l'étiquette.")
      }
    }
    start()
    return () => {
      dead = true
      cancelAnimationFrame(loopRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function emit(raw: string) {
    const value = raw.trim()
    if (!value) return
    onCode(value)
  }

  function scanLoop() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    if (video.readyState >= 2) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const Detector = (window as Window & { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (src: ImageData) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector
        if (Detector) {
          new Detector({ formats: ["qr_code", "code_128", "code_39"] })
            .detect(img)
            .then((codes) => {
              if (codes[0]?.rawValue) emit(codes[0].rawValue)
            })
            .catch(() => {})
        } else {
          const found = jsQR(img.data, img.width, img.height)
          if (found?.data) emit(found.data)
        }
      }
    }
    loopRef.current = requestAnimationFrame(scanLoop)
  }

  async function fromFile(file: File) {
    const bmp = await createImageBitmap(file)
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = bmp.width
    canvas.height = bmp.height
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(bmp, 0, 0)
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const found = jsQR(img.data, img.width, img.height)
    if (found?.data) emit(found.data)
    else setError("Aucun QR lu sur cette image.")
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-[var(--line)] bg-[var(--elev)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">Scanner une référence</p>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-white/5">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <div className="mt-3 flex gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--line)] px-4 py-2 text-sm">
            <UploadSimple size={16} />
            Photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) fromFile(file)
              }}
            />
          </label>
          <span className="inline-flex items-center gap-2 text-xs text-[var(--muted)]">
            <Camera size={14} /> QR ou code-barres, sans API payante
          </span>
        </div>
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      </div>
    </div>
  )
}
