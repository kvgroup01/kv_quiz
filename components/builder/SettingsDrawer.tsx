"use client";

import type { FunnelData } from "@/lib/funnel-schema";
import { Button } from "@/components/ui/Button";

export function SettingsDrawer({
  active,
  onPatch,
  onSlugChange,
  onClose,
}: {
  active: FunnelData;
  onPatch: (patch: Partial<FunnelData>) => void;
  onSlugChange: (slug: string) => void;
  onClose: () => void;
}) {
  const cfg = (patch: Partial<FunnelData["config"]>) => onPatch({ config: { ...active.config, ...patch } });

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-head"><strong>Configurações do funil</strong><Button size="sm" onClick={onClose}>Fechar</Button></div>
        <h3 className="drawer-section">Identificação</h3>
        <label className="in-field"><span>Nome interno</span><input value={active.nome} onChange={(event) => onPatch({ nome: event.target.value })} /></label>
        <label className="in-field"><span>Slug (URL: /quiz/SLUG)</span><input value={active.slug} onChange={(event) => onSlugChange(event.target.value)} /></label>
        <h3 className="drawer-section">Escritório e integrações</h3>
        <label className="in-field"><span>Nome do escritório</span><input value={active.config.firmName} onChange={(event) => cfg({ firmName: event.target.value })} /></label>
        <label className="in-field"><span>Profissional responsável</span><input value={active.config.lawyerName} onChange={(event) => cfg({ lawyerName: event.target.value })} /></label>
        <label className="in-field"><span>Registro (ex.: OAB/UF)</span><input value={active.config.oab} onChange={(event) => cfg({ oab: event.target.value })} /></label>
        <label className="in-field"><span>WhatsApp (DDI+DDD+número)</span><input value={active.config.whatsappNumber} onChange={(event) => cfg({ whatsappNumber: event.target.value })} /></label>
        <label className="in-field"><span>Pixel ID do Meta Ads</span><input value={active.config.metaPixelId} onChange={(event) => cfg({ metaPixelId: event.target.value })} /></label>
        <p className="b-help">O token da Conversions API fica nas variáveis de ambiente da Vercel, não aqui.</p>
        <h3 className="drawer-section">Aparência do quiz</h3>
        <div className="ui-pills">
          <button type="button" className={"ui-pill" + (active.config.theme !== "dark" ? " active" : "")} onClick={() => cfg({ theme: "light" })}>☀️ Claro</button>
          <button type="button" className={"ui-pill" + (active.config.theme === "dark" ? " active" : "")} onClick={() => cfg({ theme: "dark" })}>🌙 Escuro</button>
        </div>
        <p className="b-help">Tema fixo para quem responde — não segue o sistema do lead.</p>
      </aside>
    </div>
  );
}
