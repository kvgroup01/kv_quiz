"use client";

// Painel lateral do editor de fluxo: edição completa de configurações que
// não cabem (ou não fazem sentido) direto no card do nó no canvas — tabela
// de regras de condição/pontuação, textos de tela intermediária, e o
// template de mensagem de WhatsApp com variáveis.

import { effectiveEdges, type GraphNode, type FunnelGraph, type CompareOperator, type ConditionRule, type ScoreRuleAdd, type InterstitialFact } from "@/lib/funnel-graph-schema";
import { NODE_TYPE_LABELS, newOption } from "./factory";

const OPERATORS: { v: CompareOperator; label: string }[] = [
  { v: "equals", label: "é igual a" },
  { v: "notEquals", label: "é diferente de" },
  { v: "in", label: "está entre (lista separada por vírgula)" },
  { v: "gte", label: "é maior ou igual a (número)" },
  { v: "lte", label: "é menor ou igual a (número)" },
  { v: "includesAny", label: "inclui algum de (lista, resposta múltipla)" },
  { v: "countGte", label: "quantidade marcada ≥ (resposta múltipla)" }
];

function valueToText(v: string | number | string[]): string {
  return Array.isArray(v) ? v.join(", ") : String(v);
}
function textToValue(text: string, operator: CompareOperator): string | number | string[] {
  if (operator === "gte" || operator === "lte" || operator === "countGte") {
    const n = Number(text.trim());
    return Number.isNaN(n) ? 0 : n;
  }
  if (operator === "in" || operator === "includesAny") {
    return text.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return text.trim();
}

function nodeLabel(n: GraphNode): string {
  if (n.type === "choice" || n.type === "multiChoice" || n.type === "score") return `${NODE_TYPE_LABELS[n.type]} · #${n.data.alias}`;
  return NODE_TYPE_LABELS[n.type];
}

// Onde cada bloco leva, só pra leitura — não editável aqui de propósito:
// criar/trocar conexão continua sendo coisa de arrastar no canvas (só
// funciona no computador). Isso existe pra quem está editando pelo celular
// não ficar sem noção de pra onde o fluxo vai a partir do bloco aberto.
function OutgoingInfo({ graph, node }: { graph: FunnelGraph; node: GraphNode }) {
  if (node.type === "terminalLead" || node.type === "terminalDoubt" || node.type === "condition") return null;
  const edges = effectiveEdges(graph).filter((e) => e.source === node.id);
  if (!edges.length) return null;
  const targetLabel = (id: string) => {
    const n = graph.nodes.find((x) => x.id === id);
    return n ? nodeLabel(n) : "?";
  };

  if (node.type === "choice") {
    const fallback = edges.find((e) => e.sourceHandle === undefined || e.sourceHandle === "default");
    return (
      <div className="b-field">
        <label>Vai para (arrastar conexão só no computador)</label>
        {node.data.options.map((o) => {
          const e = edges.find((e) => e.sourceHandle === o.id) || fallback;
          return <p key={o.id} className="b-graph-mobile-goto">{o.icon || "•"} {o.t || "(sem texto)"} → {e ? targetLabel(e.target) : "— nada ainda —"}</p>;
        })}
        {fallback && <p className="b-graph-mobile-goto">senão → {targetLabel(fallback.target)}</p>}
      </div>
    );
  }

  const e = edges[0];
  return (
    <div className="b-field">
      <label>Vai para (arrastar conexão só no computador)</label>
      <p className="b-graph-mobile-goto">→ {e ? targetLabel(e.target) : "— nada ainda —"}</p>
    </div>
  );
}

export default function Inspector({
  graph, node, onUpdate, onClose, mobile
}: { graph: FunnelGraph; node: GraphNode; onUpdate: (patch: Record<string, unknown>) => void; onClose: () => void; mobile?: boolean }) {
  const aliasNodes = graph.nodes.filter((n) => n.type === "choice" || n.type === "multiChoice" || n.type === "score") as Extract<GraphNode, { type: "choice" | "multiChoice" | "score" }>[];
  const scoreNodes = graph.nodes.filter((n) => n.type === "score") as Extract<GraphNode, { type: "score" }>[];
  const targetables = graph.nodes.filter((n) => n.id !== node.id);

  return (
    <div className={mobile ? "b-graph-mobile-panel" : "b-graph-inspector"}>
      <div className={mobile ? "b-graph-mobile-panel-head" : "b-graph-inspector-head"}>
        <strong>{NODE_TYPE_LABELS[node.type]}</strong>
        <button type="button" className="btn small" onClick={onClose}>{mobile ? "← Voltar" : "Fechar"}</button>
      </div>

      {node.type === "start" && <p className="b-help">Bloco de início do fluxo — sem nada pra configurar aqui.</p>}

      {(node.type === "choice" || node.type === "multiChoice") && (
        <>
          <div className="b-field">
            <label>Pergunta</label>
            <textarea value={node.data.question} onChange={(e) => onUpdate({ question: e.target.value })} />
          </div>
          <div className="b-field">
            <label>Apelido (usado em condições/mensagens)</label>
            <input value={node.data.alias} onChange={(e) => onUpdate({ alias: e.target.value })} />
          </div>
          <div className="b-field">
            <label>Nota abaixo da pergunta</label>
            <input value={node.data.note || ""} onChange={(e) => onUpdate({ note: e.target.value })} />
          </div>
          {!node.data.optionsFromArea && (
            <div className="b-field">
              <label>Opções</label>
              {node.data.options.map((o, i) => (
                <div key={o.id} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  <input style={{ width: 48 }} value={o.icon || ""} placeholder="🔹" onChange={(e) => {
                    const options = [...node.data.options]; options[i] = { ...o, icon: e.target.value }; onUpdate({ options });
                  }} />
                  <input style={{ flex: 1 }} value={o.t} placeholder="Escreva a opção" onChange={(e) => {
                    const options = [...node.data.options]; options[i] = { ...o, t: e.target.value }; onUpdate({ options });
                  }} />
                  <button type="button" className="b-opt-remove" onClick={() => onUpdate({ options: node.data.options.filter((_, idx) => idx !== i) })}>✕</button>
                </div>
              ))}
              <button type="button" className="b-add-opt" onClick={() => onUpdate({ options: [...node.data.options, newOption()] })}>+ opção</button>
            </div>
          )}
          {node.type === "choice" && (
            <div className="b-field">
              <label>Texto abaixo das opções (opcional)</label>
              <textarea value={node.data.footerNote || ""} onChange={(e) => onUpdate({ footerNote: e.target.value })} />
            </div>
          )}
          {node.type === "multiChoice" && (
            <div className="b-field">
              <label>Mínimo de opções marcadas</label>
              <input type="number" min={1} value={node.data.minSelected ?? 1} onChange={(e) => onUpdate({ minSelected: Number(e.target.value) || 1 })} />
            </div>
          )}
          {node.data.optionsFromArea && (
            <p className="b-help">As opções deste bloco vêm da área escolhida no início (herdado do funil clássico) — edite pela aba "Perguntas".</p>
          )}
        </>
      )}

      {node.type === "interstitial" && node.data.kind === "loading" && (
        <>
          <div className="b-field">
            <label>Duração (milissegundos)</label>
            <input type="number" value={node.data.durationMs ?? 2400} onChange={(e) => onUpdate({ durationMs: Number(e.target.value) || 2400 })} />
          </div>
          <div className="b-field">
            <label>Frases mostradas durante o carregamento</label>
            {(node.data.facts || []).map((f: InterstitialFact, i: number) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input style={{ width: 48 }} value={f.chip} onChange={(e) => {
                  const facts = [...(node.data.facts || [])]; facts[i] = { ...f, chip: e.target.value }; onUpdate({ facts });
                }} />
                <input style={{ flex: 1 }} value={f.t} onChange={(e) => {
                  const facts = [...(node.data.facts || [])]; facts[i] = { ...f, t: e.target.value }; onUpdate({ facts });
                }} />
                <button type="button" className="b-opt-remove" onClick={() => onUpdate({ facts: (node.data.facts || []).filter((_: InterstitialFact, idx: number) => idx !== i) })}>✕</button>
              </div>
            ))}
            <button type="button" className="b-add-opt" onClick={() => onUpdate({ facts: [...(node.data.facts || []), { chip: "💡", t: "" }] })}>+ frase</button>
          </div>
        </>
      )}
      {node.type === "interstitial" && node.data.kind === "ring" && (
        <div className="b-field">
          <label>Qual pontuação mostrar</label>
          <select value={node.data.scoreRef || ""} onChange={(e) => onUpdate({ scoreRef: e.target.value })}>
            <option value="">— escolha —</option>
            {scoreNodes.map((n) => <option key={n.id} value={n.data.alias}>#{n.data.alias}</option>)}
          </select>
        </div>
      )}
      {node.type === "interstitial" && node.data.kind === "trust" && (
        <>
          <div className="b-field">
            <label>Título (em branco usa o padrão)</label>
            <input value={node.data.title || ""} onChange={(e) => onUpdate({ title: e.target.value })} />
          </div>
          <div className="b-field">
            <label>Texto (em branco usa os 3 pontos padrão)</label>
            <textarea value={node.data.body || ""} onChange={(e) => onUpdate({ body: e.target.value })} />
          </div>
        </>
      )}

      {node.type === "score" && (
        <>
          <div className="b-field">
            <label>Apelido</label>
            <input value={node.data.alias} onChange={(e) => onUpdate({ alias: e.target.value })} />
          </div>
          <div className="b-field">
            <label>Pontuação base</label>
            <input type="number" value={node.data.base} onChange={(e) => onUpdate({ base: Number(e.target.value) || 0 })} />
          </div>
          <div className="b-field">
            <label>Limite máximo (opcional)</label>
            <input type="number" value={node.data.cap ?? ""} onChange={(e) => onUpdate({ cap: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
          <div className="b-field">
            <label>Regras de bônus</label>
            {node.data.rules.map((r: ScoreRuleAdd, i: number) => (
              <div key={i} className="b-graph-rule-editor">
                <select value={r.sourceAlias} onChange={(e) => {
                  const rules = [...node.data.rules]; rules[i] = { ...r, sourceAlias: e.target.value }; onUpdate({ rules });
                }}>
                  {aliasNodes.map((n) => <option key={n.id} value={n.data.alias}>#{n.data.alias}</option>)}
                </select>
                <select value={r.when.operator} onChange={(e) => {
                  const rules = [...node.data.rules]; rules[i] = { ...r, when: { ...r.when, operator: e.target.value as CompareOperator } }; onUpdate({ rules });
                }}>
                  {OPERATORS.map((op) => <option key={op.v} value={op.v}>{op.label}</option>)}
                </select>
                <input value={valueToText(r.when.value)} onChange={(e) => {
                  const rules = [...node.data.rules]; rules[i] = { ...r, when: { ...r.when, value: textToValue(e.target.value, r.when.operator) } }; onUpdate({ rules });
                }} />
                <span>+</span>
                <input type="number" style={{ width: 56 }} value={r.points} onChange={(e) => {
                  const rules = [...node.data.rules]; rules[i] = { ...r, points: Number(e.target.value) || 0 }; onUpdate({ rules });
                }} />
                <button type="button" className="b-opt-remove" onClick={() => onUpdate({ rules: node.data.rules.filter((_: ScoreRuleAdd, idx: number) => idx !== i) })}>✕</button>
              </div>
            ))}
            <button type="button" className="b-add-opt" onClick={() => onUpdate({
              rules: [...node.data.rules, { sourceAlias: aliasNodes[0]?.data.alias || "", when: { operator: "equals", value: "" }, points: 0 }]
            })}>+ regra</button>
          </div>
        </>
      )}

      {node.type === "condition" && (
        <div className="b-field">
          <label>Regras (a primeira que bater decide)</label>
          {node.data.rules.map((r: ConditionRule, i: number) => (
            <div key={i} className="b-graph-rule-editor">
              <select value={r.sourceAlias} onChange={(e) => {
                const rules = [...node.data.rules]; rules[i] = { ...r, sourceAlias: e.target.value }; onUpdate({ rules });
              }}>
                {aliasNodes.map((n) => <option key={n.id} value={n.data.alias}>#{n.data.alias}</option>)}
              </select>
              <select value={r.operator} onChange={(e) => {
                const rules = [...node.data.rules]; rules[i] = { ...r, operator: e.target.value as CompareOperator }; onUpdate({ rules });
              }}>
                {OPERATORS.map((op) => <option key={op.v} value={op.v}>{op.label}</option>)}
              </select>
              <input value={valueToText(r.value)} onChange={(e) => {
                const rules = [...node.data.rules]; rules[i] = { ...r, value: textToValue(e.target.value, r.operator) }; onUpdate({ rules });
              }} />
              <select value={r.targetNodeId} onChange={(e) => {
                const rules = [...node.data.rules]; rules[i] = { ...r, targetNodeId: e.target.value }; onUpdate({ rules });
              }}>
                {targetables.map((n) => <option key={n.id} value={n.id}>{nodeLabel(n)}</option>)}
              </select>
              <button type="button" className="b-opt-remove" onClick={() => onUpdate({ rules: node.data.rules.filter((_: ConditionRule, idx: number) => idx !== i) })}>✕</button>
            </div>
          ))}
          <button type="button" className="b-add-opt" onClick={() => onUpdate({
            rules: [...node.data.rules, { sourceAlias: aliasNodes[0]?.data.alias || "", operator: "equals", value: "", targetNodeId: targetables[0]?.id || node.id }]
          })}>+ regra</button>
          <div className="b-field" style={{ marginTop: 10 }}>
            <label>Senão (obrigatório)</label>
            <select value={node.data.defaultNodeId} onChange={(e) => onUpdate({ defaultNodeId: e.target.value })}>
              {targetables.map((n) => <option key={n.id} value={n.id}>{nodeLabel(n)}</option>)}
            </select>
          </div>
        </div>
      )}

      {(node.type === "terminalLead" || node.type === "terminalDoubt") && (
        <div className="b-field">
          <label>Nome do evento no Meta Ads</label>
          <input value={node.data.metaEvent} onChange={(e) => onUpdate({ metaEvent: e.target.value })} />
        </div>
      )}
      {node.type === "terminalLead" && (
        <>
          <div className="b-field">
            <label>Pontuação mostrada como "prioridade"</label>
            <select value={node.data.scoreAlias || ""} onChange={(e) => onUpdate({ scoreAlias: e.target.value || undefined })}>
              <option value="">nenhuma</option>
              {scoreNodes.map((n) => <option key={n.id} value={n.data.alias}>#{n.data.alias}</option>)}
            </select>
          </div>
          <div className="b-field">
            <label>Mensagem do WhatsApp</label>
            <textarea rows={6} value={node.data.whatsappMessageTemplate}
              onChange={(e) => onUpdate({ whatsappMessageTemplate: e.target.value })} />
            <div className="b-graph-chips">
              <span>inserir:</span>
              <button type="button" className="btn small" onClick={() => onUpdate({ whatsappMessageTemplate: node.data.whatsappMessageTemplate + "{{nome}}" })}>{"{{nome}}"}</button>
              {aliasNodes.map((n) => (
                <button key={n.id} type="button" className="btn small" onClick={() => onUpdate({ whatsappMessageTemplate: node.data.whatsappMessageTemplate + `{{${n.data.alias}}}` })}>
                  {`{{${n.data.alias}}}`}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <OutgoingInfo graph={graph} node={node} />
    </div>
  );
}
