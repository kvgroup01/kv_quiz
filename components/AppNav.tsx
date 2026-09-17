"use client";

import { useState } from "react";
import Link from "next/link";
import { PillTabs } from "@/components/ui/PillTabs";

const ITEMS = [
  { id: "inicio", label: "Início", href: "/" },
  { id: "builder", label: "Construtor", href: "/builder" },
  { id: "leads", label: "Leads", href: "/kanban" },
  { id: "historico", label: "Histórico", href: "/kanban/banco" }
];

export type NavKey = "inicio" | "builder" | "leads" | "historico";

export default function AppNav({ current }: { current: NavKey }) {
  const [open, setOpen] = useState(false);
  return (
    <nav className="app-nav">
      <div className="in-container app-nav-bar">
        <Link href="/" className="app-nav-brand">Intake</Link>
        <div className="app-nav-links"><PillTabs items={ITEMS} active={current} ariaLabel="Seções" /></div>
        <button type="button" className="app-nav-burger" onClick={() => setOpen((v) => !v)} aria-label="Menu">{open ? "✕" : "☰"}</button>
      </div>
      {open && (
        <div className="in-container app-nav-drawer">
          {ITEMS.map((it) => (
            <Link key={it.id} href={it.href} className={"ui-pill" + (it.id === current ? " active" : "")} onClick={() => setOpen(false)}>{it.label}</Link>
          ))}
        </div>
      )}
    </nav>
  );
}
