import type { ReactNode } from "react";

export type BadgeTone = "purple" | "orange" | "green" | "gray" | "red";

export function Badge({ tone = "gray", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`ui-badge ui-badge-${tone}`}>{children}</span>;
}
