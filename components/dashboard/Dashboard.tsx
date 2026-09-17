"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lead, KanbanColumn } from "@/lib/lead-schema";
import AppNav from "@/components/AppNav";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PillTabs } from "@/components/ui/PillTabs";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { LeadDetailModal, waLink, fmtDate } from "@/components/leads-ui";
import { greeting, inPeriod, pendingDoubts, countByTipo, countByFunnel, timeAgo, type Period } from "@/lib/dashboard-metrics";

const PERIODS = [{ id: "month", label: "Este mês" }, { id: "7d", label: "7 dias" }, { id: "today", label: "Hoje" }];

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [funnelNames, setFunnelNames] = useState<Record<string, string>>({});
  const [kvError, setKvError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [period, setPeriod] = useState<Period>("month");
  const [open, setOpen] = useState<Lead | null>(null);
  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    (async () => {
      try {
        const [l, c, f] = await Promise.all([fetch("/api/leads"), fetch("/api/kanban/columns"), fetch("/api/funnels")]);
        const ld = await l.json(); const cd = await c.json(); const fd = await f.json();
        setLeads(ld.leads || []); setColumns(cd.columns || []);
        if (l.status === 401) setNeedsLogin(true);
        else if (ld.ok === false) setKvError(ld.error);
        const map: Record<string, string> = {};
        (fd.funnels || []).forEach((x: { slug: string; nome: string }) => { map[x.slug] = x.nome; });
        setFunnelNames(map);
      } catch { setKvError("Falha ao carregar."); }
    })();
  }, []);

  const entryColumn = columns[0]?.id ?? "novo";
  const colLabel = (id: string) => columns.find((c) => c.id === id)?.label ?? id;
  const funnelLabel = (slug: string) => funnelNames[slug] ?? slug;

  const pending = useMemo(() => pendingDoubts(leads, entryColumn), [leads, entryColumn]);
  const inRange = useMemo(() => leads.filter((l) => inPeriod(l.criadoEm, period, now)), [leads, period, now]);
  const tipos = countByTipo(inRange);
  const porFunil = countByFunnel(inRange);
  const maxFunil = porFunil[0]?.count ?? 1;
  const recentes = useMemo(() => [...leads].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)).slice(0, 10), [leads]);

  async function handleDelete(lead: Lead) {
    if (!confirm("Excluir o lead de \"" + lead.nome + "\"?")) return;
    setLeads((l) => l.filter((x) => x.id !== lead.id)); setOpen(null);
    try { await fetch("/api/leads/" + lead.id, { method: "DELETE" }); } catch { /* some no próximo load se falhar */ }
  }

  return (
    <div className="in-app">
      <AppNav current="inicio" />
      <main className="in-container">
        <PageHeader
          title={greeting(now.getHours()) + ", André"}
          subtitle="Aqui está o que precisa da sua atenção hoje."
          actions={<PillTabs items={PERIODS} active={period} onChange={(id) => setPeriod(id as Period)} ariaLabel="Período" />}
        />
        {needsLogin && (
          <p className="in-notice in-notice-row">Entre pra ver seus leads e dúvidas. <Button size="sm" variant="primary" href="/login?redirect=/">Entrar</Button></p>
        )}
        {kvError && <p className="in-notice">{kvError}</p>}

        <div className="dash-row-1">
          <Card title="Dúvidas aguardando resposta" subtitle="Quem escreveu e ainda não foi respondido" action={<Button href="/kanban" size="sm">ver todas →</Button>}>
            <Stat value={pending.length} label="pendentes" />
            {pending.length === 0 ? (
              <p className="dash-empty">Nenhuma dúvida esperando — tudo respondido ✓</p>
            ) : (
              <ul className="dash-pending">
                {pending.slice(0, 5).map((l) => (
                  <li key={l.id} onClick={() => setOpen(l)}>
                    <div className="dash-pending-main">
                      <strong>{l.nome}</strong>
                      <span className="dash-pending-meta"><Badge>{funnelLabel(l.funil)}</Badge> · {timeAgo(l.criadoEm, now)}</span>
                    </div>
                    <Button variant="primary" size="sm" href={waLink(l)} target="_blank" onClick={(e) => e.stopPropagation()}>Responder no WhatsApp</Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Números do período">
            <div className="dash-stats">
              <Stat value={tipos.qualificado} label="Qualificados" />
              <Stat value={tipos.duvida} label="Dúvidas" />
            </div>
            {porFunil.length === 0 ? <p className="dash-empty">Sem leads no período</p> : (
              <ul className="dash-bars">
                {porFunil.map((f) => (
                  <li key={f.funil}>
                    <span className="dash-bar-label">{funnelLabel(f.funil)}</span>
                    <span className="dash-bar-track"><span className="dash-bar-fill" style={{ width: (f.count / maxFunil) * 100 + "%" }} /></span>
                    <span className="dash-bar-value">{f.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card title="Últimos leads" subtitle="De todos os funis, mais recente primeiro" action={<Button href="/kanban" size="sm">ver todos →</Button>} className="dash-row-2">
          <DataTable
            rows={recentes}
            onRowClick={setOpen}
            emptyText="Nenhum lead ainda."
            columns={[
              { key: "nome", label: "Nome", render: (l) => <strong>{l.nome}</strong> },
              { key: "funil", label: "Funil", render: (l) => <Badge>{funnelLabel(l.funil)}</Badge> },
              { key: "tipo", label: "Tipo", render: (l) => l.tipo === "qualificado" ? <Badge tone="green">Qualificado</Badge> : <Badge tone="orange">Dúvida</Badge> },
              { key: "status", label: "Coluna", render: (l) => colLabel(l.status) },
              { key: "criadoEm", label: "Quando", render: (l) => fmtDate(l.criadoEm) }
            ]}
          />
        </Card>
      </main>
      {open && <LeadDetailModal lead={open} onClose={() => setOpen(null)} onDelete={handleDelete} funnelLabel={funnelLabel(open.funil)} />}
    </div>
  );
}
