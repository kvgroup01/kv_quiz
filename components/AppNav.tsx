"use client";

import { useState } from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

const ITEMS = [
  { href: "/", label: "🏠 Painel", key: "painel" },
  { href: "/builder", label: "🛠 Construtor", key: "builder" },
  { href: "/kanban", label: "📥 Dúvidas", key: "kanban" },
  { href: "/kanban/banco", label: "📦 Banco de Leads", key: "banco" }
] as const;

export default function AppNav({ current }: { current: "painel" | "builder" | "kanban" | "banco" }) {
  const [open, setOpen] = useState(false);

  return (
    <nav className="app-nav">
      <div className="app-nav-bar">
        <span className="app-nav-brand">⚖ Radar Jurídico</span>
        <div className="app-nav-links">
          {ITEMS.map((it) => (
            <Link
              key={it.key}
              href={it.href}
              className="btn small"
              style={
                it.key === current
                  ? { background: "var(--purple-deep)", color: "#fff", borderColor: "transparent", textDecoration: "none" }
                  : { textDecoration: "none" }
              }
            >
              {it.label}
            </Link>
          ))}
          <ThemeToggle />
        </div>
        <button type="button" className="app-nav-burger" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? "✕" : "☰"}
        </button>
      </div>
      {open && (
        <div className="app-nav-drawer">
          {ITEMS.map((it) => (
            <Link
              key={it.key}
              href={it.href}
              className="btn small"
              onClick={() => setOpen(false)}
              style={
                it.key === current
                  ? { background: "var(--purple-deep)", color: "#fff", borderColor: "transparent", textDecoration: "none" }
                  : { textDecoration: "none" }
              }
            >
              {it.label}
            </Link>
          ))}
          <ThemeToggle />
        </div>
      )}
    </nav>
  );
}
