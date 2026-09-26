import { test } from "node:test"
import assert from "node:assert/strict"
import { parseShipmentText } from "./parser.mjs"

test("exemple Amine Yass vers Ayman Rachdi", () => {
  const r = parseShipmentText(
    "colis de Amine Yass bagneux 0612345678 envoyé à ayman rachdi à rabat numéro de tel 0622334455 1 colis 20kg rouge 1 colis 10 kg 1 colis 5kg prix unitaire 1dh50",
  )
  assert.equal(r.sender.name, "Amine Yass")
  assert.match(r.sender.phone, /0612345678/)
  assert.equal(r.sender.city, "Bagneux")
  assert.equal(r.receiver.name, "Ayman Rachdi")
  assert.equal(r.receiver.city, "Rabat")
  assert.match(r.receiver.phone, /0622334455/)
  assert.equal(r.items.length, 3)
  assert.equal(r.items[0].weightKg, 20)
  assert.equal(r.items[0].color, "rouge")
  assert.equal(r.items[1].weightKg, 10)
  assert.equal(r.items[2].weightKg, 5)
  assert.equal(r.unitPrice, 1.5)
  assert.ok(r.confidence >= 80)
})
