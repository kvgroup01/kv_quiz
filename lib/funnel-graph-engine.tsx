"use client";

// Motor novo: interpreta um FunnelGraph (nós + arestas) em vez de uma
// sequência fixa de etapas. Reaproveita toda a UI/animação/integração de
// funnel-engine-shared.tsx (as mesmas telas que já rodam em produção) — só a
// forma de decidir "qual é a próxima tela" muda, de um switch(step) fixo pra
// uma resolução de arestas orientada a dado.

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FunnelData } from "./funnel-schema";
import { toGraph } from "./funnel-graph-adapter";
import {
  type FunnelGraph, type GraphNode, type Answers,
  interpolateTemplate, evalCondition, computeGraphScore
} from "./funnel-graph-schema";
import {
  SCREEN_TRANSITION_MS, APPLE_EASE, screenVariants, STANDARD_META_EVENTS,
  parseRich, readUtm, readCookie, initMetaPixel, postJson,
  OptionRow, LoadingScreen, RingScreen, LeadContactForm, DoubtCapture,
  type Utm
} from "./funnel-engine-shared";

function nodesById(graph: FunnelGraph): Map<string, GraphNode> {
  return new Map(graph.nodes.map((n) => [n.id, n]));
}

/** Resolve o próximo nó a partir do atual, olhando as arestas que saem dele.
 * `handle` é a opção escolhida (nós de escolha) — indefinido pra nós de
 * avanço automático (multiChoice, score, interstitial, start). */
function resolveNext(graph: FunnelGraph, nodeId: string, handle: string | undefined): string | null {
  const candidates = graph.edges.filter((e) => e.source === nodeId);
  if (handle !== undefined) {
    const exact = candidates.find((e) => e.sourceHandle === handle);
    if (exact) return exact.target;
  }
  const fallback = candidates.find((e) => e.sourceHandle === undefined || e.sourceHandle === "default");
  if (fallback) return fallback.target;
  return candidates[0]?.target ?? null;
}

function resolveConditionNext(
  graph: FunnelGraph,
  node: Extract<GraphNode, { type: "condition" }>,
  answers: Answers
): string {
  for (let i = 0; i < node.data.rules.length; i++) {
    if (evalCondition(node.data.rules[i], answers)) return node.data.rules[i].targetNodeId;
  }
  return node.data.defaultNodeId;
}

function optionsFor(
  data: FunnelData,
  node: Extract<GraphNode, { type: "choice" | "multiChoice" }>,
  answers: Answers
) {
  if (node.data.optionsFromArea) {
    const areaKey = answers.area as string | undefined;
    const area = areaKey ? data.areas[areaKey] : null;
    if (!area) return [];
    const opts = node.data.optionsFromArea === "situacaoOpts" ? area.situacaoOpts : area.doresOpts;
    return opts.map((o) => ({ id: o.v, t: o.t, icon: o.icon }));
  }
  return node.data.options;
}

function questionFor(
  data: FunnelData,
  node: Extract<GraphNode, { type: "choice" | "multiChoice" }>,
  answers: Answers
): string {
  if (node.data.questionFromArea) {
    const areaKey = answers.area as string | undefined;
    const area = areaKey ? data.areas[areaKey] : null;
    if (area) return node.data.questionFromArea === "situacaoQ" ? area.situacaoQ : area.doresQ;
  }
  return node.data.question;
}

export default function FunnelGraphEngine({ data, previewMode }: { data: FunnelData; previewMode?: boolean }) {
  const graph = useMemo(() => toGraph(data), [data]);
  const byId = useMemo(() => nodesById(graph), [graph]);
  const startNode = useMemo(() => graph.nodes.find((n) => n.type === "start"), [graph]);

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [direction, setDirection] = useState(1);
  const navLocked = useRef(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [loadingDone, setLoadingDone] = useState(false);
  const [ringDone, setRingDone] = useState(false);
  const utmRef = useRef<Utm>({});

  // Nó "de vitrine" (primeiro depois do start): mostra o cabeçalho (saudação/
  // headline/subheadline) do funil acima da própria pergunta, sem precisar de
  // um tipo de nó dedicado — é sempre o primeiro nó real do grafo.
  const heroNodeId = useMemo(() => {
    if (!startNode) return null;
    return resolveNext(graph, startNode.id, undefined);
  }, [graph, startNode]);

  useEffect(() => {
    if (previewMode) return;
    utmRef.current = readUtm();
    initMetaPixel(data.config.metaPixelId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentId !== null || !startNode) return;
    const first = resolveNext(graph, startNode.id, undefined);
    if (first) setCurrentId(first);
  }, [currentId, startNode, graph]);

  function withNavLock(fn: () => void) {
    if (navLocked.current) return;
    navLocked.current = true;
    fn();
    setTimeout(() => { navLocked.current = false; }, SCREEN_TRANSITION_MS * 2);
  }

  function goTo(nodeId: string) {
    withNavLock(() => {
      setDirection(1);
      setHistory((h) => (currentId ? [...h, currentId] : h));
      setLoadingDone(false);
      setRingDone(false);
      setCurrentId(nodeId);
    });
  }

  // Nós "score"/"condition" não têm tela própria — avançam sozinhos assim
  // que são alcançados. Isso acontece LOGO depois de uma transição normal
  // (goTo pro nó invisível), então o navLock dessa transição ainda está
  // ativo; passar por goTo aqui faria o avanço silencioso ser ignorado e o
  // usuário ficaria travado numa tela em branco. Por isso avança direto,
  // sem checar/mexer no lock (não há animação envolvida, não há risco de
  // clique duplo do usuário nesses nós).
  function advanceSilently(nodeId: string) {
    setHistory((h) => (currentId ? [...h, currentId] : h));
    setCurrentId(nodeId);
  }

  function goBack() {
    withNavLock(() => {
      setDirection(-1);
      setHistory((h) => {
        const copy = [...h];
        // Nós "score"/"condition" são invisíveis — pular direto pra trás
        // deles, senão o efeito de auto-avanço logo abaixo os empurraria
        // pra frente de novo e o "Voltar" pareceria não fazer nada.
        let prev: string | undefined;
        while (copy.length) {
          prev = copy.pop();
          const t = prev ? byId.get(prev)?.type : undefined;
          if (t !== "score" && t !== "condition") break;
          prev = undefined;
        }
        if (prev) setCurrentId(prev);
        return copy;
      });
    });
  }

  // Nós de "score" e "condition" são invisíveis: calculam/decidem e avançam
  // sozinhos, sem tela própria — igual computeScore()/o if(highIntent) eram
  // só código, nunca uma etapa do ORDER, no motor antigo.
  useEffect(() => {
    if (!currentId) return;
    const node = byId.get(currentId);
    if (!node) return;
    if (node.type === "score") {
      const value = computeGraphScore(node, answers);
      setAnswers((a) => ({ ...a, [node.data.alias]: value }));
      const next = resolveNext(graph, node.id, undefined);
      if (next) {
        const t = setTimeout(() => advanceSilently(next), 0);
        return () => clearTimeout(t);
      }
    } else if (node.type === "condition") {
      const next = resolveConditionNext(graph, node, answers);
      const t = setTimeout(() => advanceSilently(next), 0);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  const visibleCount = useMemo(() => {
    // Estimativa de progresso: caminho mais curto do start até um terminal
    // seguindo só arestas padrão/primeira opção — grafos com ramificação real
    // não têm um "total de telas" exato, então isso é só uma referência.
    let count = 0;
    let cur = startNode ? resolveNext(graph, startNode.id, undefined) : null;
    const seen = new Set<string>();
    while (cur && !seen.has(cur) && count < 40) {
      seen.add(cur);
      const node = byId.get(cur);
      if (!node) break;
      if (node.type !== "score") count++;
      if (node.type === "terminalLead" || node.type === "terminalDoubt") break;
      if (node.type === "condition") {
        cur = node.data.defaultNodeId;
      } else {
        cur = resolveNext(graph, cur, undefined);
      }
    }
    return Math.max(count, 1);
  }, [graph, startNode, byId]);

  const visibleHistoryCount = history.filter((id) => byId.get(id)?.type !== "score").length + 1;
  const progressPct = Math.min(100, Math.round((visibleHistoryCount / visibleCount) * 100));

  function fireEvent(kind: "lead" | "doubt", metaEvent: string, extra: Record<string, unknown>) {
    if (!metaEvent || previewMode) return;
    const eventId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    try {
      const w = window as any;
      if (w.fbq) {
        if (STANDARD_META_EVENTS.includes(metaEvent)) w.fbq("track", metaEvent, extra, { eventID: eventId });
        else w.fbq("trackCustom", metaEvent, extra, { eventID: eventId });
      }
    } catch {
      /* noop */
    }
    postJson("/api/conversion", {
      evento: metaEvent,
      event_id: eventId,
      funil: data.slug,
      enviado_em: new Date().toISOString(),
      utm: utmRef.current,
      fbp: readCookie("_fbp"),
      fbc: readCookie("_fbc"),
      ...extra
    });
  }

  function buildLegacyShapedPayload(tipo: "qualificado" | "duvida", form: { nome: string; whatsapp: string; texto?: string | null; audioBase64?: string | null; audioMime?: string | null }) {
    const areaKey = answers.area as string | undefined;
    const area = areaKey ? data.areas[areaKey] : null;
    const doresAns = answers.dores;
    const doresLabels = Array.isArray(doresAns)
      ? doresAns.map((v) => area?.doresOpts.find((o) => o.v === v)?.t || String(v))
      : [];
    return {
      tipo,
      funil: data.slug,
      enviado_em: new Date().toISOString(),
      area: area?.label || "",
      situacao: area?.situacaoOpts.find((o) => o.v === answers.situacao)?.t || "",
      urgencia: data.urgencia.find((o) => o.v === answers.urgencia)?.t || "",
      dores: doresLabels,
      compromisso: data.compromisso.find((o) => o.v === answers.compromisso)?.t || "",
      utm: utmRef.current,
      nome: form.nome,
      whatsapp: form.whatsapp,
      pergunta_texto: form.texto ?? null,
      pergunta_audio_base64: form.audioBase64 ?? null,
      pergunta_audio_mime: form.audioMime ?? null
    };
  }

  if (!currentId) return null;
  const node = byId.get(currentId);
  if (!node) return null;

  const showHero = currentId === heroNodeId;
  const heroBlock = showHero ? (
    <>
      <div className="avatar-row">
        <span className="hand">{data.hero.greeting}</span>
      </div>
      <h1 className="headline" dangerouslySetInnerHTML={{ __html: parseRich(data.hero.headline) }} />
      <p className="sub">{data.hero.subheadline}</p>
      <div className="trust-pill">
        💬 <span dangerouslySetInnerHTML={{ __html: parseRich(data.hero.trustNote) }} />
      </div>
    </>
  ) : null;

  let body: React.ReactNode = null;

  if (node.type === "choice") {
    const opts = optionsFor(data, node, answers);
    const question = questionFor(data, node, answers);
    const optionList = (
      <div className="opt-list">
        {opts.map((o) => (
          <OptionRow
            key={o.id}
            chip={o.icon || "•"}
            label={o.t}
            selected={answers[node.data.alias] === o.id}
            onClick={() => {
              setAnswers((a) => ({ ...a, [node.data.alias]: o.id }));
              const next = resolveNext(graph, node.id, o.id);
              if (next) goTo(next);
            }}
          />
        ))}
      </div>
    );
    // O primeiro nó do grafo (logo depois do start) é sempre o "cartão de
    // entrada" — mesmo tratamento visual (caixa escura) que a etapa de área
    // sempre teve no motor antigo, pareado com o cabeçalho/saudação do funil.
    body = showHero ? (
      <div className="screen">
        {heroBlock}
        <div className="q-card">
          <h2>{question}</h2>
          <p className="hint">{node.data.note || "toca pra escolher ✨"}</p>
          {optionList}
        </div>
      </div>
    ) : (
      <div className="screen">
        <h2 className="plain-q">{question}</h2>
        {node.data.note ? <p className="plain-note">{node.data.note}</p> : <div style={{ height: 14 }} />}
        {optionList}
        {node.data.footerNote && (
          <div className="fact-card show" style={{ marginTop: 14 }}>
            <div className="chip">💡</div>
            <span>{node.data.footerNote}</span>
          </div>
        )}
      </div>
    );
  } else if (node.type === "multiChoice") {
    const opts = optionsFor(data, node, answers);
    const question = questionFor(data, node, answers);
    const selected = (answers[node.data.alias] as string[] | undefined) || [];
    body = (
      <div className="screen">
        {heroBlock}
        <h2 className="plain-q">{question}</h2>
        <p className="plain-note">{node.data.note || "Pode marcar mais de uma."}</p>
        <div className="opt-list">
          {opts.map((o) => {
            const sel = selected.includes(o.id);
            return (
              <OptionRow
                key={o.id}
                chip={o.icon || "•"}
                label={o.t}
                selected={sel}
                checkbox
                onClick={() => {
                  setAnswers((a) => {
                    const cur = (a[node.data.alias] as string[] | undefined) || [];
                    const nextVal = sel ? cur.filter((v) => v !== o.id) : [...cur, o.id];
                    return { ...a, [node.data.alias]: nextVal };
                  });
                }}
              />
            );
          })}
        </div>
        <button
          className="cta"
          disabled={selected.length < (node.data.minSelected ?? 1)}
          onClick={() => {
            const next = resolveNext(graph, node.id, undefined);
            if (next) goTo(next);
          }}
        >
          Continuar →
        </button>
      </div>
    );
  } else if (node.type === "interstitial") {
    if (node.data.kind === "loading") {
      body = (
        <LoadingScreen
          done={loadingDone}
          onDone={() => setLoadingDone(true)}
          onContinue={() => { const next = resolveNext(graph, node.id, undefined); if (next) goTo(next); }}
          durationMs={node.data.durationMs}
          facts={node.data.facts}
        />
      );
    } else if (node.data.kind === "ring") {
      const score = node.data.scoreRef ? Number(answers[node.data.scoreRef] ?? 0) : 0;
      body = (
        <RingScreen
          score={score}
          done={ringDone}
          onDone={() => setRingDone(true)}
          onContinue={() => { const next = resolveNext(graph, node.id, undefined); if (next) goTo(next); }}
        />
      );
    } else {
      body = (
        <div className="screen">
          <p className="eyebrow">COMO FUNCIONA</p>
          <h2 className="plain-q">{node.data.title || "Fale com quem entende do assunto"}</h2>
          <div className="trust-list">
            {node.data.body ? (
              <div className="trust-item"><span className="mark">✓</span><span>{node.data.body}</span></div>
            ) : (
              <>
                <div className="trust-item"><span className="mark">✓</span><span>Avaliação inicial sem custo, direto com um advogado</span></div>
                <div className="trust-item"><span className="mark">✓</span><span>Atendimento 100% online, sem sair de casa</span></div>
                <div className="trust-item"><span className="mark">✓</span><span>Sem compromisso, você decide depois de entender seu caso</span></div>
              </>
            )}
            <div className="trust-item">
              <span className="mark">✓</span>
              <span>{data.config.lawyerName} <span className="oab-tag">{data.config.oab}</span></span>
            </div>
          </div>
          <button className="cta" onClick={() => { const next = resolveNext(graph, node.id, undefined); if (next) goTo(next); }}>Continuar →</button>
        </div>
      );
    }
  } else if (node.type === "condition") {
    // Nó silencioso — o useEffect acima já cuida de resolver e avançar.
    body = null;
  } else if (node.type === "terminalLead") {
    const score = node.data.scoreAlias ? Number(answers[node.data.scoreAlias] ?? 0) : 0;
    const areaKey = answers.area as string | undefined;
    const area = areaKey ? data.areas[areaKey] : null;
    const doresAns = answers.dores;
    const doresLabels = Array.isArray(doresAns)
      ? doresAns.map((v) => area?.doresOpts.find((o) => o.v === v)?.t || String(v))
      : [];
    body = (
      <div className="screen">
        <div className="result-banner">
          <p className="eyebrow">PRÉ-TRIAGEM CONCLUÍDA</p>
          <h2>Seu caso está pronto pra ser avaliado por um advogado.</h2>
          <p>Reunimos o essencial da sua situação pra você não precisar explicar tudo de novo no WhatsApp.</p>
        </div>
        {node.data.scoreAlias && <div className="badge-pill">🎯 {score}% de prioridade de atendimento</div>}
        <div className="profile-card">
          <span className="eyebrow">RESUMO DO SEU CASO</span>
          <h3>{area?.label} · {area?.situacaoOpts.find((o) => o.v === answers.situacao)?.t}</h3>
          <p>
            Tempo do ocorrido: {data.urgencia.find((o) => o.v === answers.urgencia)?.t}.{" "}
            {doresLabels.length ? "Principais pontos: " + doresLabels.join(", ") + "." : ""}
          </p>
        </div>
        <div className="insight-row">⚖️ Uma avaliação de caso real depende sempre da análise de documentos e provas.</div>
        <div className="insight-row">💬 Só falta seu nome e WhatsApp pra gente já te conectar com o atendente, com esse resumo pronto.</div>
        <LeadContactForm
          previewMode={!!previewMode}
          buildWaLink={(nome) => "https://wa.me/" + data.config.whatsappNumber + "?text=" + encodeURIComponent(
            interpolateTemplate(node.data.whatsappMessageTemplate, answers, graph, nome, (n) =>
              n.type === "choice" || n.type === "multiChoice" ? optionsFor(data, n, answers) : []
            )
          )}
          onSubmit={async (form) => {
            const payload = buildLegacyShapedPayload("qualificado", form);
            const result = previewMode ? { ok: true } : await postJson("/api/lead", payload);
            fireEvent("lead", node.data.metaEvent, {
              area: area?.label || null,
              situacao: payload.situacao,
              urgencia: payload.urgencia,
              nome: form.nome,
              whatsapp: form.whatsapp,
              lead_id: result?.id,
              dores: doresLabels,
              prioridade: score
            });
            return result;
          }}
        />
        <p className="disclaimer">
          Esta pré-triagem é uma ferramenta de organização de informações e não constitui consulta, parecer ou aconselhamento jurídico.
          A existência de direito e as chances de êxito só podem ser avaliadas por um advogado, caso a caso, com base na análise de documentos.
          <br />{data.config.firmName} · {data.config.lawyerName} · {data.config.oab}
        </p>
      </div>
    );
  } else if (node.type === "terminalDoubt") {
    body = (
      <div className="screen">
        <p className="eyebrow">ANTES DE VOCÊ DECIDIR</p>
        <h2 className="plain-q">Sem problema, deixa eu tirar suas dúvidas mais comuns primeiro.</h2>
        <div className="faq">
          <div className="faq-item"><b>Quanto custa a avaliação?</b><span>A avaliação inicial do seu caso não tem custo.</span></div>
          <div className="faq-item"><b>Preciso pagar algo adiantado?</b><span>Depende do caso: em muitas situações os honorários só são combinados se houver um resultado a receber. Isso é explicado na conversa.</span></div>
          <div className="faq-item"><b>Quanto tempo demora um processo assim?</b><span>Varia muito de caso a caso, o advogado consegue te dar uma expectativa real depois de ver a documentação.</span></div>
        </div>
        <DoubtCapture
          previewMode={!!previewMode}
          onSubmit={async (form) => {
            const payload = buildLegacyShapedPayload("duvida", form);
            const result = previewMode ? { ok: true } : await postJson("/api/lead", payload);
            fireEvent("doubt", node.data.metaEvent, { nome: form.nome, whatsapp: form.whatsapp, lead_id: result?.id });
            return result;
          }}
        />
        <p className="disclaimer">
          Esta pré-triagem é uma ferramenta de organização de informações e não constitui consulta, parecer ou aconselhamento jurídico.
          <br />{data.config.firmName} · {data.config.lawyerName} · {data.config.oab}
        </p>
      </div>
    );
  }

  return (
    <div id="app-shell">
      <div id="progress-track"><div id="progress-fill" style={{ width: progressPct + "%" }} /></div>
      <div id="topbar">
        {history.length > 0 && (
          <button id="back-btn" type="button" onClick={goBack}>← Voltar</button>
        )}
      </div>
      <div id="stage">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={currentId}
            custom={direction}
            variants={screenVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: SCREEN_TRANSITION_MS / 1000, ease: APPLE_EASE }}
            style={{ width: "100%" }}
          >
            {body}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
