export const STATUS_LABEL: Record<string, string> = {
  recu: "Reçu",
  en_stock: "En stock",
  en_route: "En route",
  arrive: "Arrivé Maroc",
  pret: "Prêt à retirer",
  livre: "Livré",
  incident: "Incident",
  annule: "Annulé",
}

export const STATUS_TONE: Record<string, string> = {
  recu: "tone-recu",
  en_stock: "tone-stock",
  en_route: "tone-route",
  arrive: "tone-arrive",
  pret: "tone-pret",
  livre: "tone-livre",
  incident: "tone-incident",
  annule: "tone-annule",
}

export const STATUS_ORDER = Object.keys(STATUS_LABEL)

export function money(n: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(n || 0)
}

export function when(iso?: string) {
  if (!iso) return ""
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso))
}
