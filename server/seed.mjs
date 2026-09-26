import { countShipments, createShipment } from "./store.mjs"
import { nextRef } from "./ref.mjs"

export async function seedIfEmpty() {
  if ((await countShipments()) > 0) return
  await createShipment(
    {
      sender: { name: "Amine Yass", phone: "0612345678", city: "Bagneux", address: "" },
      receiver: { name: "Ayman Rachdi", phone: "0622334455", city: "Rabat", address: "" },
      unitPrice: 1.5,
      currency: "EUR",
      notes: "Exemple agent: 3 colis, 35 kg",
      sourceText:
        "colis de Amine Yass Bagneux 0612345678 envoyé à Ayman Rachdi à Rabat 0622334455 1 colis 20kg rouge 1 colis 10kg 1 colis 5kg prix unitaire 1,50€",
      items: [
        { qty: 1, weightKg: 20, description: "colis rouge", color: "rouge" },
        { qty: 1, weightKg: 10, description: "colis", color: "" },
        { qty: 1, weightKg: 5, description: "colis", color: "" },
      ],
    },
    nextRef,
  )
  await createShipment(
    {
      sender: { name: "Karima El Idrissi", phone: "0751139265", city: "Savigny-sur-Orge", address: "27 Avenue de la Gare" },
      receiver: { name: "Nabil Benali", phone: "0661987744", city: "Casablanca", address: "" },
      unitPrice: 1.5,
      currency: "EUR",
      notes: "Valise + carton, prochain départ",
      status: "en_stock",
      items: [
        { qty: 1, weightKg: 23, description: "valise noire", color: "noir" },
        { qty: 2, weightKg: 12, description: "carton linge", color: "" },
      ],
    },
    nextRef,
  )
}
