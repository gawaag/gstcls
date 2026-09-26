const ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function dayStamp(d = new Date()) {
  const y = String(d.getFullYear()).slice(2)
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}${m}${day}`
}

function encode(n) {
  let x = Number(n)
  let out = ""
  for (let i = 0; i < 4; i++) {
    out = ALPH[x % ALPH.length] + out
    x = Math.floor(x / ALPH.length)
  }
  return out
}

export function nextRef(seq, date = new Date()) {
  return `SAM-${dayStamp(date)}-${encode(seq)}`
}

export function itemRef(shipmentRef, index) {
  return `${shipmentRef}-${index + 1}`
}
