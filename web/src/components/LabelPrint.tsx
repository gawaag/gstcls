import type { Shipment } from "../types"

export function LabelPrint({ shipment }: { shipment: Shipment }) {
  return (
    <div className="print-only">
      {shipment.items.map((item, i) => (
        <article key={item.ref || i} className="label-sheet">
          <header>
            <strong>S.A.M</strong>
            <span>FRA → MAR</span>
          </header>
          <img src={`/api/qr/${encodeURIComponent(item.ref || shipment.ref)}.svg`} alt="" />
          <p className="ref">{item.ref || shipment.ref}</p>
          <p>
            {shipment.sender.name} → {shipment.receiver.name}
          </p>
          <p>
            {shipment.sender.city} → {shipment.receiver.city}
          </p>
          <p>
            {item.weightKg} kg · {item.qty} · {item.color || item.description}
          </p>
        </article>
      ))}
      <style>{`
        @media print {
          @page { size: 58mm 40mm; margin: 0; }
          .label-sheet {
            width: 58mm;
            height: 40mm;
            padding: 2.5mm;
            box-sizing: border-box;
            page-break-after: always;
            font-family: sans-serif;
            color: #111;
          }
          .label-sheet header {
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            font-weight: 700;
          }
          .label-sheet img { width: 16mm; height: 16mm; }
          .label-sheet .ref { font-size: 13px; font-weight: 800; margin: 1mm 0; }
          .label-sheet p { margin: 0; font-size: 8px; }
        }
      `}</style>
    </div>
  )
}
