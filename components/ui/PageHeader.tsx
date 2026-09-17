import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="ui-page-head">
      <div>
        <h1 className="ui-page-title">{title}</h1>
        {subtitle && <p className="ui-page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="ui-page-actions">{actions}</div>}
    </header>
  );
}
