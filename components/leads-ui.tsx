"use client";

// Card/modal de lead compartilhados entre o Kanban ao vivo (app/kanban/page.tsx)
// e o Banco de Leads (app/kanban/banco/page.tsx) — mesma aparência, mesma
// lógica de excluir/abrir link de WhatsApp, pra não duplicar entre as duas telas.

import type { Lead } from "@/lib/lead-schema";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function waLink(lead: Lead) {
  let msg = "Olá " + lead.nome + "! Vi sua dúvida sobre " + lead.area;
  if (lead.situacao) msg += " (" + lead.situacao + ")";
  msg += ".";
  if (lead.perguntaTexto) msg += " Você perguntou: \"" + lead.perguntaTexto + "\".";
  msg += " Posso te ajudar?";
  const digits = lead.whatsapp.replace(/\D/g, "");
  const phone = digits.length <= 11 ? "55" + digits : digits;
  return "https://wa.me/" + phone + "?text=" + encodeURIComponent(msg);
}

export function LeadCard({
  lead, onOpen, onDelete, onDragStart, funnelLabel, statusLabel
}: {
  lead: Lead;
  onOpen: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  funnelLabel?: string;
  statusLabel?: string;
}) {
  return (
    <div className="lead-card" draggable={!!onDragStart} onDragStart={onDragStart ? (e) => onDragStart(e, lead.id) : undefined} onClick={() => onOpen(lead)}>
      <div className="lead-card-top">
        <strong className="lead-card-name">{lead.nome}</strong>
        <span className="lead-card-actions">
          <a className="ui-btn ui-btn-ghost ui-btn-sm ui-btn-icon" href={waLink(lead)} target="_blank" rel="noopener" title="Chamar no WhatsApp" onClick={(e) => e.stopPropagation()}>💬</a>
          <button type="button" className="lead-card-delete" title="Excluir" onClick={(e) => { e.stopPropagation(); onDelete(lead); }}>✕</button>
        </span>
      </div>
      <div className="lead-card-badges">
        {funnelLabel && <Badge>{funnelLabel}</Badge>}
        {lead.tipo === "qualificado" ? <Badge tone="green">Qualificado</Badge> : <Badge tone="orange">Dúvida</Badge>}
        {statusLabel && <Badge>{statusLabel}</Badge>}
      </div>
      <span className="lead-card-time">{fmtDate(lead.criadoEm)}</span>
    </div>
  );
}

export function LeadDetailModal({
  lead, onClose, onDelete, funnelLabel
}: { lead: Lead; onClose: () => void; onDelete: (lead: Lead) => void; funnelLabel?: string }) {
  const utmEntries = Object.entries(lead.utm || {}).filter(([, v]) => v);
  return (
    <div className="kanban-modal-overlay" onClick={onClose}>
      <div className="kanban-modal" onClick={(e) => e.stopPropagation()}>
        <div className="kanban-modal-head">
          <h2 style={{ margin: 0, fontSize: "1.15rem" }}>{lead.nome}</h2>
          <span style={{ display: "flex", gap: 6 }}>
            <Button size="sm" onClick={() => onDelete(lead)}>🗑 Excluir</Button>
            <Button size="sm" variant="secondary" onClick={onClose}>Fechar ✕</Button>
          </span>
        </div>
        <p className="b-help" style={{ margin: "4px 0 14px" }}>
          {lead.tipo === "qualificado" ? "🔥 Lead qualificado" : "💬 Captura de dúvida"} · {fmtDate(lead.criadoEm)} · funil <code>{funnelLabel || lead.funil}</code>
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
            <audio controls style={{ width: "100%", marginTop: 6 }} src={"data:" + (lead.perguntaAudioMime || "audio/webm") + ";base64," + lead.perguntaAudioBase64} />
          </div>
        )}
        {utmEntries.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <label>Origem (UTM)</label>
            <div className="kanban-tags">{utmEntries.map(([k, v]) => <span key={k} className="kanban-tag utm">{k.replace("utm_", "")}: {v}</span>)}</div>
          </div>
        )}
        <Button variant="primary" href={waLink(lead)} target="_blank">Chamar no WhatsApp →</Button>
      </div>
    </div>
  );
}
