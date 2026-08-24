// Ponte entre o formato antigo (FunnelData plano, sequência fixa) e o novo
// grafo editável. Sintetiza, em memória, um grafo equivalente à sequência
// hardcoded que lib/funnel-engine.tsx sempre rodou — assim nenhum funil já
// publicado (nem em content/funnels/*.json nem no KV) precisa ser convertido
// à força: ele só ganha um `graph` de verdade quando alguém abre o editor
// visual novo e salva.

import { DEFAULT_QUESTIONS, type FunnelData } from "./funnel-schema";
import type { FunnelGraph, GraphNode, GraphEdge, GraphOption } from "./funnel-graph-schema";

function opt(v: string, t: string, icon?: string): GraphOption {
  return { id: v, t, icon };
}

const LEGACY_LOADING_FACTS = [
  { chip: "📄", t: "Cada caso depende da documentação e do histórico específico." },
  { chip: "⏳", t: "Prazos legais (prescrição) existem, quanto antes for avaliado, melhor." },
  { chip: "💬", t: "O primeiro passo é sempre uma conversa objetiva com um advogado." }
];

const LEGACY_HONORARIOS_FOOTER =
  "Em muitos casos como esse, a avaliação inicial não tem custo, e os honorários costumam ser combinados diretamente com o advogado, em geral como percentual sobre o valor recuperado. Os detalhes exatos são explicados na conversa.";

const LEGACY_URGENCIA_NOTE = "Prazos legais variam de caso a caso, por isso essa informação importa.";

const LEGACY_WHATSAPP_TEMPLATE =
  "Olá! Meu nome é {{nome}} e fiz a pré-triagem no site.\n" +
  "Área: {{area}}\n" +
  "Situação: {{situacao}}\n" +
  "Principais pontos: {{dores}}\n" +
  "Tempo do ocorrido: {{urgencia}}\n" +
  "Gostaria de falar com um advogado sobre o meu caso o quanto antes.";

/** Grafo determinístico: chamar de novo com o mesmo `data` produz os mesmos
 * ids de nó (necessário pra edges/condições apontarem sempre pro alvo certo,
 * e pra não gerar "diffs" fantasmas a cada leitura). */
export function synthesizeLegacyGraph(data: FunnelData): FunnelGraph {
  const id = (name: string) => `legacy:${name}`;

  const areaKeys = data.areaOrder?.length ? data.areaOrder : Object.keys(data.areas);
  const areaOptions: GraphOption[] = areaKeys
    .map((k) => data.areas[k])
    .filter(Boolean)
    .map((a, i) => opt(areaKeys[i], a.selectorText || a.label, a.chip));

  const nodes: GraphNode[] = [
    { id: id("start"), type: "start", position: { x: 0, y: 0 }, data: {} },
    {
      id: id("area"),
      type: "choice",
      position: { x: 0, y: 120 },
      data: { alias: "area", question: "Qual é a sua área?", options: areaOptions }
    },
    {
      id: id("situacao"),
      type: "choice",
      position: { x: 0, y: 240 },
      data: {
        alias: "situacao",
        question: "Qual dessas situações é mais parecida com a sua?",
        options: [],
        optionsFromArea: "situacaoOpts",
        questionFromArea: "situacaoQ"
      }
    },
    {
      id: id("urgencia"),
      type: "choice",
      position: { x: 0, y: 360 },
      data: {
        alias: "urgencia",
        question: data.urgenciaQ || DEFAULT_QUESTIONS.urgenciaQ,
        note: LEGACY_URGENCIA_NOTE,
        options: data.urgencia.map((o) => opt(o.v, o.t, o.icon))
      }
    },
    {
      id: id("aspiracao"),
      type: "choice",
      position: { x: 0, y: 480 },
      data: {
        alias: "aspiracao",
        question: data.aspiracaoQ || DEFAULT_QUESTIONS.aspiracaoQ,
        options: data.aspiracao.map((o) => opt(o.v, o.t, o.icon))
      }
    },
    {
      id: id("loading1"),
      type: "interstitial",
      position: { x: 0, y: 600 },
      data: { kind: "loading", durationMs: 2400, facts: LEGACY_LOADING_FACTS }
    },
    {
      id: id("honorarios"),
      type: "choice",
      position: { x: 0, y: 720 },
      data: {
        alias: "honorarios",
        question: data.honorariosQ || DEFAULT_QUESTIONS.honorariosQ,
        footerNote: LEGACY_HONORARIOS_FOOTER,
        options: data.honorarios.map((o) => opt(o.v, o.t, o.icon))
      }
    },
    {
      id: id("dores"),
      type: "multiChoice",
      position: { x: 0, y: 840 },
      data: {
        alias: "dores",
        question: "O que está acontecendo com o seu caso?",
        note: "Pode marcar mais de uma.",
        options: [],
        minSelected: 1,
        optionsFromArea: "doresOpts",
        questionFromArea: "doresQ"
      }
    },
    {
      id: id("score"),
      type: "score",
      position: { x: 0, y: 960 },
      data: {
        alias: "prioridade",
        base: 55,
        cap: 96,
        rules: [
          { sourceAlias: "urgencia", when: { operator: "in", value: ["antigo", "recente"] }, points: 15 },
          { sourceAlias: "dores", when: { operator: "countGte", value: 2 }, points: 12 },
          { sourceAlias: "compromisso", when: { operator: "equals", value: "alto" }, points: 10 }
        ]
      }
    },
    {
      id: id("ring"),
      type: "interstitial",
      position: { x: 0, y: 1080 },
      data: { kind: "ring", scoreRef: "prioridade" }
    },
    {
      id: id("trust"),
      type: "interstitial",
      position: { x: 0, y: 1200 },
      data: { kind: "trust" }
    },
    {
      id: id("compromisso"),
      type: "choice",
      position: { x: 0, y: 1320 },
      data: {
        alias: "compromisso",
        question: data.compromissoQ || DEFAULT_QUESTIONS.compromissoQ,
        options: data.compromisso.map((o) => opt(o.v, o.t, o.icon))
      }
    },
    {
      id: id("condition"),
      type: "condition",
      position: { x: 0, y: 1440 },
      data: {
        rules: [
          {
            sourceAlias: "compromisso",
            operator: "in",
            value: ["alto", "medio"],
            targetNodeId: id("terminalLead")
          }
        ],
        defaultNodeId: id("terminalDoubt")
      }
    },
    {
      id: id("terminalLead"),
      type: "terminalLead",
      position: { x: -140, y: 1560 },
      data: {
        metaEvent: data.eventos.leadQualificado,
        whatsappMessageTemplate: LEGACY_WHATSAPP_TEMPLATE,
        scoreAlias: "prioridade"
      }
    },
    {
      id: id("terminalDoubt"),
      type: "terminalDoubt",
      position: { x: 140, y: 1560 },
      data: { metaEvent: data.eventos.duvidaCapturada }
    }
  ];

  function edge(source: string, target: string, sourceHandle?: string): GraphEdge {
    return { id: `${source}->${target}${sourceHandle ? ":" + sourceHandle : ""}`, source, target, sourceHandle };
  }

  const edges: GraphEdge[] = [
    edge(id("start"), id("area")),
    edge(id("area"), id("situacao")),
    edge(id("situacao"), id("urgencia")),
    edge(id("urgencia"), id("aspiracao")),
    edge(id("aspiracao"), id("loading1")),
    edge(id("loading1"), id("honorarios")),
    edge(id("honorarios"), id("dores")),
    edge(id("dores"), id("score")),
    edge(id("score"), id("ring")),
    edge(id("ring"), id("trust")),
    edge(id("trust"), id("compromisso")),
    edge(id("compromisso"), id("condition")),
    edge(id("condition"), id("terminalLead"), "0"),
    edge(id("condition"), id("terminalDoubt"), "default")
  ];

  return { version: 1, nodes, edges };
}

export function toGraph(data: FunnelData): FunnelGraph {
  if (data.graph) return data.graph;
  return synthesizeLegacyGraph(data);
}
