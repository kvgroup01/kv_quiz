"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppNav from "@/components/AppNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import GraphEditor from "@/app/builder/graph/GraphEditor";
import { PhonePreview } from "@/components/builder/PhonePreview";
import { SettingsDrawer } from "@/components/builder/SettingsDrawer";
import { blankArea, type FunnelData } from "@/lib/funnel-schema";
import { toGraph } from "@/lib/funnel-graph-adapter";

const LS_KEY = "radar_juridico_funnels_v1";

function slugify(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
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
      trustNote: "**Sem custo** para fazer essa pré-triagem.",
    },
    areaOrder: ["area1"],
    areas: { area1: blankArea() },
    urgencia: [{ v: "recente", t: "Menos de 6 meses" }, { v: "medio", t: "Entre 6 meses e 2 anos" }, { v: "antigo", t: "Mais de 2 anos" }, { v: "incerto", t: "Não sei ao certo" }],
    aspiracao: [{ v: "a1", t: "Recuperar o que é meu por direito" }, { v: "a2", t: "Ter paz e parar de pensar nisso" }, { v: "a3", t: "Corrigir uma injustiça" }, { v: "a4", t: "Só quero entender minha situação" }],
    honorarios: [{ v: "h1", t: "Não sei, quero entender" }, { v: "h2", t: "Já ouvi falar que só se paga se ganhar" }, { v: "h3", t: "Tenho receio de gastar sem necessidade" }, { v: "h4", t: "Não me importo, só quero resolver" }],
    compromisso: [{ v: "alto", t: "Sim, quero resolver o quanto antes" }, { v: "medio", t: "Sim, mas quero entender melhor antes" }, { v: "baixo", t: "Ainda não tenho certeza" }, { v: "duvida", t: "Só quero tirar uma dúvida por enquanto" }],
  };
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

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
  const [published, setPublished] = useState<Record<string, string>>({});
  const [publishedAt, setPublishedAt] = useState<Record<string, string | null>>({});
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "nokv">("idle");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [devMenuOpen, setDevMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);
  const lastSavedJson = useRef("");

  useEffect(() => {
    (async () => {
      let serverFunnels: FunnelData[] = [];
      try {
        const response = await fetch("/api/funnels");
        const data = await response.json();
        if (data.ok) {
          serverFunnels = data.funnels;
          const pub: Record<string, string> = {};
          (data.funnels as FunnelData[]).forEach((funnel) => { pub[funnel.slug] = JSON.stringify(funnel); });
          setPublished(pub);
          setPublishedAt(data.publishedAt || {});
        }
      } catch { /* segue só com localStorage */ }

      let local: FunnelData[] = [];
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) local = JSON.parse(raw);
      } catch { /* storage corrompido, ignora */ }

      const bySlug = new Map<string, FunnelData>();
      serverFunnels.forEach((funnel) => bySlug.set(funnel.slug, funnel));
      local.forEach((funnel) => bySlug.set(funnel.slug, funnel));
      let merged = Array.from(bySlug.values());
      const wantsNew = searchParams.get("new") === "1";
      const wantsSlug = searchParams.get("slug");

      if (wantsNew) {
        const funnel = blankFunnel();
        let slug = funnel.slug;
        let index = 1;
        while (merged.some((item) => item.slug === slug)) slug = `${funnel.slug}-${++index}`;
        funnel.slug = slug;
        merged = [...merged, funnel];
        setActiveSlug(funnel.slug);
      } else if (wantsSlug && merged.some((funnel) => funnel.slug === wantsSlug)) {
        setActiveSlug(wantsSlug);
      } else {
        setActiveSlug(merged[0]?.slug ?? null);
      }
      setFunnels(merged);
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(LS_KEY, JSON.stringify(funnels));
  }, [funnels, loaded]);

  const active = funnels.find((funnel) => funnel.slug === activeSlug) || null;
  const activeJson = active ? JSON.stringify(active) : "";
  const isDirty = !!active && published[active.slug] !== activeJson;
  const neverPublished = !!active && !publishedAt[active.slug];

  useEffect(() => {
    if (!loaded || !active || activeJson === lastSavedJson.current) return;
    setSaveState("saving");
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: activeJson });
        const data = await response.json();
        if (data.ok) {
          lastSavedJson.current = activeJson;
          setSaveState("saved");
        } else setSaveState("nokv");
      } catch { setSaveState("nokv"); }
    }, 1500);
    return () => clearTimeout(timer);
  }, [activeJson, loaded, active]);

  function updateActive(patch: Partial<FunnelData> | ((funnel: FunnelData) => FunnelData)) {
    if (!active) return;
    setFunnels((list) => list.map((funnel) => funnel.slug !== active.slug
      ? funnel
      : typeof patch === "function" ? patch(funnel) : { ...funnel, ...patch }));
  }

  function novoFunil() {
    const funnel = blankFunnel();
    let slug = funnel.slug;
    let index = 1;
    while (funnels.some((item) => item.slug === slug)) slug = `${funnel.slug}-${++index}`;
    funnel.slug = slug;
    setFunnels((list) => [...list, funnel]);
    setActiveSlug(slug);
    setSelectedNodeId(null);
    setSwitcherOpen(false);
  }

  function duplicar(funnel: FunnelData) {
    let slug = slugify(funnel.nome + "-copia");
    let index = 1;
    while (funnels.some((item) => item.slug === slug)) slug = `${slugify(funnel.nome)}-copia-${++index}`;
    const clone: FunnelData = JSON.parse(JSON.stringify(funnel));
    clone.slug = slug;
    clone.nome = funnel.nome + " (cópia)";
    setFunnels((list) => [...list, clone]);
    setActiveSlug(slug);
    setSelectedNodeId(null);
    setSwitcherOpen(false);
  }

  function excluir(slug: string) {
    if (!confirm("Remover este funil da lista local?")) return;
    setFunnels((list) => list.filter((funnel) => funnel.slug !== slug));
    if (activeSlug === slug) setActiveSlug(funnels.find((funnel) => funnel.slug !== slug)?.slug ?? null);
  }

  async function salvarNoDisco() {
    if (!active) return;
    try {
      const response = await fetch("/api/save-funnel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(active) });
      const data = await response.json();
      setPublishMsg(data.ok ? `Salvo em content/funnels/${active.slug}.json ✓` : data.error);
      setTimeout(() => setPublishMsg(null), 3000);
    } catch { setPublishMsg("Falha ao salvar."); }
  }

  async function publicar() {
    if (!active) return;
    try {
      const response = await fetch("/api/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: activeJson });
      const data = await response.json();
      if (data.ok) {
        setPublished((current) => ({ ...current, [active.slug]: activeJson }));
        setPublishedAt((current) => ({ ...current, [active.slug]: new Date().toISOString() }));
        setPublishMsg("Publicado ✓");
        setTimeout(() => setPublishMsg(null), 3000);
      } else setPublishMsg(data.error || "Não deu para publicar.");
    } catch { setPublishMsg("Falha ao publicar."); }
  }

  if (!loaded) return <div style={{ padding: 24 }}>Carregando...</div>;

  return (
    <div className="in-app bl-shell">
      <AppNav current="builder" />
      {!active ? (
        <main className="in-container"><p className="dash-empty">Nenhum funil ainda.</p><Button variant="primary" onClick={novoFunil}>+ Criar meu primeiro funil</Button></main>
      ) : (
        <>
          <div className="bl-head">
            <div className="bl-head-left">
              <button type="button" className="bl-funnel-switch" onClick={() => setSwitcherOpen((value) => !value)}>{active.nome} <span className="bl-slug">/{active.slug}</span> ▾</button>
              {switcherOpen && (
                <div className="bl-dropdown">
                  {funnels.map((funnel) => (
                    <div key={funnel.slug} className={"bl-dropdown-item" + (funnel.slug === activeSlug ? " active" : "")}>
                      <button type="button" className="bl-dropdown-name" onClick={() => { setActiveSlug(funnel.slug); setSelectedNodeId(null); setSwitcherOpen(false); }}>{funnel.nome}</button>
                      <span><Button size="sm" variant="ghost" onClick={() => duplicar(funnel)}>Duplicar</Button><Button size="sm" variant="ghost" onClick={() => excluir(funnel.slug)}>Excluir</Button></span>
                    </div>
                  ))}
                  <Button variant="primary" size="sm" onClick={novoFunil}>＋ Novo funil</Button>
                </div>
              )}
              <div className="bl-devmenu">
                <Button size="sm" variant="ghost" iconOnly title="Mais" onClick={() => setDevMenuOpen((value) => !value)}>⋯</Button>
                {devMenuOpen && (
                  <div className="bl-dropdown">
                    <button type="button" className="bl-dropdown-name" onClick={() => { downloadJson(active, `${active.slug}.json`); setDevMenuOpen(false); }}>Baixar JSON (backup)</button>
                    <button type="button" className="bl-dropdown-name" onClick={() => { salvarNoDisco(); setDevMenuOpen(false); }}>Salvar em content/funnels (dev)</button>
                  </div>
                )}
              </div>
            </div>
            <div className="bl-status">
              {neverPublished ? <Badge>◉ Nunca publicado</Badge> : isDirty ? <Badge tone="orange">◉ Alterações não publicadas</Badge> : <Badge tone="green">◉ No ar · sem alterações</Badge>}
              <span className="bl-save">{saveState === "saving" ? "Salvando…" : saveState === "saved" ? "Salvo" : saveState === "nokv" ? "Não salvo (sem KV)" : ""}</span>
              {publishMsg && <span className="bl-save">{publishMsg}</span>}
            </div>
            <div className="bl-head-right">
              <Button iconOnly title="Configurações" onClick={() => setSettingsOpen(true)}>⚙</Button>
              <Button className="bl-preview-btn" onClick={() => setPreviewOpen(true)}>Ver prévia</Button>
              <Button href={`/quiz/${active.slug}/preview`} target="_blank">Pré-visualizar</Button>
              <Button variant="primary" disabled={!isDirty && !neverPublished} onClick={publicar}>Publicar</Button>
            </div>
          </div>

          <div className="bl-body">
            <div className="bl-editor">
              <GraphEditor key={active.slug} funnelData={active} graph={toGraph(active)} onChange={(graph) => updateActive({ graph })} onSelectedChange={setSelectedNodeId} />
            </div>
            <div className={"bl-preview" + (previewOpen ? " open" : "")}>
              <div className="bl-preview-close"><Button size="sm" onClick={() => setPreviewOpen(false)}>Fechar</Button></div>
              <PhonePreview data={active} nodeId={selectedNodeId} />
            </div>
            {previewOpen && <div className="bl-preview-backdrop" onClick={() => setPreviewOpen(false)} />}
          </div>

          {settingsOpen && <SettingsDrawer
            active={active}
            onPatch={updateActive}
            onSlugChange={(raw) => { const slug = slugify(raw); setFunnels((list) => list.map((funnel) => funnel.slug === active.slug ? { ...funnel, slug } : funnel)); setActiveSlug(slug); }}
            onClose={() => setSettingsOpen(false)}
          />}
        </>
      )}
    </div>
  );
}
