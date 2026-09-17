import Link from "next/link";

export interface PillItem { id: string; label: string; href?: string }

export function PillTabs({
  items, active, onChange, ariaLabel
}: { items: PillItem[]; active: string; onChange?: (id: string) => void; ariaLabel?: string }) {
  return (
    <nav className="ui-pills" aria-label={ariaLabel}>
      {items.map((it) => {
        const cls = "ui-pill" + (it.id === active ? " active" : "");
        return it.href
          ? <Link key={it.id} href={it.href} className={cls}>{it.label}</Link>
          : <button key={it.id} type="button" className={cls} onClick={() => onChange?.(it.id)}>{it.label}</button>;
      })}
    </nav>
  );
}
