import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  width?: string;
}

export function DataTable<T extends { id: string }>({
  columns, rows, onRowClick, emptyText
}: { columns: Column<T>[]; rows: T[]; onRowClick?: (row: T) => void; emptyText: string }) {
  if (!rows.length) return <p className="ui-table-empty">{emptyText}</p>;
  return (
    <table className="ui-table">
      <thead>
        <tr>
          {columns.map((c) => <th key={c.key} style={c.width ? { width: c.width } : undefined}>{c.label}</th>)}
          {onRowClick && <th aria-hidden style={{ width: 32 }} />}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className={onRowClick ? "clickable" : ""} onClick={onRowClick ? () => onRowClick(row) : undefined}>
            {columns.map((c) => (
              <td key={c.key} data-label={c.label}>{c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}</td>
            ))}
            {onRowClick && <td className="ui-table-chevron" aria-hidden>›</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
