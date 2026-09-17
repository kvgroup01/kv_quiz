"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { Lead, KanbanColumn } from "@/lib/lead-schema";
import AppNav from "@/components/AppNav";
import { Card } from "@/components/ui/Card";
import { PillTabs } from "@/components/ui/PillTabs";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { LeadDetailModal, fmtDate } from "@/components/leads-ui";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function monthKey(iso: string) {
  const d = new Date(iso);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return MONTH_NAMES[m - 1] + " de " + y;
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
    const pastMonth = months.find((m) => m !== currentMonth);
    setSelectedMonth(pastMonth || months[0]);
  }, [months, currentMonth, selectedMonth]);

  const columnLabel = useCallback((statusId: string) => columns.find((c) => c.id === statusId)?.label || statusId, [columns]);

  const monthLeads = useMemo(
    () => (selectedMonth ? leads.filter((l) => monthKey(l.criadoEm) === selectedMonth) : []),
    [leads, selectedMonth]
  );

  async function handleDelete(lead: Lead) {
    if (!confirm("Excluir o lead de \"" + lead.nome + "\"? Essa ação não pode ser desfeita.")) return;
    setLeads((list) => list.filter((l) => l.id !== lead.id));
    if (openLead?.id === lead.id) setOpenLead(null);
    try {
      await fetch("/api/leads/" + lead.id, { method: "DELETE" });
    } catch {
      load();
    }
  }

  return (
    <div className="in-app">
      <AppNav current="historico" />
      <main className="in-container">
        <PageHeader title="Histórico" subtitle="Leads de meses anteriores. Nada é apagado — o Kanban só mostra o mês corrente." />
        {error && <p className="in-notice">{error}</p>}
        {loading ? <p className="dash-empty">Carregando…</p> : !months.length ? <p className="dash-empty">Ainda não há leads registrados.</p> : (
          <>
            <div className="hist-months">
              <PillTabs
                ariaLabel="Mês"
                items={months.map((m) => ({ id: m, label: monthLabel(m) + (m === currentMonth ? " (atual)" : "") }))}
                active={selectedMonth || ""}
                onChange={setSelectedMonth}
              />
            </div>
            <Card className="hist-table">
              <DataTable
                rows={monthLeads}
                onRowClick={setOpenLead}
                emptyText={"Nenhum lead em " + monthLabel(selectedMonth || "") + "."}
                columns={[
                  { key: "nome", label: "Nome", render: (l) => <strong>{l.nome}</strong> },
                  { key: "funil", label: "Funil", render: (l) => <Badge>{funnelNames[l.funil] ?? l.funil}</Badge> },
                  { key: "tipo", label: "Tipo", render: (l) => l.tipo === "qualificado" ? <Badge tone="green">Qualificado</Badge> : <Badge tone="orange">Dúvida</Badge> },
                  { key: "status", label: "Coluna", render: (l) => columnLabel(l.status) },
                  { key: "criadoEm", label: "Data", render: (l) => fmtDate(l.criadoEm) }
                ]}
              />
            </Card>
          </>
        )}
      </main>
      {openLead && <LeadDetailModal lead={openLead} onClose={() => setOpenLead(null)} onDelete={handleDelete} funnelLabel={funnelNames[openLead.funil]} />}
    </div>
  );
}
