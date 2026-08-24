"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { Lead, KanbanColumn } from "@/lib/lead-schema";
import AppNav from "@/components/AppNav";
import { LeadCard, LeadDetailModal } from "@/components/leads-ui";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} de ${y}`;
}

export default function BancoDeLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [funnelNames, setFunnelNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [leadsRes, colsRes, funnelsRes] = await Promise.all([
        fetch("/api/leads"), fetch("/api/kanban/columns"), fetch("/api/funnels")
      ]);
      const leadsData = await leadsRes.json();
      const colsData = await colsRes.json();
      const funnelsData = await funnelsRes.json();
      setLeads(leadsData.leads || []);
      setColumns(colsData.columns || []);
      if (funnelsData.ok) {
        const map: Record<string, string> = {};
        (funnelsData.funnels || []).forEach((f: { slug: string; nome: string }) => { map[f.slug] = f.nome; });
        setFunnelNames(map);
      }
      setError(leadsData.ok === false ? leadsData.error : null);
    } catch {
      setError("Falha ao carregar os leads.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const months = useMemo(() => {
    const set = new Set(leads.map((l) => monthKey(l.criadoEm)));
    return Array.from(set).sort().reverse();
  }, [leads]);

  const currentMonth = monthKey(new Date().toISOString());

  useEffect(() => {
    if (selectedMonth !== null) return;
    if (!months.length) return;
    // Padrão: o mês passado mais recente com leads — o mês corrente já tem
    // sua própria tela ao vivo no Kanban.
    const pastMonth = months.find((m) => m !== currentMonth);
    setSelectedMonth(pastMonth || months[0]);
  }, [months, currentMonth, selectedMonth]);

  const columnLabel = useCallback((statusId: string) => columns.find((c) => c.id === statusId)?.label || statusId, [columns]);

  const monthLeads = useMemo(
    () => (selectedMonth ? leads.filter((l) => monthKey(l.criadoEm) === selectedMonth) : []),
    [leads, selectedMonth]
  );

  async function handleDelete(lead: Lead) {
    if (!confirm(`Excluir o lead de "${lead.nome}"? Essa ação não pode ser desfeita.`)) return;
    setLeads((list) => list.filter((l) => l.id !== lead.id));
    if (openLead?.id === lead.id) setOpenLead(null);
    try {
      await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
    } catch {
      load();
    }
  }

  return (
    <div>
      <AppNav current="banco" />
      <div style={{ padding: "24px 24px 48px" }}>
        <p className="eyebrow">BANCO DE LEADS</p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.01em", margin: "6px 0 4px" }}>Histórico por mês</h1>
        <p className="sub" style={{ margin: 0 }}>
          O Kanban ao vivo mostra só o mês corrente. Aqui fica tudo que já passou, sempre acessível — nada é apagado sozinho.
        </p>

        {error && <p className="b-help" style={{ color: "var(--danger-text)" }}>{error}</p>}

        {loading ? (
          <p style={{ marginTop: 16 }}>Carregando...</p>
        ) : !months.length ? (
          <p className="kanban-banco-empty">Ainda não há leads registrados.</p>
        ) : (
          <>
            <select
              className="kanban-banco-month"
              style={{ marginTop: 16 }}
              value={selectedMonth || ""}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)} {m === currentMonth ? "(mês corrente)" : ""} — {leads.filter((l) => monthKey(l.criadoEm) === m).length} lead(s)
                </option>
              ))}
            </select>

            {!monthLeads.length ? (
              <p className="kanban-banco-empty">Nenhum lead em {monthLabel(selectedMonth || "")}.</p>
            ) : (
              <div className="kanban-banco-list">
                {monthLeads.map((l) => (
                  <LeadCard
                    key={l.id}
                    lead={l}
                    onOpen={setOpenLead}
                    onDelete={handleDelete}
                    funnelLabel={funnelNames[l.funil]}
                    statusLabel={columnLabel(l.status)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {openLead && (
        <LeadDetailModal lead={openLead} onClose={() => setOpenLead(null)} onDelete={handleDelete} funnelLabel={funnelNames[openLead.funil]} />
      )}
    </div>
  );
}
