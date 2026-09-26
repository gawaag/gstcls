import { QrCode } from "@phosphor-icons/react"
import { NavLink, Route, Routes } from "react-router-dom"
import { Desk } from "./pages/Desk"
import { ShipmentPage } from "./pages/ShipmentPage"
import { TrackPage } from "./pages/TrackPage"

export default function App() {
  return (
    <div className="min-h-[100dvh] text-[var(--ink)]">
      <header className="no-print sticky top-0 z-20 px-3 pt-3">
        <div className="shell mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full px-3 py-2 backdrop-blur-xl">
          <NavLink to="/" className="flex items-center gap-3 pl-1">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--accent)] text-[12px] font-semibold text-[var(--accent-ink)]">
              SAM
            </span>
            <span className="leading-tight">
              <strong className="block text-sm tracking-tight">S.A.M TRANSPORT CHARK</strong>
              <span className="text-[11px] text-[var(--muted)]">Bureau agence · 1,50 €/kg · FRA MAR</span>
            </span>
          </NavLink>
          <nav className="flex items-center gap-1 text-sm">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `rounded-full px-3 py-1.5 ${isActive ? "bg-white/6" : "text-[var(--muted)]"}`
              }
            >
              Bureau
            </NavLink>
            <a href="#scan" className="hidden rounded-full px-3 py-1.5 text-[var(--muted)] sm:inline-flex">
              <QrCode size={16} className="mr-1" /> Scan
            </a>
          </nav>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<Desk />} />
        <Route path="/colis/:id" element={<ShipmentPage />} />
        <Route path="/s/:ref" element={<TrackPage />} />
      </Routes>
    </div>
  )
}
