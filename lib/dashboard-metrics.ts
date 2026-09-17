import type { Lead } from "./lead-schema";

export type Period = "month" | "7d" | "today";

export function greeting(hour: number): "Bom dia" | "Boa tarde" | "Boa noite" {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function periodStart(period: Period, now: Date): Date {
  const d = new Date(now);
  if (period === "today") { d.setHours(0, 0, 0, 0); return d; }
  if (period === "7d") { d.setDate(d.getDate() - 7); return d; }
  d.setDate(1); d.setHours(0, 0, 0, 0); return d;
}

export function inPeriod(iso: string, period: Period, now: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= periodStart(period, now).getTime() && t <= now.getTime();
}

export function pendingDoubts(leads: Lead[], entryColumnId: string): Lead[] {
  return leads
    .filter((l) => l.tipo === "duvida" && l.status === entryColumnId)
    .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
}

export function countByTipo(leads: Lead[]): { qualificado: number; duvida: number } {
  return leads.reduce((acc, l) => { acc[l.tipo] += 1; return acc; }, { qualificado: 0, duvida: 0 });
}

export function countByFunnel(leads: Lead[]): { funil: string; count: number }[] {
  const map = new Map<string, number>();
  for (const l of leads) map.set(l.funil, (map.get(l.funil) ?? 0) + 1);
  return Array.from(map, ([funil, count]) => ({ funil, count })).sort((a, b) => b.count - a.count);
}

export function timeAgo(iso: string, now: Date): string {
  const s = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "agora";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
}
