export type Person = {
  name: string
  phone: string
  city: string
  address: string
}

export type ParcelItem = {
  id?: string
  ref?: string
  qty: number
  weightKg: number
  description: string
  color: string
  photos?: string[]
}

export type ShipmentEvent = {
  at: string
  status: string
  note: string
}

export type Totals = {
  itemCount: number
  weightKg: number
  unitPrice: number
  total: number
  currency: string
}

export type Shipment = {
  id: string
  ref: string
  status: string
  sender: Person
  receiver: Person
  unitPrice: number
  currency: string
  notes: string
  sourceText?: string
  items: ParcelItem[]
  events: ShipmentEvent[]
  totals: Totals
  createdAt: string
  updatedAt: string
}

export type ParseResult = {
  text: string
  confidence: number
  warnings: string[]
  sender: Person
  receiver: Person
  unitPrice: number | null
  currency: string | null
  items: ParcelItem[]
}

export type Settings = {
  agency: string
  unitPrice: number
  currency: string
  corridor: string
  desk: string
}
