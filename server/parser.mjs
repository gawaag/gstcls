/** Local French shipment parser. No paid API. */

const CITIES = [
  // France (agence + alentours + fréquents)
  "savigny-sur-orge", "savigny", "bagneux", "paris", "orly", "evry", "évry",
  "corbeil", "massy", "juvisy", "viry-chatillon", "viry", "grigny",
  "ris-orangis", "longjumeau", "athis-mons", "draveil", "vigneux", "yerres",
  "brunoy", "montgeron", "palaiseau", "antony", "cachan", "arcueil",
  "gentilly", "montrouge", "malakoff", "vanves", "issy", "boulogne",
  "creteil", "créteil", "vitry", "ivry", "villejuif", "l'hay-les-roses",
  "bourg-la-reine", "sceaux", "chatenay", "fontenay", "nogent", "vincennes",
  "saint-denis", "aubervilliers", "pantin", "montreuil", "bondy", "aulnay",
  "lyon", "marseille", "lille", "toulouse", "nantes", "strasbourg",
  "bordeaux", "nice", "rennes", "reims", "tours", "orleans", "orléans",
  "dijon", "grenoble", "angers", "le mans", "amiens", "limoges",
  "clermont-ferrand", "besancon", "besançon", "perpignan", "metz",
  "caen", "mulhouse", "rouen", "nancy", "argenteuil", "montreuil",
  // Maroc
  "rabat", "casablanca", "casa", "sale", "salé", "temara", "témara",
  "kenitra", "kénitra", "fes", "fès", "meknes", "meknès", "tanger",
  "tetouan", "tétouan", "oujda", "nador", "al hoceima", "agadir",
  "marrakech", "marrakesh", "essaouira", "safi", "el jadida",
  "beni mellal", "khouribga", "settat", "settat", "berrechid",
  "mohammedia", "larache", "khemisset", "khémisset", "taza",
  "errachidia", "ouarzazate", "laayoune", "dakhla", "ifrane",
  "sidi kacem", "sidi slimane", "ksar el kebir", "fnideq", "martil",
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
  "avec", "sans", "tel", "tels", "numero", "numéro", "telephone",
  "téléphone", "phone",   "envoy", "envoyee", "envoyée", "envoye", "envoyé",
  "envoyes", "envoyés", "destinataire", "expediteur", "expéditeur",
  "kg", "kilo", "kilos", "prix", "unitaire", "piece", "pièce",
  "dh", "mad", "eur", "euro", "euros", ...COLORS,
])

function fold(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
}

function titleCase(s) {
  return String(s || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

function parsePrice(text) {
  const t = fold(text)
  const unit = /\b(dh|mad|dirhams?)\b/.test(t) ? "MAD" : /€|eur|euros?/.test(t) ? "EUR" : null

  const patterns = [
    /prix(?:\s+unitaire)?\s*[:=]?\s*(\d+)[.,](\d{1,2})/,
    /prix(?:\s+unitaire)?\s*[:=]?\s*(\d+)\s*(?:dh|mad|€|e|eur)\s*(\d{1,2})/,
    /(\d+)\s*dh\s*(\d{1,2})/,
    /(\d+)\s*[€e]\s*(\d{1,2})/,
    /(\d+)[.,](\d{1,2})\s*(?:dh|mad|€|eur|euros?|le\s+kilo|\/\s*kg)/,
    /(?:a|à)\s+(\d+)[.,](\d{1,2})\s*(?:€|eur|dh)?\s*(?:le\s+kilo|\/\s*kg)?/,
  ]
  for (const re of patterns) {
    const m = t.match(re)
    if (m) {
      const euros = Number(m[1])
      const cents = Number((m[2] || "0").padEnd(2, "0"))
      return { unitPrice: euros + cents / 100, currency: unit }
    }
  }
  const simple = t.match(/prix(?:\s+unitaire)?\s*[:=]?\s*(\d+(?:[.,]\d+)?)/)
  if (simple) return { unitPrice: Number(simple[1].replace(",", ".")), currency: unit }
  return { unitPrice: null, currency: unit }
}

function parsePhones(text) {
  const found = []
  const re = /(?:\+|00)?(?:33|212)?[\s./-]*0?[\s./-]*[1-9](?:[\s./-]*\d){7,10}/g
  let m
  while ((m = re.exec(text))) {
    const digits = m[0].replace(/\D/g, "")
    if (digits.length < 8) continue
    found.push({ raw: m[0].trim(), index: m.index, digits })
  }
  // placeholders like 06xxxx
  const loose = [...text.matchAll(/\b0\d[\dxX*]{4,12}\b/g)]
  for (const m of loose) {
    if (found.some((p) => Math.abs(p.index - m.index) < 3)) continue
    found.push({ raw: m[0], index: m.index, digits: m[0].replace(/\D/g, "") })
  }
  return found.sort((a, b) => a.index - b.index)
}

function findCities(text) {
  const t = fold(text)
  const hits = []
  for (const city of CITIES) {
    const re = new RegExp(`\\b${city.replace(/[-']/g, "[-\\s']?")}\\b`, "i")
    const m = t.match(re)
    if (m && m.index != null) {
      hits.push({ city, index: m.index, length: m[0].length })
    }
  }
  hits.sort((a, b) => a.index - b.index || b.length - a.length)
  const uniq = []
  for (const h of hits) {
    if (uniq.some((u) => Math.abs(u.index - h.index) < 3)) continue
    uniq.push(h)
  }
  return uniq
}

function parseItems(text) {
  const t = fold(text)
  const items = []
  const re =
    /(\d+)\s*(?:colis|cartons?|valises?|sacs?|pieces?|pièces?|pcs?)?\s*(?:de\s+)?(\d+(?:[.,]\d+)?)\s*k(?:g|ilos?)\b(?:\s+([a-zàâäéèêëïîôùûüç]{3,20}))?/gi
  let m
  while ((m = re.exec(t))) {
    const color = COLORS.includes(fold(m[3] || "")) ? fold(m[3]) : ""
    items.push({
      qty: Number(m[1]),
      weightKg: Number(m[2].replace(",", ".")),
      description: color ? `colis ${color}` : "colis",
      color,
    })
  }
  if (!items.length) {
    const loose = [...t.matchAll(/(\d+(?:[.,]\d+)?)\s*k(?:g|ilos?)\b(?:\s+([a-zàâäéèêëïîôùûüç]{3,20}))?/gi)]
    for (const x of loose) {
      const color = COLORS.includes(fold(x[2] || "")) ? fold(x[2]) : ""
      items.push({
        qty: 1,
        weightKg: Number(x[1].replace(",", ".")),
        description: color ? `colis ${color}` : "colis",
        color,
      })
    }
  }
  return items
}

function wordsBetween(text, start, end) {
  return text
    .slice(start, end)
    .replace(/[|,;:/()]+/g, " ")
    .replace(/\b(?:numero|numéro|de\s+tel|tel|tél|telephone|téléphone|n°)\b/gi, " ")
    .replace(/\b0[\dxX*]{4,14}\b/g, " ")
    .replace(/(?:\+|00)?(?:33|212)?[\s./-]*0?[\s./-]*[1-9](?:[\s./-]*\d){7,10}/g, " ")
    .trim()
}

function cleanName(chunk) {
  const cities = findCities(chunk)
  let s = chunk
  for (const c of cities) {
    s = s.replace(new RegExp(c.city.replace(/[-']/g, "[-\\s']?"), "ig"), " ")
  }
  return titleCase(
    s
      .replace(/\b(?:colis|de|du|des|expediteur|expéditeur|destinataire|envoye|envoyé|envoyee|envoyée|a|à)\b/gi, " ")
      .replace(/[^A-Za-zÀ-ÿ' -]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP.has(fold(w)))
      .join(" "),
  )
}

function dropCargoTail(text) {
  const cut = text.search(
    /\b(?:\d+\s*(?:colis|cartons?|valises?|sacs?)|\d+(?:[.,]\d+)?\s*k(?:g|ilos?)|prix\b)/i,
  )
  return cut >= 0 ? text.slice(0, cut) : text
}

function splitSides(text) {
  const re = /\b(?:envoy[éeèe]{0,2}s?\s+[àa]|destinataire\s*[:=]?|pour\s+(?=[A-Za-zÀ-ÿ]{2,}))/i
  const m = text.match(re)
  if (!m || m.index == null) return { left: text, right: "" }
  return {
    left: text.slice(0, m.index),
    right: text.slice(m.index + m[0].length),
  }
}

export function parseShipmentText(text) {
  const raw = String(text || "").replace(/\s+/g, " ").trim()
  if (!raw) {
    return emptyResult(raw)
  }

  const { left, right } = splitSides(raw)
  const phones = parsePhones(raw)
  const cities = findCities(raw)
  const { unitPrice, currency } = parsePrice(raw)
  const items = parseItems(raw)

  const mid = right ? left.length : raw.length
  const senderPhones = phones.filter((p) => p.index < mid)
  const receiverPhones = phones.filter((p) => p.index >= mid)
  const senderCities = cities.filter((c) => c.index < fold(left).length || !right)
  const receiverCities = right ? cities.filter((c) => c.index >= fold(left).length - 2) : []

  // If only one city on left after "de NAME CITY"
  let senderCity = senderCities[senderCities.length - 1]?.city || ""
  let receiverCity = receiverCities[0]?.city || senderCities[1]?.city || ""
  if (!right && senderCities.length >= 2) {
    senderCity = senderCities[0].city
    receiverCity = senderCities[senderCities.length - 1].city
  }

  const senderName = cleanName(
    wordsBetween(dropCargoTail(left.replace(/^colis\s+/i, "")), 0, left.length),
  )
  const receiverChunk = dropCargoTail(right || "")
  const receiverName = cleanName(wordsBetween(receiverChunk, 0, receiverChunk.length))

  const notes = []
  if (!senderName) notes.push("Nom expéditeur à confirmer")
  if (!receiverName) notes.push("Nom destinataire à confirmer")
  if (!items.length) notes.push("Aucun poids détecté")

  const confidence = score({
    senderName,
    receiverName,
    senderCity,
    receiverCity,
    senderPhone: senderPhones[0]?.raw,
    receiverPhone: receiverPhones[0]?.raw || senderPhones[1]?.raw,
    items,
    unitPrice,
  })

  return {
    text: raw,
    confidence,
    warnings: notes,
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

function score(p) {
  let n = 0
  if (p.senderName) n += 20
  if (p.receiverName) n += 20
  if (p.senderCity) n += 10
  if (p.receiverCity) n += 10
  if (p.senderPhone) n += 10
  if (p.receiverPhone) n += 10
  if (p.items?.length && p.items[0].weightKg) n += 15
  if (p.unitPrice) n += 5
  return n
}

function emptyResult(text) {
  return {
    text,
    confidence: 0,
    warnings: ["Texte vide"],
    sender: { name: "", phone: "", city: "", address: "" },
    receiver: { name: "", phone: "", city: "", address: "" },
    unitPrice: null,
    currency: null,
    items: [{ qty: 1, weightKg: 0, description: "colis", color: "" }],
  }
}
