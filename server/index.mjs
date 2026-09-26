import express from "express"
import multer from "multer"
import { mkdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import QRCode from "qrcode"
import { parseShipmentText } from "./parser.mjs"
import { nextRef } from "./ref.mjs"
import { seedIfEmpty } from "./seed.mjs"
import {
  DATA_DIR,
  UPLOAD_DIR,
  STATUSES,
  addPhoto,
  createShipment,
  getSettings,
  getShipment,
  getState,
  listShipments,
  removePhoto,
  removeShipment,
  totals,
  updateSettings,
  updateShipment,
} from "./store.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const PORT = Number(process.env.PORT || 8787)

const upload = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, cb) => {
      await mkdir(UPLOAD_DIR, { recursive: true })
      cb(null, UPLOAD_DIR)
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").slice(0, 8) || ".jpg"
      cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`)
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\//.test(file.mimetype || ""))
  },
})

const app = express()
app.use(express.json({ limit: "2mb" }))
app.use("/uploads", express.static(UPLOAD_DIR))

function withTotals(shipment, settings) {
  return { ...shipment, totals: totals(shipment, settings) }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, brand: "S.A.M TRANSPORT CHARK" })
})

app.get("/api/settings", async (_req, res) => {
  res.json(await getSettings())
})

app.patch("/api/settings", async (req, res) => {
  res.json(await updateSettings(req.body || {}))
})

app.get("/api/statuses", (_req, res) => {
  res.json(STATUSES)
})

app.post("/api/parse", (req, res) => {
  res.json(parseShipmentText(req.body?.text || ""))
})

app.get("/api/shipments", async (req, res) => {
  const settings = await getSettings()
  const rows = await listShipments({
    q: String(req.query.q || ""),
    status: String(req.query.status || ""),
  })
  res.json(rows.map((s) => withTotals(s, settings)))
})

app.get("/api/shipments/:id", async (req, res) => {
  const settings = await getSettings()
  const row = await getShipment(req.params.id)
  if (!row) return res.status(404).json({ error: "Introuvable" })
  res.json(withTotals(row, settings))
})

app.post("/api/shipments", async (req, res) => {
  const shipment = await createShipment(req.body || {}, nextRef)
  const settings = await getSettings()
  res.status(201).json(withTotals(shipment, settings))
})

app.patch("/api/shipments/:id", async (req, res) => {
  const shipment = await updateShipment(req.params.id, req.body || {})
  if (!shipment) return res.status(404).json({ error: "Introuvable" })
  const settings = await getSettings()
  res.json(withTotals(shipment, settings))
})

app.delete("/api/shipments/:id", async (req, res) => {
  const ok = await removeShipment(req.params.id)
  if (!ok) return res.status(404).json({ error: "Introuvable" })
  res.json({ ok: true })
})

app.post("/api/shipments/:id/photos", upload.single("photo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Photo manquante" })
  const shipment = await addPhoto(req.params.id, req.body?.itemId, req.file.filename)
  if (!shipment) return res.status(404).json({ error: "Introuvable" })
  const settings = await getSettings()
  res.json(withTotals(shipment, settings))
})

app.delete("/api/shipments/:id/photos/:file", async (req, res) => {
  const shipment = await removePhoto(req.params.id, req.query.itemId, req.params.file)
  if (!shipment) return res.status(404).json({ error: "Introuvable" })
  const settings = await getSettings()
  res.json(withTotals(shipment, settings))
})

app.get("/api/qr/:ref.svg", async (req, res) => {
  const svg = await QRCode.toString(req.params.ref, { type: "svg", margin: 1, width: 220 })
  res.type("image/svg+xml").send(svg)
})

const dist = path.join(root, "dist")
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(dist, "index.html"))
  })
}

await mkdir(DATA_DIR, { recursive: true })
await getState()
await seedIfEmpty()

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SAM agence  http://localhost:${PORT}`)
})
