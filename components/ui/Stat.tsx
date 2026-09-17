export function Stat({ value, label, hint }: { value: number | string; label: string; hint?: string }) {
  return (
    <div className="ui-stat">
      <span className="ui-stat-value">{value}</span>
      <span className="ui-stat-label">{label}</span>
      {hint && <span className="ui-stat-hint">{hint}</span>}
    </div>
  );
}
