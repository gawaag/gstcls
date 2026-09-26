import type { ParcelItem, ParseResult, Person } from "../types"

const CITIES = [
  "savigny-sur-orge", "savigny", "bagneux", "paris", "orly", "evry", "évry",
  "corbeil", "massy", "juvisy", "viry-chatillon", "viry", "grigny",
  "ris-orangis", "longjumeau", "athis-mons", "draveil", "vigneux", "yerres",
  "brunoy", "montgeron", "palaiseau", "antony", "cachan", "arcueil",
  "gentilly", "montrouge", "malakoff", "vanves", "issy", "boulogne",
  "creteil", "créteil", "vitry", "ivry", "villejuif",
  "bourg-la-reine", "sceaux", "chatenay", "fontenay", "nogent", "vincennes",
  "saint-denis", "aubervilliers", "pantin", "montreuil", "bondy", "aulnay",
  "lyon", "marseille", "lille", "toulouse", "nantes", "strasbourg",
  "bordeaux", "nice", "rennes", "reims", "tours", "orleans", "orléans",
  "dijon", "grenoble", "angers", "le mans", "amiens",
  "rabat", "casablanca", "casa", "sale", "salé", "temara", "témara",
  "kenitra", "kénitra", "fes", "fès", "meknes", "meknès", "tanger",
  "tetouan", "tétouan", "oujda", "nador", "agadir", "marrakech", "marrakesh",
  "essaouira", "safi", "el jadida", "beni mellal", "settat", "mohammedia",
  "larache", "taza", "ouarzazate", "ifrane",
]

const COLORS = [
  "rouge", "bleu", "bleue", "noir", "noire", "blanc", "blanche",
  "vert", "verte", "jaune", "marron", "gris", "grise", "orange",
  "rose", "violet", "violette", "beige", "dore", "doré", "argent",
]

const STOP = new Set([
  "colis", "carton", "cartons", "valise", "valises", "sac", "sacs",
  "de", "du", "des", "le", "la", "les", "un", "une", "et", "a", "à",
  "au", "aux", "en", "pour", "chez", "vers", "par", "sur", "dans",
  "avec", "sans", "tel", "numero", "numéro", "telephone", "téléphone",
  "envoy", "envoyee", "envoyée", "envoye", "envoyé", "destinataire",
  "expediteur", "expéditeur", "kg", "kilo", "kilos", "prix", "unitaire",
  "dh", "mad", "eur", "euro", "euros", ...COLORS,
])

function fold(s: string) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
}

function titleCase(s: string) {
  return String(s || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

function emptyPerson(): Person {
  return { name: "", phone: "", city: "", address: "" }
}

function emptyResult(text: string): ParseResult {
  return {
    text,
    confidence: 0,
    warnings: text ? [] : ["Texte vide"],
    sender: emptyPerson(),
    receiver: emptyPerson(),
    unitPrice: null,
    currency: null,
    items: [{ qty: 1, weightKg: 0, description: "colis", color: "" }],
  }
}

export const DEMO_PHRASE =
  "colis de Amine Yass Bagneux 0612345678 envoyé à Ayman Rachdi à Rabat 0622334455 1 colis 20kg rouge 1 colis 10kg 1 colis 5kg prix unitaire 1,50 euro"

export function parseShipmentText(text: string): ParseResult {
  const raw = String(text || "").replace(/\s+/g, " ").trim()
  if (!raw) return emptyResult(raw)

  const split = raw.match(/\b(?:envoy[éeèe]{0,2}s?\s+[àa]|destinataire\s*[:=]?|pour\s+(?=[A-Za-zÀ-ÿ]{2,}))/i)
  const left = split?.index != null ? raw.slice(0, split.index) : raw
  const right = split?.index != null ? raw.slice(split.index + split[0].length) : ""

  const phones = [...raw.matchAll(/(?:\+|00)?(?:33|212)?[\s./-]*0?[\s./-]*[1-9](?:[\s./-]*\d){7,10}|\b0\d[\dxX*]{4,12}\b/g)].map((m) => ({
    raw: m[0].trim(),
    index: m.index || 0,
  }))

  const cities: { city: string; index: number }[] = []
  const folded = fold(raw)
  for (const city of CITIES) {
    const re = new RegExp(`\\b${city.replace(/[-']/g, "[-\\s']?")}\\b`, "i")
    const m = folded.match(re)
    if (m?.index != null) cities.push({ city, index: m.index })
  }
  cities.sort((a, b) => a.index - b.index)

  const t = fold(raw)
  const items: ParcelItem[] = []
  const itemRe =
    /(\d+)\s*(?:colis|cartons?|valises?|sacs?|pieces?|pièces?|pcs?)?\s*(?:de\s+)?(\d+(?:[.,]\d+)?)\s*k(?:g|ilos?)\b(?:\s+([a-zàâäéèêëïîôùûüç]{3,20}))?/gi
  let im
  while ((im = itemRe.exec(t))) {
    const color = COLORS.includes(fold(im[3] || "")) ? fold(im[3]) : ""
    items.push({
      qty: Number(im[1]),
      weightKg: Number(im[2].replace(",", ".")),
      description: color ? `colis ${color}` : "colis",
      color,
    })
  }
  if (!items.length) {
    for (const x of t.matchAll(/(\d+(?:[.,]\d+)?)\s*k(?:g|ilos?)\b(?:\s+([a-zàâäéèêëïîôùûüç]{3,20}))?/gi)) {
      const color = COLORS.includes(fold(x[2] || "")) ? fold(x[2]) : ""
      items.push({
        qty: 1,
        weightKg: Number(x[1].replace(",", ".")),
        description: color ? `colis ${color}` : "colis",
        color,
      })
    }
  }

  let currency: string | null = /\b(dh|mad|dirhams?)\b/.test(t) ? "MAD" : /€|eur|euros?/.test(t) ? "EUR" : null
  let unitPrice: number | null = null
  const price =
    t.match(/prix(?:\s+unitaire)?\s*[:=]?\s*(\d+)[.,](\d{1,2})/) ||
    t.match(/(\d+)[.,](\d{1,2})\s*(?:dh|mad|€|eur|euros?|le\s+kilo|\/\s*kg)/) ||
    t.match(/prix(?:\s+unitaire)?\s*[:=]?\s*(\d+(?:[.,]\d+)?)/)
  if (price) {
    if (price[2] && !price[1].includes(".") && !price[1].includes(",")) {
      unitPrice = Number(price[1]) + Number(price[2].padEnd(2, "0")) / 100
    } else {
      unitPrice = Number(String(price[1]).replace(",", "."))
    }
  }

  const mid = right ? left.length : raw.length
  const senderPhones = phones.filter((p) => p.index < mid)
  const receiverPhones = phones.filter((p) => p.index >= mid)
  const senderCities = cities.filter((c) => c.index < fold(left).length || !right)
  const receiverCities = right ? cities.filter((c) => c.index >= fold(left).length - 2) : []

  let senderCity = senderCities.at(-1)?.city || ""
  let receiverCity = receiverCities[0]?.city || senderCities[1]?.city || ""
  if (!right && senderCities.length >= 2) {
    senderCity = senderCities[0].city
    receiverCity = senderCities.at(-1)?.city || ""
  }

  const senderName = cleanName(dropCargo(left.replace(/^colis\s+/i, "")))
  const receiverName = cleanName(dropCargo(right))

  const warnings: string[] = []
  if (!senderName) warnings.push("Nom expéditeur à confirmer")
  if (!receiverName) warnings.push("Nom destinataire à confirmer")
  if (!items.length) warnings.push("Aucun poids détecté")

  let confidence = 0
  if (senderName) confidence += 20
  if (receiverName) confidence += 20
  if (senderCity) confidence += 10
  if (receiverCity) confidence += 10
  if (senderPhones[0]) confidence += 10
  if (receiverPhones[0] || senderPhones[1]) confidence += 10
  if (items[0]?.weightKg) confidence += 15
  if (unitPrice) confidence += 5

  return {
    text: raw,
    confidence,
    warnings,
    sender: {
      name: senderName,
      phone: senderPhones[0]?.raw || "",
      city: titleCase(senderCity.replace(/-/g, " ")),
      address: "",
    },
    receiver: {
      name: receiverName,
      phone: (receiverPhones[0] || senderPhones[1])?.raw || "",
      city: titleCase((receiverCity || "").replace(/-/g, " ")),
      address: "",
    },
    unitPrice,
    currency,
    items: items.length ? items : [{ qty: 1, weightKg: 0, description: "colis", color: "" }],
  }
}

function dropCargo(text: string) {
  const cut = text.search(/\b(?:\d+\s*(?:colis|cartons?|valises?|sacs?)|\d+(?:[.,]\d+)?\s*k(?:g|ilos?)|prix\b)/i)
  return cut >= 0 ? text.slice(0, cut) : text
}

function cleanName(chunk: string) {
  let s = chunk
  for (const city of CITIES) {
    s = s.replace(new RegExp(city.replace(/[-']/g, "[-\\s']?"), "ig"), " ")
  }
  return titleCase(
    s
      .replace(/\b(?:colis|de|du|des|expediteur|expéditeur|destinataire|envoye|envoyé|envoyee|envoyée|a|à|numero|numéro|tel|tél|telephone|téléphone)\b/gi, " ")
      .replace(/(?:\+|00)?(?:33|212)?[\s./-]*0?[\s./-]*[1-9](?:[\s./-]*\d){7,10}/g, " ")
      .replace(/\b0[\dxX*]{4,14}\b/g, " ")
      .replace(/[^A-Za-zÀ-ÿ' -]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP.has(fold(w)))
      .join(" "),
  )
}
