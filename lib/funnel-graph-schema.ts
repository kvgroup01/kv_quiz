// Contrato de dados do editor visual de fluxo (estilo n8n/Typebot): nós numa
// tela ligados por arestas, em vez da sequência fixa de etapas do motor
// antigo (funnel-engine.tsx). É um formato ADITIVO — vive dentro de
// `FunnelData.graph` (funnel-schema.ts), opcional. Um funil sem `graph` é um
// funil "legado" e continua rodando no motor antigo; funnel-graph-adapter.ts
// sabe sintetizar um grafo equivalente a partir dele.

export type NodeType =
  | "start"
  | "choice"
  | "multiChoice"
  | "interstitial"
  | "condition"
  | "score"
  | "terminalLead"
  | "terminalDoubt";

export interface GraphOption {
  id: string;
  t: string;
  icon?: string;
}

export interface StartNodeData {}

export interface ChoiceNodeData {
  /** Apelido estável usado por outros nós (condição/score/template) pra se
   * referir à resposta desta pergunta — ex: "urgencia". Único no grafo. */
  alias: string;
  question: string;
  note?: string;
  /** Texto extra mostrado ABAIXO da lista de opções (ex: o card "💡 em
   * muitos casos..." que aparece hoje na etapa de honorários). */
  footerNote?: string;
  options: GraphOption[];
  /** Só usado em nós sintetizados a partir de funil legado: busca as opções
   * dinamicamente em `data.areas[respostaDoAlias].situacaoOpts/doresOpts`
   * em vez de usar `options` fixo. Grafos novos não precisam disso. */
  optionsFromArea?: "situacaoOpts" | "doresOpts";
  /** Idem, pro texto da pergunta (`situacaoQ`/`doresQ`). */
  questionFromArea?: "situacaoQ" | "doresQ";
}

export interface MultiChoiceNodeData {
  alias: string;
  question: string;
  note?: string;
  options: GraphOption[];
  minSelected?: number;
  optionsFromArea?: "situacaoOpts" | "doresOpts";
  questionFromArea?: "situacaoQ" | "doresQ";
}

export interface InterstitialFact {
  chip: string;
  t: string;
}

export interface InterstitialNodeData {
  kind: "loading" | "ring" | "trust";
  durationMs?: number;
  facts?: InterstitialFact[];
  /** ring: alias do nó `score` cujo valor mostrar. */
  scoreRef?: string;
  title?: string;
  body?: string;
}

export type CompareOperator =
  | "equals"
  | "notEquals"
  | "in"
  | "gte"
  | "lte"
  | "includesAny"
  | "countGte";

export interface ConditionRule {
  sourceAlias: string;
  operator: CompareOperator;
  value: string | number | string[];
  targetNodeId: string;
}

export interface ConditionNodeData {
  rules: ConditionRule[];
  /** Obrigatório: pra onde vai quando nenhuma regra bate. O editor não deixa
   * salvar uma condição sem isso — é o que evita o "beco sem saída" que
   * existia implicitamente no motor antigo. */
  defaultNodeId: string;
}

export interface ScoreRuleAdd {
  sourceAlias: string;
  when: { operator: CompareOperator; value: string | number | string[] };
  points: number;
}

export interface ScoreNodeData {
  alias: string;
  base: number;
  rules: ScoreRuleAdd[];
  cap?: number;
}

export interface TerminalLeadNodeData {
  metaEvent: string;
  /** Template com variáveis {{alias}} (e {{nome}} pro nome informado no
   * formulário) — substitui o buildWhatsAppMessage hardcoded de hoje. */
  whatsappMessageTemplate: string;
  scoreAlias?: string;
}

export interface TerminalDoubtNodeData {
  metaEvent: string;
}

export interface GraphNodeBase {
  id: string;
  position: { x: number; y: number };
}

export type GraphNode =
  | (GraphNodeBase & { type: "start"; data: StartNodeData })
  | (GraphNodeBase & { type: "choice"; data: ChoiceNodeData })
  | (GraphNodeBase & { type: "multiChoice"; data: MultiChoiceNodeData })
  | (GraphNodeBase & { type: "interstitial"; data: InterstitialNodeData })
  | (GraphNodeBase & { type: "condition"; data: ConditionNodeData })
  | (GraphNodeBase & { type: "score"; data: ScoreNodeData })
  | (GraphNodeBase & { type: "terminalLead"; data: TerminalLeadNodeData })
  | (GraphNodeBase & { type: "terminalDoubt"; data: TerminalDoubtNodeData });

export interface GraphEdge {
  id: string;
  source: string;
  /** Pra nós "choice": id da GraphOption. Pra "condition": id da regra, ou
   * "default". Ausente/"default": aresta única (multiChoice, score, start,
   * interstitial) ou aresta de fallback de um "choice". */
  sourceHandle?: string;
  target: string;
}

export interface FunnelGraph {
  version: 1;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type Answers = Record<string, string | string[] | number>;

function findNodeByAlias(
  graph: FunnelGraph,
  alias: string
): GraphNode | undefined {
  return graph.nodes.find((n) => {
    if (n.type === "choice" || n.type === "multiChoice" || n.type === "score") {
      return n.data.alias === alias;
    }
    return false;
  });
}

function labelFromOptions(options: GraphOption[], id: string | undefined | null): string {
  return options.find((o) => o.id === id)?.t || String(id ?? "");
}

/** Resolve {{alias}}/{{nome}} num template de mensagem usando as respostas
 * guardadas + os rótulos das opções do grafo (não o id bruto).
 *
 * `resolveOptions` é opcional e existe pra nós de escolha cujas opções não
 * vêm fixas em `data.options` (hoje, só os nós sintetizados de funil legado,
 * que buscam as opções em `data.areas[area escolhida]` em runtime — ver
 * `optionsFromArea` em funnel-graph-adapter.ts). Sem esse resolvedor, esses
 * nós têm `data.options` vazio e a interpolação cairia pro id bruto em vez
 * do rótulo. Quem chama de dentro do motor (que tem acesso ao FunnelData)
 * passa o resolvedor; grafos novos, feitos do zero no editor, não precisam
 * disso porque suas opções já vêm preenchidas em `data.options`. */
export function interpolateTemplate(
  template: string,
  answers: Answers,
  graph: FunnelGraph,
  nome?: string,
  resolveOptions?: (node: GraphNode) => GraphOption[]
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    if (key === "nome") return nome || "";
    const node = findNodeByAlias(graph, key);
    const raw = answers[key];
    if (!node || raw === undefined) return "";
    if (node.type === "choice") {
      const options = resolveOptions ? resolveOptions(node) : node.data.options;
      return labelFromOptions(options, raw as string);
    }
    if (node.type === "multiChoice") {
      const options = resolveOptions ? resolveOptions(node) : node.data.options;
      const arr: string[] = Array.isArray(raw) ? raw : [String(raw)];
      return arr.map((v) => labelFromOptions(options, v)).join(", ");
    }
    return String(raw);
  });
}

function compareValue(
  operator: CompareOperator,
  actual: string | string[] | number | undefined,
  expected: string | number | string[]
): boolean {
  switch (operator) {
    case "equals":
      return actual === expected;
    case "notEquals":
      return actual !== expected;
    case "in":
      return Array.isArray(expected) && typeof actual !== "undefined" && expected.includes(actual as string);
    case "gte":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "lte":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    case "includesAny":
      return (
        Array.isArray(actual) &&
        Array.isArray(expected) &&
        actual.some((v) => (expected as string[]).includes(v))
      );
    case "countGte":
      return Array.isArray(actual) && typeof expected === "number" && actual.length >= expected;
    default:
      return false;
  }
}

export function evalCondition(
  rule: { sourceAlias: string; operator: CompareOperator; value: string | number | string[] },
  answers: Answers
): boolean {
  return compareValue(rule.operator, answers[rule.sourceAlias], rule.value);
}

export function computeGraphScore(node: { data: ScoreNodeData }, answers: Answers): number {
  let score = node.data.base;
  for (const rule of node.data.rules) {
    if (compareValue(rule.when.operator, answers[rule.sourceAlias], rule.when.value)) {
      score += rule.points;
    }
  }
  if (typeof node.data.cap === "number") score = Math.min(score, node.data.cap);
  return score;
}
