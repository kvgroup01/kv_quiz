"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import type { Lead, KanbanColumn } from "@/lib/lead-schema";
import AppNav from "@/components/AppNav";
import { LeadCard, LeadDetailModal } from "@/components/leads-ui";

function ColumnsEditor({ columns, onClose, onSaved }: { columns: KanbanColumn[]; onClose: () => void; onSaved: (cols: KanbanColumn[]) => void }) {
  const [rows, setRows] = useState<KanbanColumn[]>(columns.map((c) => ({ ...c })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(i: number, patch: Partial<KanbanColumn>) {
    setRows((r) => r.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function move(i: number, dir: -1 | 1) {
    setRows((r) => {
      const j = i + dir;
      if (j < 0 || j >= r.length) return r;
      const copy = [...r];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }
  function remove(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }
  function add() {
    setRows((r) => [...r, { id: `coluna_${Date.now()}`, label: "Nova coluna" }]);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/kanban/columns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columns: rows })
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error || "Falha ao salvar."); return; }
      onSaved(data.columns);
      onClose();
    } catch {
      setError("Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="kanban-modal-overlay" onClick={onClose}>
      <div className="kanban-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="kanban-modal-head">
          <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Colunas do Kanban</h2>
          <button type="button" className="btn small" onClick={onClose}>Fechar ✕</button>
        </div>
        <p className="b-help">Arraste com as setas pra reordenar. O disparo pro Meta acontece quando um card é movido pra essa coluna.</p>
        {rows.map((c, i) => (
          <div key={c.id} className="kanban-col-edit-row">
            <div className="kanban-col-edit-order">
              <button type="button" className="btn small" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
              <button type="button" className="btn small" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>↓</button>
            </div>
            <input className="kanban-col-edit-label" value={c.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Nome da coluna" />
            <input
              className="kanban-col-edit-capi"
              value={c.capiEvent || ""}
              onChange={(e) => update(i, { capiEvent: e.target.value })}
              placeholder="Evento Meta (opcional, ex: Purchase)"
            />
            <button type="button" className="kanban-col-edit-remove" title="Remover coluna" onClick={() => remove(i)} disabled={rows.length <= 1}>🗑</button>
          </div>
        ))}
        <button type="button" className="btn" style={{ marginTop: 6 }} onClick={add}>+ Nova coluna</button>
        {error && <p className="b-help" style={{ color: "var(--danger-text)" }}>{error}</p>}
        <button type="button" className="btn primary" style={{ marginTop: 16 }} disabled={saving} onClick={save}>
          {saving ? "Salvando..." : "Salvar colunas"}
        </button>
      </div>
    </div>
  );
}

function isCurrentMonth(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export default function KanbanPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [funnelNames, setFunnelNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  const [editingColumns, setEditingColumns] = useState(false);

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

  useEffect(() => {
    load();
    const iv = setInterval(load, 20000);
    return () => clearInterval(iv);
  }, [load]);

  // Só o mês corrente aparece aqui — sozinho, sem precisar fechar/arquivar
  // nada. Tudo que já passou continua guardado (nada é apagado) e fica
  // acessível pelo Banco de Leads.
  const currentMonthLeads = useMemo(() => leads.filter((l) => isCurrentMonth(l.criadoEm)), [leads]);

  async function moveLead(id: string, status: string) {
    setLeads((list) => list.map((l) => (l.id === id ? { ...l, status } : l)));
    try {
      await fetch(`/api/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    } catch {
      load(); // desfaz otimismo se falhar
    }
  }

  async function handleDelete(lead: Lead) {
    if (!confirm(`Excluir o lead de "${lead.nome}"? Essa ação não pode ser desfeita.`)) return;
    setLeads((list) => list.filter((l) => l.id !== lead.id));
    if (openLead?.id === lead.id) setOpenLead(null);
    try {
      await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
    } catch {
      load(); // desfaz otimismo se falhar
    }
  }

  function onDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData("text/plain", id);
  }
  function onDrop(e: React.DragEvent, status: string) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) moveLead(id, status);
  }

  return (
    <div>
      <AppNav current="kanban" />
      <div style={{ padding: "24px 24px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p className="eyebrow">KANBAN DE LEADS</p>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.01em", margin: "6px 0 4px" }}>Quem vale a pena responder</h1>
            <p className="sub" style={{ margin: 0 }}>
              Arraste o card entre as colunas. Atualiza sozinho a cada 20s. Mostrando só o mês corrente —{" "}
              <Link href="/kanban/banco">meses anteriores ficam no Banco de Leads</Link>.
            </p>
          </div>
          <button type="button" className="btn" onClick={() => setEditingColumns(true)}>⚙ Colunas</button>
        </div>
        {error && <p className="b-help" style={{ color: "var(--danger-text)" }}>{error}</p>}
        {loading ? (
          <p style={{ marginTop: 16 }}>Carregando...</p>
        ) : (
          <div className="kanban-board" style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(260px, 1fr))` }}>
            {columns.map((col) => (
              <div key={col.id} className="kanban-col" onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, col.id)}>
                <div className="kanban-col-header">
                  <span>{col.label}{col.capiEvent && <span className="capi-badge" title={`Dispara "${col.capiEvent}" pro Meta`}>📡 {col.capiEvent}</span>}</span>
                  <span className="kanban-count">{currentMonthLeads.filter((l) => l.status === col.id).length}</span>
                </div>
                {currentMonthLeads.filter((l) => l.status === col.id).map((l) => (
                  <LeadCard
                    key={l.id}
                    lead={l}
                    onDragStart={onDragStart}
                    onOpen={setOpenLead}
                    onDelete={handleDelete}
                    funnelLabel={funnelNames[l.funil]}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      {openLead && (
        <LeadDetailModal lead={openLead} onClose={() => setOpenLead(null)} onDelete={handleDelete} funnelLabel={funnelNames[openLead.funil]} />
      )}
      {editingColumns && (
        <ColumnsEditor columns={columns} onClose={() => setEditingColumns(false)} onSaved={setColumns} />
      )}
    </div>
  );
}
