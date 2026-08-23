"use client";

import { useEffect, useState, useCallback } from "react";
import type { Lead, KanbanColumn } from "@/lib/lead-schema";
import AppNav from "@/components/AppNav";

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function waLink(lead: Lead) {
  let msg = `Olá ${lead.nome}! Vi sua dúvida sobre ${lead.area}`;
  if (lead.situacao) msg += ` (${lead.situacao})`;
  msg += ".";
  if (lead.perguntaTexto) msg += ` Você perguntou: "${lead.perguntaTexto}".`;
  msg += " Posso te ajudar?";
  const digits = lead.whatsapp.replace(/\D/g, "");
  const phone = digits.length <= 11 ? "55" + digits : digits;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

// Card enxuto de propósito: com muita informação (dores, UTMs, dúvida,
// áudio) o card virava uma bagunça sobreposta. Aqui só o essencial pra
// escanear a coluna — o resto mora no modal (onOpen).
function LeadCard({ lead, onDragStart, onOpen }: { lead: Lead; onDragStart: (e: React.DragEvent, id: string) => void; onOpen: (lead: Lead) => void }) {
  return (
    <div className="kanban-card" draggable onDragStart={(e) => onDragStart(e, lead.id)} onClick={() => onOpen(lead)}>
      <div className="kanban-card-top">
        <b>{lead.nome}</b>
        <span className="kanban-date">{fmtDate(lead.criadoEm)}</span>
      </div>
      <div className="kanban-whats">{lead.whatsapp}</div>
      <div className="kanban-meta-row">
        {lead.tipo === "qualificado" ? <span className="kanban-tag hot">🔥 Qualificado</span> : <span className="kanban-tag">💬 Dúvida</span>}
        <span className="kanban-area-clip">{lead.area}</span>
      </div>
      <a
        className="btn primary small kanban-wa-btn"
        href={waLink(lead)}
        target="_blank"
        rel="noopener"
        onClick={(e) => e.stopPropagation()}
      >
        Chamar no WhatsApp →
      </a>
    </div>
  );
}

function LeadDetailModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const utmEntries = Object.entries(lead.utm || {}).filter(([, v]) => v);
  return (
    <div className="kanban-modal-overlay" onClick={onClose}>
      <div className="kanban-modal" onClick={(e) => e.stopPropagation()}>
        <div className="kanban-modal-head">
          <h2 style={{ margin: 0, fontSize: "1.15rem" }}>{lead.nome}</h2>
          <button type="button" className="btn small" onClick={onClose}>Fechar ✕</button>
        </div>
        <p className="b-help" style={{ margin: "4px 0 14px" }}>
          {lead.tipo === "qualificado" ? "🔥 Lead qualificado" : "💬 Captura de dúvida"} · {fmtDate(lead.criadoEm)} · funil <code>{lead.funil}</code>
        </p>
        <div className="kanban-detail-grid">
          <div><label>WhatsApp</label><p>{lead.whatsapp}</p></div>
          <div><label>Área</label><p>{lead.area}</p></div>
          <div><label>Situação</label><p>{lead.situacao || "—"}</p></div>
          <div><label>Urgência</label><p>{lead.urgencia || "—"}</p></div>
          <div><label>Compromisso</label><p>{lead.compromisso || "—"}</p></div>
        </div>
        {lead.dores?.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <label>Principais pontos</label>
            <div className="kanban-tags">{lead.dores.map((d, i) => <span key={i} className="kanban-tag">{d}</span>)}</div>
          </div>
        )}
        {lead.perguntaTexto && (
          <div style={{ marginTop: 10 }}>
            <label>Dúvida enviada</label>
            <p className="kanban-question">"{lead.perguntaTexto}"</p>
          </div>
        )}
        {lead.perguntaAudioBase64 && (
          <div style={{ marginTop: 10 }}>
            <label>Áudio enviado</label>
            <audio controls style={{ width: "100%", marginTop: 6 }} src={`data:${lead.perguntaAudioMime || "audio/webm"};base64,${lead.perguntaAudioBase64}`} />
          </div>
        )}
        {utmEntries.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <label>Origem (UTM)</label>
            <div className="kanban-tags">{utmEntries.map(([k, v]) => <span key={k} className="kanban-tag utm">{k.replace("utm_", "")}: {v}</span>)}</div>
          </div>
        )}
        <a className="btn primary kanban-wa-btn" style={{ marginTop: 16, display: "inline-block" }} href={waLink(lead)} target="_blank" rel="noopener">Chamar no WhatsApp →</a>
      </div>
    </div>
  );
}

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

export default function KanbanPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  const [editingColumns, setEditingColumns] = useState(false);

  const load = useCallback(async () => {
    try {
      const [leadsRes, colsRes] = await Promise.all([fetch("/api/leads"), fetch("/api/kanban/columns")]);
      const leadsData = await leadsRes.json();
      const colsData = await colsRes.json();
      setLeads(leadsData.leads || []);
      setColumns(colsData.columns || []);
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

  async function moveLead(id: string, status: string) {
    setLeads((list) => list.map((l) => (l.id === id ? { ...l, status } : l)));
    try {
      await fetch(`/api/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
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
      <style>{`
        .kanban-board{ display:grid; grid-template-columns: repeat(${Math.max(columns.length, 1)}, minmax(260px, 1fr)); gap:16px; margin-top:16px; overflow-x:auto; }
        .kanban-col{ background:var(--bg-card); border:1px solid var(--option-border); border-radius:16px; padding:14px; min-height:200px; }
        .kanban-col-header{ display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; font-weight:600; font-size:0.9rem; letter-spacing:-0.01em; }
        .kanban-col-header .capi-badge{ font-size:0.65rem; font-weight:600; color:var(--mono-text); background:var(--mono-bg); border-radius:6px; padding:2px 6px; margin-left:6px; }
        .kanban-count{ background:var(--mono-bg); color:var(--mono-text); border-radius:999px; padding:2px 8px; font-size:0.75rem; }
        .kanban-card{ background:var(--bg-card-hover); border-radius:14px; padding:14px; margin-bottom:10px; border:1px solid var(--option-border); cursor:pointer; transition:border-color .12s; }
        .kanban-card:hover{ border-color:var(--purple-mid); }
        .kanban-card-top{ display:flex; justify-content:space-between; gap:8px; font-size:0.9rem; align-items:flex-start; }
        .kanban-date{ color:var(--ink-soft); font-size:0.72rem; white-space:nowrap; }
        .kanban-whats{ font-size:0.82rem; color:var(--ink-soft); margin-top:2px; }
        .kanban-meta-row{ display:flex; align-items:center; gap:6px; margin-top:6px; min-width:0; }
        .kanban-area-clip{ font-size:0.8rem; color:var(--ink-soft); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .kanban-tags{ display:flex; flex-wrap:wrap; gap:4px; margin-top:6px; }
        .kanban-tag{ font-size:0.68rem; background:var(--mono-bg); color:var(--mono-text); border-radius:6px; padding:2px 6px; flex-shrink:0; }
        .kanban-tag.utm{ background:var(--danger-bg); color:var(--danger-text); }
        .kanban-tag.hot{ background:var(--danger-bg); color:var(--danger-text); font-weight:600; }
        .kanban-question{ font-size:0.85rem; font-style:italic; margin:8px 0 0; color:var(--ink); }
        .kanban-wa-btn{ display:block; width:100%; margin-top:10px; cursor:pointer; }
        .kanban-modal-overlay{ position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:flex-start; justify-content:center; padding:5vh 20px; z-index:100; overflow-y:auto; }
        .kanban-modal{ background:var(--bg); border:1px solid var(--option-border); border-radius:16px; padding:24px; max-width:480px; width:100%; box-shadow:var(--shadow); }
        .kanban-modal-head{ display:flex; justify-content:space-between; align-items:center; gap:12px; }
        .kanban-detail-grid{ display:grid; grid-template-columns:1fr 1fr; gap:10px 16px; }
        .kanban-detail-grid label{ font-size:0.72rem; font-weight:600; color:var(--ink-soft); text-transform:uppercase; letter-spacing:0.04em; }
        .kanban-detail-grid p{ margin:2px 0 0; font-size:0.9rem; }
        .kanban-col-edit-row{ display:flex; gap:6px; align-items:center; margin-bottom:8px; }
        .kanban-col-edit-order{ display:flex; flex-direction:column; gap:2px; }
        .kanban-col-edit-order .btn{ padding:2px 6px; }
        .kanban-col-edit-label{ flex:1; border-radius:8px; border:1px solid var(--option-border); background:var(--bg-card-hover); color:var(--ink); padding:7px 9px; font-size:0.85rem; }
        .kanban-col-edit-capi{ flex:1; border-radius:8px; border:1px solid var(--option-border); background:var(--bg-card-hover); color:var(--ink); padding:7px 9px; font-size:0.8rem; }
        .kanban-col-edit-remove{ border:none; background:none; cursor:pointer; font-size:0.9rem; padding:4px; }
      `}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p className="eyebrow">KANBAN DE LEADS</p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.01em", margin: "6px 0 4px" }}>Quem vale a pena responder</h1>
          <p className="sub" style={{ margin: 0 }}>Arraste o card entre as colunas. Atualiza sozinho a cada 20s.</p>
        </div>
        <button type="button" className="btn" onClick={() => setEditingColumns(true)}>⚙ Colunas</button>
      </div>
      {error && <p className="b-help" style={{ color: "var(--danger-text)" }}>{error}</p>}
      {loading ? (
        <p style={{ marginTop: 16 }}>Carregando...</p>
      ) : (
        <div className="kanban-board">
          {columns.map((col) => (
            <div key={col.id} className="kanban-col" onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, col.id)}>
              <div className="kanban-col-header">
                <span>{col.label}{col.capiEvent && <span className="capi-badge" title={`Dispara "${col.capiEvent}" pro Meta`}>📡 {col.capiEvent}</span>}</span>
                <span className="kanban-count">{leads.filter((l) => l.status === col.id).length}</span>
              </div>
              {leads.filter((l) => l.status === col.id).map((l) => (
                <LeadCard key={l.id} lead={l} onDragStart={onDragStart} onOpen={setOpenLead} />
              ))}
            </div>
          ))}
        </div>
      )}
      </div>
      {openLead && <LeadDetailModal lead={openLead} onClose={() => setOpenLead(null)} />}
      {editingColumns && (
        <ColumnsEditor columns={columns} onClose={() => setEditingColumns(false)} onSaved={setColumns} />
      )}
    </div>
  );
}
