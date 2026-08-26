"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AppNav from "@/components/AppNav";
import { EditableText, EditableHeadline } from "@/components/EditableInline";
import GraphEditor from "@/app/builder/graph/GraphEditor";
import { blankArea, DEFAULT_QUESTIONS, DEFAULT_AREA_TEXT, type AreaContent, type FunnelData, type Option } from "@/lib/funnel-schema";
import { toGraph } from "@/lib/funnel-graph-adapter";

const LS_KEY = "radar_juridico_funnels_v1";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "funil";
}

function blankFunnel(): FunnelData {
  return {
    slug: "novo-funil",
    nome: "Novo funil",
    config: { firmName: "[Nome do Escritório]", lawyerName: "[Nome do Advogado(a)]", oab: "OAB/UF 000.000", whatsappNumber: "55SEUNUMERO", metaPixelId: "", theme: "light" },
    eventos: { leadQualificado: "Lead", duvidaCapturada: "Contact" },
    hero: {
      greeting: "Oi! Vamos entender seu caso 👋",
      headline: "Descubra em **2 minutos** *se você tem direito* a algo, antes de falar com um advogado.",
      subheadline: "Responda algumas perguntas rápidas. No final, você já sabe o que esperar.",
      trustNote: "**Sem custo** pra fazer essa pré-triagem."
    },
    areaOrder: ["area1"],
    areas: { area1: blankArea() },
    urgencia: [{ v: "recente", t: "Menos de 6 meses" }, { v: "medio", t: "Entre 6 meses e 2 anos" }, { v: "antigo", t: "Mais de 2 anos" }, { v: "incerto", t: "Não sei ao certo" }],
    aspiracao: [{ v: "a1", t: "Recuperar o que é meu por direito" }, { v: "a2", t: "Ter paz e parar de pensar nisso" }, { v: "a3", t: "Corrigir uma injustiça" }, { v: "a4", t: "Só quero entender minha situação" }],
    honorarios: [{ v: "h1", t: "Não sei, quero entender" }, { v: "h2", t: "Já ouvi falar que só se paga se ganhar" }, { v: "h3", t: "Tenho receio de gastar sem necessidade" }, { v: "h4", t: "Não me importo, só quero resolver" }],
    compromisso: [{ v: "alto", t: "Sim, quero resolver o quanto antes" }, { v: "medio", t: "Sim, mas quero entender melhor antes" }, { v: "baixo", t: "Ainda não tenho certeza" }, { v: "duvida", t: "Só quero tirar uma dúvida por enquanto" }]
  };
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function OptionCanvasList({
  opts, onChange
}: { opts: Option[]; onChange: (opts: Option[]) => void }) {
  const dragIndex = useRef<number | null>(null);
  return (
    <div className="opt-list">
      {opts.map((o, i) => (
        <div key={o.v} className="opt b-opt-editable" draggable
          onDragStart={() => { dragIndex.current = i; }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragIndex.current === null || dragIndex.current === i) return;
            const copy = [...opts];
            const [moved] = copy.splice(dragIndex.current, 1);
            copy.splice(i, 0, moved);
            onChange(copy);
            dragIndex.current = null;
          }}>
          <span className="b-drag-handle">⋮⋮</span>
          <EditableText as="span" className="chip" value={o.icon || "🔹"} placeholder="🔹"
            onChange={(icon) => { const copy = [...opts]; copy[i] = { ...o, icon }; onChange(copy); }} />
          <EditableText as="span" className="label" value={o.t} placeholder="Escreva a opção"
            onChange={(t) => { const copy = [...opts]; copy[i] = { ...o, t }; onChange(copy); }} />
          <button type="button" className="b-opt-remove" onClick={() => onChange(opts.filter((_, idx) => idx !== i))}>✕</button>
        </div>
      ))}
      <button type="button" className="b-add-opt" onClick={() => onChange([...opts, { v: `opt_${Date.now()}`, t: "", icon: "🔹" }])}>+ Adicionar opção</button>
    </div>
  );
}

const RAIL = [
  { id: "inicio", label: "Início", icon: "👋" },
  { id: "areas", label: "Áreas", icon: "🗂" },
  { id: "situacao", label: "Situação", icon: "❓", perArea: true },
  { id: "urgencia", label: "Urgência", icon: "⏳" },
  { id: "aspiracao", label: "Aspiração", icon: "🎯" },
  { id: "honorarios", label: "Honorários", icon: "💬" },
  { id: "dores", label: "Dores", icon: "⚠️", perArea: true },
  { id: "compromisso", label: "Compromisso", icon: "🤝" }
] as const;
type RailId = (typeof RAIL)[number]["id"];

export default function BuilderPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Carregando...</div>}>
      <BuilderInner />
    </Suspense>
  );
}

function BuilderInner() {
  const searchParams = useSearchParams();
  const [funnels, setFunnels] = useState<FunnelData[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"perguntas" | "fluxo" | "config">("perguntas");
  const [step, setStep] = useState<RailId>("inicio");
  const [railOpen, setRailOpen] = useState(false);
  const [editingAreaKey, setEditingAreaKey] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [draftMsg, setDraftMsg] = useState<{ text: string; link?: string } | null>(null);
  const [publishMsg, setPublishMsg] = useState<{ text: string; link?: string } | null>(null);

  useEffect(() => {
    (async () => {
      let serverFunnels: FunnelData[] = [];
      try {
        const res = await fetch("/api/funnels");
        const data = await res.json();
        if (data.ok) serverFunnels = data.funnels;
      } catch { /* segue só com localStorage */ }

      let local: FunnelData[] = [];
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) local = JSON.parse(raw);
      } catch { /* storage corrompido, ignora */ }

      const bySlug = new Map<string, FunnelData>();
      serverFunnels.forEach((f) => bySlug.set(f.slug, f));
      local.forEach((f) => bySlug.set(f.slug, f));
      let merged = Array.from(bySlug.values());

      const wantsNew = searchParams.get("new") === "1";
      const wantsSlug = searchParams.get("slug");

      if (wantsNew) {
        const f = blankFunnel();
        let slug = f.slug, i = 1;
        while (merged.some((x) => x.slug === slug)) slug = `${f.slug}-${++i}`;
        f.slug = slug;
        merged = [...merged, f];
        setFunnels(merged);
        setActiveSlug(f.slug);
        setEditingAreaKey(f.areaOrder[0]);
      } else if (wantsSlug && merged.some((x) => x.slug === wantsSlug)) {
        setFunnels(merged);
        setActiveSlug(wantsSlug);
        setEditingAreaKey(merged.find((x) => x.slug === wantsSlug)?.areaOrder?.[0] ?? null);
      } else {
        setFunnels(merged);
        setActiveSlug(merged[0]?.slug ?? null);
        setEditingAreaKey(merged[0]?.areaOrder?.[0] ?? null);
      }
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(LS_KEY, JSON.stringify(funnels));
  }, [funnels, loaded]);

  const active = funnels.find((f) => f.slug === activeSlug) || null;

  function updateActive(patch: Partial<FunnelData> | ((f: FunnelData) => FunnelData)) {
    if (!active) return;
    setFunnels((list) => list.map((f) => (f.slug !== active.slug ? f : typeof patch === "function" ? patch(f) : { ...f, ...patch })));
  }
  function updateArea(key: string, patch: Partial<AreaContent>) {
    updateActive((f) => ({ ...f, areas: { ...f.areas, [key]: { ...f.areas[key], ...patch } } }));
  }

  function novoFunil() {
    const f = blankFunnel();
    let slug = f.slug, i = 1;
    while (funnels.some((x) => x.slug === slug)) slug = `${f.slug}-${++i}`;
    f.slug = slug;
    setFunnels((l) => [...l, f]);
    setActiveSlug(slug);
    setEditingAreaKey(f.areaOrder[0]);
    setStep("inicio");
    setSwitcherOpen(false);
  }
  function duplicar(f: FunnelData) {
    let slug = slugify(f.nome + "-copia"), i = 1;
    while (funnels.some((x) => x.slug === slug)) slug = `${slugify(f.nome)}-copia-${++i}`;
    const clone: FunnelData = JSON.parse(JSON.stringify(f));
    clone.slug = slug; clone.nome = f.nome + " (cópia)";
    setFunnels((l) => [...l, clone]);
    setActiveSlug(slug);
  }
  function excluir(slug: string) {
    if (!confirm("Remover este funil da lista local?")) return;
    setFunnels((l) => l.filter((f) => f.slug !== slug));
    if (activeSlug === slug) setActiveSlug(null);
  }
  async function salvarNoDisco() {
    if (!active) return;
    setSaveMsg("Salvando...");
    try {
      const res = await fetch("/api/save-funnel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(active) });
      const data = await res.json();
      setSaveMsg(data.ok ? "Salvo em content/funnels/" + active.slug + ".json ✓" : data.error);
    } catch { setSaveMsg("Falha ao salvar."); }
  }

  function origin() {
    return typeof window !== "undefined" ? window.location.origin : "";
  }

  async function salvarRascunho() {
    if (!active) return;
    setDraftMsg({ text: "Salvando rascunho..." });
    try {
      const res = await fetch("/api/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(active) });
      const data = await res.json();
      if (data.ok) {
        setDraftMsg({ text: "Rascunho salvo, link de pré-visualização pronto:", link: `${origin()}/quiz/${active.slug}/preview` });
      } else {
        setDraftMsg({ text: data.error || "Não deu pra salvar o rascunho." });
      }
    } catch {
      setDraftMsg({ text: "Falha ao salvar o rascunho." });
    }
  }

  async function publicar() {
    if (!active) return;
    setPublishMsg({ text: "Publicando..." });
    try {
      const res = await fetch("/api/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(active) });
      const data = await res.json();
      if (data.ok) {
        setPublishMsg({ text: "Publicado! Esse é o link que vai no anúncio:", link: `${origin()}/quiz/${active.slug}` });
      } else {
        setPublishMsg({ text: data.error || "Não deu pra publicar." });
      }
    } catch {
      setPublishMsg({ text: "Falha ao publicar." });
    }
  }

  function addArea() {
    if (!active) return;
    const key = `area_${Date.now()}`;
    updateActive((f) => ({ ...f, areaOrder: [...f.areaOrder, key], areas: { ...f.areas, [key]: blankArea() } }));
  }
  function removeArea(key: string) {
    if (!active || active.areaOrder.length <= 1) return;
    updateActive((f) => ({ ...f, areaOrder: f.areaOrder.filter((k) => k !== key) }));
    if (editingAreaKey === key) setEditingAreaKey(active.areaOrder.find((k) => k !== key) ?? null);
  }
  function reorderAreas(from: number, to: number) {
    if (!active) return;
    const copy = [...active.areaOrder];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    updateActive({ areaOrder: copy });
  }

  if (!loaded) return <div style={{ padding: 24 }}>Carregando...</div>;

  const dragAreaIndex = { current: null as number | null };

  return (
    <div className="b-shell">
      <AppNav current="builder" />
      <div className="b-topbar">
        <div className="b-topbar-left">
          <button className="b-funnel-switch" onClick={() => setSwitcherOpen((v) => !v)}>
            📋 {active ? active.nome : "Nenhum funil"} {active && <span className="slug">/{active.slug}</span>} ▾
          </button>
          {switcherOpen && (
            <div className="b-funnel-dropdown">
              <div className="b-funnel-list">
                {funnels.map((f) => (
                  <div key={f.slug} className={"b-funnel-item" + (f.slug === activeSlug ? " active" : "")}>
                    <span className="name">{f.nome}</span>
                    <span className="actions">
                      <button className="btn small" onClick={() => { setActiveSlug(f.slug); setEditingAreaKey(f.areaOrder[0] ?? null); setSwitcherOpen(false); }}>Editar</button>
                      <button className="btn small" onClick={() => duplicar(f)}>Duplicar</button>
                      <button className="btn small" onClick={() => excluir(f.slug)}>Excluir</button>
                    </span>
                  </div>
                ))}
              </div>
              <button className="btn primary small" onClick={novoFunil}>+ Novo funil</button>
            </div>
          )}
          <div className="b-tabs">
            <button className={"b-tab" + (tab === "perguntas" ? " active" : "")} onClick={() => setTab("perguntas")}>Perguntas</button>
            <button className={"b-tab" + (tab === "fluxo" ? " active" : "")} onClick={() => setTab("fluxo")}>🔀 Fluxo</button>
            <button className={"b-tab" + (tab === "config" ? " active" : "")} onClick={() => setTab("config")}>Configurações</button>
          </div>
        </div>
        <div className="b-topbar-right">
          {active && <button className="btn" onClick={salvarRascunho}>💾 Salvar rascunho</button>}
          {active && <button className="btn primary" onClick={publicar}>🚀 Publicar</button>}
        </div>
      </div>
      {(draftMsg || publishMsg) && (
        <div style={{ padding: "10px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
          {draftMsg && (
            <p className="b-help" style={{ margin: 0 }}>
              {draftMsg.text}{" "}
              {draftMsg.link && <Link href={draftMsg.link} target="_blank">{draftMsg.link}</Link>}
            </p>
          )}
          {publishMsg && (
            <p className="b-help" style={{ margin: 0 }}>
              {publishMsg.text}{" "}
              {publishMsg.link && <Link href={publishMsg.link} target="_blank">{publishMsg.link}</Link>}
            </p>
          )}
        </div>
      )}
      {active && (
        <div style={{ padding: "0 20px 10px", display: "flex", gap: 8 }}>
          <button className="btn small" onClick={() => downloadJson(active, `${active.slug}.json`)}>Baixar JSON (backup)</button>
          <button className="btn small" onClick={salvarNoDisco}>Salvar em content/funnels (dev)</button>
        </div>
      )}
      {saveMsg && <p className="b-help" style={{ padding: "0 20px" }}>{saveMsg}</p>}

      {!active ? (
        <div style={{ padding: 40 }}>
          <p className="b-help">Nenhum funil ainda.</p>
          <button className="btn primary" onClick={novoFunil}>+ Criar meu primeiro funil</button>
        </div>
      ) : tab === "config" ? (
        <div className="b-config-panel" style={{ padding: 24, maxWidth: 520, overflowY: "auto" }}>
          <div className="b-section">
            <h3>Identificação</h3>
            <div className="b-field"><label>Nome interno</label><input value={active.nome} onChange={(e) => updateActive({ nome: e.target.value })} /></div>
            <div className="b-field"><label>Slug (URL: /quiz/SLUG)</label>
              <input value={active.slug} onChange={(e) => { const s = slugify(e.target.value); setFunnels((l) => l.map((f) => (f.slug === active.slug ? { ...f, slug: s } : f))); setActiveSlug(s); }} /></div>
          </div>
          <div className="b-section">
            <h3>Escritório e integrações</h3>
            <div className="b-field"><label>Nome do escritório</label><input value={active.config.firmName} onChange={(e) => updateActive({ config: { ...active.config, firmName: e.target.value } })} /></div>
            <div className="b-field"><label>Advogado(a) responsável</label><input value={active.config.lawyerName} onChange={(e) => updateActive({ config: { ...active.config, lawyerName: e.target.value } })} /></div>
            <div className="b-field"><label>OAB</label><input value={active.config.oab} onChange={(e) => updateActive({ config: { ...active.config, oab: e.target.value } })} /></div>
            <div className="b-field"><label>WhatsApp (DDI+DDD+número)</label><input value={active.config.whatsappNumber} onChange={(e) => updateActive({ config: { ...active.config, whatsappNumber: e.target.value } })} /></div>
            <div className="b-field"><label>Pixel ID do Meta Ads</label><input value={active.config.metaPixelId} onChange={(e) => updateActive({ config: { ...active.config, metaPixelId: e.target.value } })} /></div>
            <p className="b-help">O token da Conversions API não fica aqui, configure META_CAPI_TOKEN nas variáveis de ambiente da Vercel.</p>
            <div className="b-field"><label>Evento: lead qualificado</label><input value={active.eventos.leadQualificado} onChange={(e) => updateActive({ eventos: { ...active.eventos, leadQualificado: e.target.value } })} /></div>
            <div className="b-field"><label>Evento: dúvida capturada</label><input value={active.eventos.duvidaCapturada} onChange={(e) => updateActive({ eventos: { ...active.eventos, duvidaCapturada: e.target.value } })} /></div>
          </div>
          <div className="b-section">
            <h3>Aparência</h3>
            <div className="b-field">
              <label>Tema do questionário publicado</label>
              <div className="b-tabs" style={{ display: "inline-flex" }}>
                <button
                  className={"b-tab" + (active.config.theme !== "dark" ? " active" : "")}
                  onClick={() => updateActive({ config: { ...active.config, theme: "light" } })}
                >
                  ☀️ Claro
                </button>
                <button
                  className={"b-tab" + (active.config.theme === "dark" ? " active" : "")}
                  onClick={() => updateActive({ config: { ...active.config, theme: "dark" } })}
                >
                  🌙 Escuro
                </button>
              </div>
            </div>
            <p className="b-help">Esse tema é fixo pra quem responde: não muda com o sistema/navegador do lead. O rascunho e o publicado sempre usam o tema escolhido aqui.</p>
          </div>
        </div>
      ) : tab === "fluxo" ? (
        <GraphEditor
          key={active.slug}
          funnelData={active}
          graph={toGraph(active)}
          onChange={(g) => updateActive({ graph: g })}
        />
      ) : (
        <div className="b-body">
          <button type="button" className="b-rail-toggle" onClick={() => setRailOpen((v) => !v)}>
            {railOpen ? "✕ Fechar" : `☰ ${RAIL.find((r) => r.id === step)?.icon} ${RAIL.find((r) => r.id === step)?.label}`}
          </button>
          <div className={"b-rail" + (railOpen ? " open" : "")}>
            {RAIL.map((r) => (
              <div key={r.id} className={"b-rail-item" + (step === r.id ? " active" : "")} onClick={() => { setStep(r.id); setRailOpen(false); }}>
                <span className="n">{r.icon}</span>{r.label}
              </div>
            ))}
          </div>

          <div className="b-canvas">
            <div className={"b-canvas-frame " + (active.config.theme === "dark" ? "theme-dark" : "theme-light")}>
              {(() => {
                const areaKeys = active.areaOrder;
                const showAreaSwitch = (RAIL.find((r) => r.id === step) as any)?.perArea;
                const area = editingAreaKey ? active.areas[editingAreaKey] : null;

                return (
                  <>
                    {showAreaSwitch && (
                      <div className="area-switch">
                        {areaKeys.map((k) => (
                          <button key={k} className={"area-pill" + (k === editingAreaKey ? " active" : "")} onClick={() => setEditingAreaKey(k)}>
                            {active.areas[k]?.chip} {active.areas[k]?.label || k}
                          </button>
                        ))}
                      </div>
                    )}

                    {step === "inicio" && (
                      <>
                        <p className="b-canvas-hint">Tela inicial, clique em qualquer texto pra editar</p>
                        <div className="avatar-row">
                          <EditableText as="span" className="hand" value={active.hero.greeting} onChange={(v) => updateActive({ hero: { ...active.hero, greeting: v } })} />
                        </div>
                        <EditableHeadline tag="h1" className="headline" value={active.hero.headline} onChange={(v) => updateActive({ hero: { ...active.hero, headline: v } })} />
                        <EditableText as="p" className="sub" multiline value={active.hero.subheadline} onChange={(v) => updateActive({ hero: { ...active.hero, subheadline: v } })} />
                        <div className="trust-pill">💬 <EditableHeadline tag="span" value={active.hero.trustNote} onChange={(v) => updateActive({ hero: { ...active.hero, trustNote: v } })} /></div>
                      </>
                    )}

                    {step === "areas" && (
                      <div className="q-card">
                        <EditableHeadline
                          tag="h2"
                          value={active.areaQ || (areaKeys.length === 1 ? DEFAULT_AREA_TEXT.questionSingle : DEFAULT_AREA_TEXT.questionMulti)}
                          onChange={(v) => updateActive({ areaQ: v })}
                        />
                        <EditableText
                          as="p"
                          className="hint"
                          value={active.areaHint || (areaKeys.length === 1 ? DEFAULT_AREA_TEXT.hintSingle : DEFAULT_AREA_TEXT.hintMulti)}
                          onChange={(v) => updateActive({ areaHint: v })}
                        />
                        <div className="opt-list">
                          {areaKeys.map((k, i) => (
                            <div key={k} className="opt b-opt-editable" draggable
                              onDragStart={() => { dragAreaIndex.current = i; }}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => { if (dragAreaIndex.current !== null) reorderAreas(dragAreaIndex.current, i); dragAreaIndex.current = null; }}>
                              <span className="b-drag-handle">⋮⋮</span>
                              <EditableText as="span" className="chip" value={active.areas[k]?.chip || "•"} onChange={(v) => updateArea(k, { chip: v })} />
                              <EditableText as="span" className="label" value={active.areas[k]?.selectorText || ""} placeholder="Texto da opção" onChange={(v) => updateArea(k, { selectorText: v })} />
                              {areaKeys.length > 1 && <button type="button" className="b-opt-remove" onClick={() => removeArea(k)}>✕</button>}
                            </div>
                          ))}
                        </div>
                        <button type="button" className="b-add-opt" onClick={addArea}>+ Nova área</button>
                        {editingAreaKey && (
                          <div style={{ marginTop: 16 }}>
                            <label style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Nome resumido (usado no resultado final)</label>
                            <EditableText as="p" className="sub" value={active.areas[editingAreaKey]?.label || ""} onChange={(v) => updateArea(editingAreaKey, { label: v })} />
                          </div>
                        )}
                      </div>
                    )}

                    {step === "situacao" && area && editingAreaKey && (
                      <>
                        <EditableHeadline tag="h2" className="plain-q" value={area.situacaoQ} onChange={(v) => updateArea(editingAreaKey, { situacaoQ: v })} />
                        <div style={{ height: 12 }} />
                        <OptionCanvasList opts={area.situacaoOpts} onChange={(opts) => updateArea(editingAreaKey, { situacaoOpts: opts })} />
                      </>
                    )}

                    {step === "dores" && area && editingAreaKey && (
                      <>
                        <EditableHeadline tag="h2" className="plain-q" value={area.doresQ} onChange={(v) => updateArea(editingAreaKey, { doresQ: v })} />
                        <p className="plain-note">Pode marcar mais de uma.</p>
                        <OptionCanvasList opts={area.doresOpts} onChange={(opts) => updateArea(editingAreaKey, { doresOpts: opts })} />
                      </>
                    )}

                    {step === "urgencia" && (
                      <>
                        <EditableHeadline tag="h2" className="plain-q" value={active.urgenciaQ || DEFAULT_QUESTIONS.urgenciaQ} onChange={(v) => updateActive({ urgenciaQ: v })} />
                        <p className="plain-note">Cuidado ao adicionar/remover opções aqui: elas afetam o cálculo da prioridade de atendimento.</p>
                        <OptionCanvasList opts={active.urgencia} onChange={(opts) => updateActive({ urgencia: opts })} />
                      </>
                    )}

                    {step === "aspiracao" && (
                      <>
                        <EditableHeadline tag="h2" className="plain-q" value={active.aspiracaoQ || DEFAULT_QUESTIONS.aspiracaoQ} onChange={(v) => updateActive({ aspiracaoQ: v })} />
                        <OptionCanvasList opts={active.aspiracao} onChange={(opts) => updateActive({ aspiracao: opts })} />
                      </>
                    )}

                    {step === "honorarios" && (
                      <>
                        <EditableHeadline tag="h2" className="plain-q" value={active.honorariosQ || DEFAULT_QUESTIONS.honorariosQ} onChange={(v) => updateActive({ honorariosQ: v })} />
                        <OptionCanvasList opts={active.honorarios} onChange={(opts) => updateActive({ honorarios: opts })} />
                      </>
                    )}

                    {step === "compromisso" && (
                      <>
                        <EditableHeadline tag="h2" className="plain-q" value={active.compromissoQ || DEFAULT_QUESTIONS.compromissoQ} onChange={(v) => updateActive({ compromissoQ: v })} />
                        <p className="plain-note">Cuidado ao adicionar/remover opções aqui: a primeira e a segunda decidem quem vai pro WhatsApp e quem vai pro formulário de dúvida.</p>
                        <OptionCanvasList opts={active.compromisso} onChange={(opts) => updateActive({ compromisso: opts })} />
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
