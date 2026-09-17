import type { ReactNode } from "react";

export function Card({
  title, subtitle, action, className = "", children
}: { title?: string; subtitle?: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={"ui-card " + className}>
      {(title || action) && (
        <header className="ui-card-head">
          <div>
            {title && <h2 className="ui-card-title">{title}</h2>}
            {subtitle && <p className="ui-card-sub">{subtitle}</p>}
          </div>
          {action && <div className="ui-card-action">{action}</div>}
        </header>
      )}
      <div className="ui-card-body">{children}</div>
    </section>
  );
}
