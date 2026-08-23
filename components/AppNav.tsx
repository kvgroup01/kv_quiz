import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

const ITEMS = [
  { href: "/", label: "🏠 Painel", key: "painel" },
  { href: "/builder", label: "🛠 Construtor", key: "builder" },
  { href: "/kanban", label: "📥 Dúvidas", key: "kanban" }
] as const;

export default function AppNav({ current }: { current: "painel" | "builder" | "kanban" }) {
  return (
    <nav
      style={{
        display: "flex",
        gap: 6,
        alignItems: "center",
        padding: "10px 20px",
        borderBottom: "1px solid var(--option-border)",
        background: "var(--bg)"
      }}
    >
      <span style={{ fontWeight: 700, fontSize: "0.85rem", marginRight: 10 }}>⚖ Radar Jurídico</span>
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
    </nav>
  );
}
