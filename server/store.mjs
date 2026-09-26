import { mkdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { DatabaseSync } from "node:sqlite"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
export const DATA_DIR = path.join(root, "data")
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads")
const DB_PATH = path.join(DATA_DIR, "agence.db")

export const STATUSES = [
  "recu",
  "en_stock",
  "en_route",
  "arrive",
  "pret",
  "livre",
  "incident",
  "annule",
]

const DEFAULTS = {
  agency: "S.A.M TRANSPORT CHARK",
  unitPrice: 1.5,
  currency: "EUR",
  corridor: "France → Maroc",
  desk: "27 Avenue de la Gare, 91600 Savigny-sur-Orge",
}

let db

function now() {
  return new Date().toISOString()
}

function nid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export async function openDb() {
  if (db) return db
  await mkdir(UPLOAD_DIR, { recursive: true })
  db = new DatabaseSync(DB_PATH)
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS shipments (
      id TEXT PRIMARY KEY,
      ref TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL,
      sender_name TEXT DEFAULT '',
      sender_phone TEXT DEFAULT '',
      sender_city TEXT DEFAULT '',
      sender_address TEXT DEFAULT '',
      receiver_name TEXT DEFAULT '',
      receiver_phone TEXT DEFAULT '',
      receiver_city TEXT DEFAULT '',
      receiver_address TEXT DEFAULT '',
      unit_price REAL NOT NULL,
      currency TEXT NOT NULL,
      notes TEXT DEFAULT '',
      source_text TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      shipment_id TEXT NOT NULL,
      ref TEXT NOT NULL,
      qty REAL NOT NULL,
      weight_kg REAL NOT NULL,
      description TEXT DEFAULT '',
      color TEXT DEFAULT '',
      sort_order INTEGER NOT NULL,
      FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      file TEXT NOT NULL,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      shipment_id TEXT NOT NULL,
      at TEXT NOT NULL,
      status TEXT NOT NULL,
      note TEXT DEFAULT '',
      FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
    );
  `)
  if (!metaGet("seq")) metaSet("seq", "1")
  if (!metaGet("agency")) {
    for (const [k, v] of Object.entries(DEFAULTS)) metaSet(k, String(v))
  }
  return db
}

function metaGet(key) {
  const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(key)
  return row?.value
}

function metaSet(key, value) {
  db.prepare("INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, String(value))
}

function rowToShipment(row) {
  if (!row) return null
  const items = db
    .prepare("SELECT * FROM items WHERE shipment_id = ? ORDER BY sort_order")
    .all(row.id)
    .map((item) => ({
      id: item.id,
      ref: item.ref,
      qty: item.qty,
      weightKg: item.weight_kg,
      description: item.description,
      color: item.color,
      photos: db.prepare("SELECT file FROM photos WHERE item_id = ?").all(item.id).map((p) => p.file),
    }))
  const events = db
    .prepare("SELECT at, status, note FROM events WHERE shipment_id = ? ORDER BY at")
    .all(row.id)
  return {
    id: row.id,
    ref: row.ref,
    status: row.status,
    sender: {
      name: row.sender_name,
      phone: row.sender_phone,
      city: row.sender_city,
      address: row.sender_address,
    },
    receiver: {
      name: row.receiver_name,
      phone: row.receiver_phone,
      city: row.receiver_city,
      address: row.receiver_address,
    },
    unitPrice: row.unit_price,
    currency: row.currency,
    notes: row.notes,
    sourceText: row.source_text,
    items,
    events,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function totals(shipment, settings) {
  const items = shipment.items || []
  const weight = items.reduce((sum, i) => sum + Number(i.qty || 1) * Number(i.weightKg || 0), 0)
  const unit = Number(shipment.unitPrice ?? settings?.unitPrice ?? 1.5)
  return {
    itemCount: items.reduce((sum, i) => sum + Number(i.qty || 1), 0),
    weightKg: Math.round(weight * 100) / 100,
    unitPrice: unit,
    total: Math.round(weight * unit * 100) / 100,
    currency: shipment.currency || settings?.currency || "EUR",
  }
}

export async function getSettings() {
  await openDb()
  return {
    agency: metaGet("agency") || DEFAULTS.agency,
    unitPrice: Number(metaGet("unitPrice") || DEFAULTS.unitPrice),
    currency: metaGet("currency") || DEFAULTS.currency,
    corridor: metaGet("corridor") || DEFAULTS.corridor,
    desk: metaGet("desk") || DEFAULTS.desk,
  }
}

export async function updateSettings(patch) {
  await openDb()
  const next = { ...(await getSettings()), ...patch }
  for (const [k, v] of Object.entries(next)) metaSet(k, v)
  return next
}

export async function listShipments({ q = "", status = "" } = {}) {
  await openDb()
  let rows
  if (status) {
    rows = db.prepare("SELECT * FROM shipments WHERE status = ? ORDER BY updated_at DESC").all(status)
  } else {
    rows = db.prepare("SELECT * FROM shipments ORDER BY updated_at DESC").all()
  }
  const needle = String(q).trim().toLowerCase()
  const mapped = rows.map(rowToShipment)
  if (!needle) return mapped
  return mapped.filter((s) => {
    const hay = [
      s.ref,
      s.sender?.name,
      s.sender?.phone,
      s.sender?.city,
      s.receiver?.name,
      s.receiver?.phone,
      s.receiver?.city,
      s.notes,
      ...(s.items || []).map((i) => `${i.ref} ${i.description} ${i.color}`),
    ]
      .join(" ")
      .toLowerCase()
    return hay.includes(needle)
  })
}

export async function getShipment(idOrRef) {
  await openDb()
  const row = db.prepare("SELECT * FROM shipments WHERE id = ? OR ref = ?").get(idOrRef, idOrRef)
  return rowToShipment(row)
}

function writeItems(shipmentId, ref, items) {
  db.prepare("DELETE FROM items WHERE shipment_id = ?").run(shipmentId)
  ;(items || []).forEach((item, index) => {
    const itemId = item.id || nid("it")
    db.prepare(
      `INSERT INTO items(id, shipment_id, ref, qty, weight_kg, description, color, sort_order)
       VALUES(?,?,?,?,?,?,?,?)`,
    ).run(
      itemId,
      shipmentId,
      item.ref || `${ref}-${index + 1}`,
      Number(item.qty || 1),
      Number(item.weightKg || 0),
      item.description || "colis",
      item.color || "",
      index,
    )
    for (const file of item.photos || []) {
      db.prepare("INSERT INTO photos(id, item_id, file) VALUES(?,?,?)").run(nid("ph"), itemId, file)
    }
  })
}

export async function createShipment(input, makeRef) {
  await openDb()
  const settings = await getSettings()
  const created = now()
  const seq = Number(metaGet("seq") || 1)
  const ref = makeRef(seq)
  metaSet("seq", String(seq + 1))
  const id = nid("sh")
  const status = input.status || "recu"
  db.prepare(
    `INSERT INTO shipments(
      id, ref, status, sender_name, sender_phone, sender_city, sender_address,
      receiver_name, receiver_phone, receiver_city, receiver_address,
      unit_price, currency, notes, source_text, created_at, updated_at
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    id,
    ref,
    status,
    input.sender?.name || "",
    input.sender?.phone || "",
    input.sender?.city || "",
    input.sender?.address || "",
    input.receiver?.name || "",
    input.receiver?.phone || "",
    input.receiver?.city || "",
    input.receiver?.address || "",
    input.unitPrice == null ? settings.unitPrice : Number(input.unitPrice),
    input.currency || settings.currency,
    input.notes || "",
    input.sourceText || "",
    created,
    created,
  )
  writeItems(id, ref, input.items)
  db.prepare("INSERT INTO events(id, shipment_id, at, status, note) VALUES(?,?,?,?,?)").run(
    nid("ev"),
    id,
    created,
    status,
    "Saisie agence",
  )
  return getShipment(id)
}

export async function updateShipment(idOrRef, patch) {
  await openDb()
  const current = await getShipment(idOrRef)
  if (!current) return null
  const sender = { ...current.sender, ...(patch.sender || {}) }
  const receiver = { ...current.receiver, ...(patch.receiver || {}) }
  const status = patch.status || current.status
  const updated = now()
  db.prepare(
    `UPDATE shipments SET
      status=?, sender_name=?, sender_phone=?, sender_city=?, sender_address=?,
      receiver_name=?, receiver_phone=?, receiver_city=?, receiver_address=?,
      unit_price=?, currency=?, notes=?, updated_at=?
     WHERE id=?`,
  ).run(
    status,
    sender.name,
    sender.phone,
    sender.city,
    sender.address,
    receiver.name,
    receiver.phone,
    receiver.city,
    receiver.address,
    patch.unitPrice == null ? current.unitPrice : Number(patch.unitPrice),
    patch.currency || current.currency,
    patch.notes == null ? current.notes : patch.notes,
    updated,
    current.id,
  )
  if (Array.isArray(patch.items)) writeItems(current.id, current.ref, patch.items)
  if (patch.status && patch.status !== current.status) {
    db.prepare("INSERT INTO events(id, shipment_id, at, status, note) VALUES(?,?,?,?,?)").run(
      nid("ev"),
      current.id,
      updated,
      patch.status,
      patch.statusNote || "",
    )
  }
  return getShipment(current.id)
}

export async function removeShipment(idOrRef) {
  await openDb()
  const current = await getShipment(idOrRef)
  if (!current) return false
  db.prepare("DELETE FROM shipments WHERE id = ?").run(current.id)
  return true
}

export async function addPhoto(idOrRef, itemId, fileName) {
  await openDb()
  const current = await getShipment(idOrRef)
  if (!current) return null
  const item = itemId ? current.items.find((i) => i.id === itemId) : current.items[0]
  if (!item) return null
  db.prepare("INSERT INTO photos(id, item_id, file) VALUES(?,?,?)").run(nid("ph"), item.id, fileName)
  db.prepare("UPDATE shipments SET updated_at = ? WHERE id = ?").run(now(), current.id)
  return getShipment(current.id)
}

export async function removePhoto(idOrRef, itemId, fileName) {
  await openDb()
  const current = await getShipment(idOrRef)
  if (!current) return null
  const item = current.items.find((i) => i.id === itemId) || current.items[0]
  if (!item) return null
  db.prepare("DELETE FROM photos WHERE item_id = ? AND file = ?").run(item.id, fileName)
  db.prepare("UPDATE shipments SET updated_at = ? WHERE id = ?").run(now(), current.id)
  return getShipment(current.id)
}

export async function countShipments() {
  await openDb()
  return db.prepare("SELECT COUNT(*) AS n FROM shipments").get().n
}

export async function getState() {
  await openDb()
  return { settings: await getSettings(), count: await countShipments() }
}
