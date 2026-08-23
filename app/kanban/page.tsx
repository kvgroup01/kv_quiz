"use client";

import { useEffect, useState, useCallback } from "react";
import type { Lead, LeadStatus } from "@/lib/lead-schema";
import AppNav from "@/components/AppNav";

const COLUMNS: { status: LeadStatus; label: string }[] = [
  { status: "novo", label: "Novo" },
  { status: "respondido", label: "Respondido" },
  { status: "desqualificado", label: "Desqualificado" }
];

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

function LeadCard({ lead, onDragStart }: { lead: Lead; onDragStart: (e: React.DragEvent, id: string) => void }) {
  const utmEntries = Object.entries(lead.utm || {}).filter(([, v]) => v);
  return (
    <div className="kanban-card" draggable onDragStart={(e) => onDragStart(e, lead.id)}>
      <div className="kanban-card-top">
        <b>{lead.nome}</b>
        <span className="kanban-date">{fmtDate(lead.criadoEm)}</span>
      </div>
      <div className="kanban-whats">{lead.whatsapp}</div>
      <div className="kanban-meta">{lead.area} · {lead.situacao}</div>
      {lead.urgencia && <div className="kanban-meta">Tempo: {lead.urgencia}</div>}
      {lead.dores?.length > 0 && (
        <div className="kanban-tags">{lead.dores.map((d, i) => <span key={i} className="kanban-tag">{d}</span>)}</div>
      )}
      {utmEntries.length > 0 && (
        <div className="kanban-tags">
          {utmEntries.map(([k, v]) => <span key={k} className="kanban-tag utm">{k.replace("utm_", "")}: {v}</span>)}
        </div>
      )}
      {lead.perguntaTexto && <p className="kanban-question">"{lead.perguntaTexto}"</p>}
      {lead.perguntaAudioBase64 && (
        <audio controls style={{ width: "100%", marginTop: 6 }} src={`data:${lead.perguntaAudioMime || "audio/webm"};base64,${lead.perguntaAudioBase64}`} />
      )}
      <a className="btn primary small kanban-wa-btn" href={waLink(lead)} target="_blank" rel="noopener">Chamar no WhatsApp →</a>
    </div>
  );
}

export default function KanbanPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      setLeads(data.leads || []);
      setError(data.ok === false ? data.error : null);
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

  async function moveLead(id: string, status: LeadStatus) {
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
  function onDrop(e: React.DragEvent, status: LeadStatus) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) moveLead(id, status);
  }

  return (
    <div>
      <AppNav current="kanban" />
      <div style={{ padding: "24px 24px 48px" }}>
      <style>{`
        .kanban-board{ display:grid; grid-template-columns: repeat(3, minmax(260px, 1fr)); gap:16px; margin-top:16px; }
        .kanban-col{ background:var(--bg-card); border:1px solid var(--option-border); border-radius:16px; padding:14px; min-height:200px; }
        .kanban-col-header{ display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; font-weight:600; font-size:0.9rem; letter-spacing:-0.01em; }
        .kanban-count{ background:var(--mono-bg); color:var(--mono-text); border-radius:999px; padding:2px 8px; font-size:0.75rem; }
        .kanban-card{ background:var(--bg-card-hover); border-radius:14px; padding:14px; margin-bottom:10px; border:1px solid var(--option-border); cursor:grab; }
        .kanban-card-top{ display:flex; justify-content:space-between; gap:8px; font-size:0.9rem; }
        .kanban-date{ color:var(--ink-soft); font-size:0.72rem; white-space:nowrap; }
        .kanban-whats{ font-size:0.82rem; color:var(--ink-soft); margin-top:2px; }
        .kanban-meta{ font-size:0.8rem; color:var(--ink-soft); margin-top:4px; }
        .kanban-tags{ display:flex; flex-wrap:wrap; gap:4px; margin-top:6px; }
        .kanban-tag{ font-size:0.68rem; background:var(--mono-bg); color:var(--mono-text); border-radius:6px; padding:2px 6px; }
        .kanban-tag.utm{ background:var(--danger-bg); color:var(--danger-text); }
        .kanban-question{ font-size:0.85rem; font-style:italic; margin:8px 0 0; color:var(--ink); }
        .kanban-wa-btn{ margin-top:10px; }
      `}</style>
      <p className="eyebrow">KANBAN DE DÚVIDAS</p>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.01em", margin: "6px 0 4px" }}>Quem vale a pena responder</h1>
      <p className="sub" style={{ margin: 0 }}>Arraste o card entre as colunas. Atualiza sozinho a cada 20s.</p>
      {error && <p className="b-help" style={{ color: "var(--danger-text)" }}>{error}</p>}
      {loading ? (
        <p style={{ marginTop: 16 }}>Carregando...</p>
      ) : (
        <div className="kanban-board">
          {COLUMNS.map((col) => (
            <div key={col.status} className="kanban-col" onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, col.status)}>
              <div className="kanban-col-header">
                <span>{col.label}</span>
                <span className="kanban-count">{leads.filter((l) => l.status === col.status).length}</span>
              </div>
              {leads.filter((l) => l.status === col.status).map((l) => (
                <LeadCard key={l.id} lead={l} onDragStart={onDragStart} />
              ))}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
