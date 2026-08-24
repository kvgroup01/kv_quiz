"use client";

// Componentes de nó do editor visual (@xyflow/react). Cada um recebe, além
// dos campos normais do tipo (ChoiceNodeData, ScoreNodeData, etc.), duas
// funções injetadas pelo GraphEditor ao montar o array de nós do xyflow:
// `onUpdate(patch)` (mescla um patch no `data` do nó) e `onOpenInspector()`
// (abre o painel lateral com a edição completa desse nó). Handles carregam
// `id` igual ao valor usado em GraphEdge.sourceHandle — arrastar de uma
// opção específica liga exatamente aquela opção ao próximo nó.

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { EditableText } from "@/components/EditableInline";
import type {
  ChoiceNodeData, MultiChoiceNodeData, InterstitialNodeData, ConditionNodeData,
  ScoreNodeData, TerminalLeadNodeData, TerminalDoubtNodeData, GraphOption
} from "@/lib/funnel-graph-schema";
import { newOption } from "./factory";

type WithActions<T> = T & { onUpdate: (patch: Partial<T>) => void; onOpenInspector: () => void; onDelete: () => void };

function NodeShell({
  icon, label, children, onOpenInspector, onDelete, deletable = true
}: { icon: string; label: string; children: React.ReactNode; onOpenInspector: () => void; onDelete: () => void; deletable?: boolean }) {
  return (
    <div className="b-graph-node">
      <div className="b-graph-node-header">
        <span>{icon} {label}</span>
        <span className="b-graph-node-actions">
          <button type="button" title="Configurações" onClick={onOpenInspector}>⚙️</button>
          {deletable && <button type="button" title="Excluir" onClick={onDelete}>✕</button>}
        </span>
      </div>
      <div className="b-graph-node-body">{children}</div>
    </div>
  );
}

function OptionRows({
  alias, options, onChange, withHandles
}: { alias: string; options: GraphOption[]; onChange: (opts: GraphOption[]) => void; withHandles: boolean }) {
  return (
    <div className="b-graph-opts">
      {options.map((o) => (
        <div key={o.id} className="b-graph-opt">
          <EditableText as="span" className="chip" value={o.icon || "🔹"} placeholder="🔹"
            onChange={(icon) => onChange(options.map((x) => (x.id === o.id ? { ...x, icon } : x)))} />
          <EditableText as="span" className="label" value={o.t} placeholder="Escreva a opção"
            onChange={(t) => onChange(options.map((x) => (x.id === o.id ? { ...x, t } : x)))} />
          <button type="button" className="b-opt-remove" onClick={() => onChange(options.filter((x) => x.id !== o.id))}>✕</button>
          {withHandles && (
            <Handle type="source" position={Position.Right} id={o.id} style={{ top: "auto", position: "static", transform: "none", background: "var(--purple-mid)" }} />
          )}
        </div>
      ))}
      <button type="button" className="b-add-opt" onClick={() => onChange([...options, newOption()])}>+ opção</button>
    </div>
  );
}

export function StartNodeView() {
  return (
    <div className="b-graph-node b-graph-node--start">
      <div className="b-graph-node-body" style={{ textAlign: "center" }}>▶ Início</div>
      <Handle type="source" position={Position.Right} id="default" />
    </div>
  );
}

export function ChoiceNodeView({ data }: NodeProps) {
  const d = data as unknown as WithActions<ChoiceNodeData>;
  return (
    <NodeShell icon="🔘" label="Escolha única" onOpenInspector={d.onOpenInspector} onDelete={d.onDelete}>
      <Handle type="target" position={Position.Left} />
      <div className="b-graph-alias">#{d.alias}</div>
      <EditableText as="p" className="b-graph-question" value={d.question} multiline
        onChange={(question) => d.onUpdate({ question })} />
      <OptionRows alias={d.alias} options={d.options} withHandles
        onChange={(options) => d.onUpdate({ options })} />
      <div className="b-graph-fallback">
        <span>senão →</span>
        <Handle type="source" position={Position.Right} id="default" style={{ position: "static", transform: "none" }} />
      </div>
    </NodeShell>
  );
}

export function MultiChoiceNodeView({ data }: NodeProps) {
  const d = data as unknown as WithActions<MultiChoiceNodeData>;
  return (
    <NodeShell icon="☑️" label="Múltipla escolha" onOpenInspector={d.onOpenInspector} onDelete={d.onDelete}>
      <Handle type="target" position={Position.Left} />
      <div className="b-graph-alias">#{d.alias}</div>
      <EditableText as="p" className="b-graph-question" value={d.question} multiline
        onChange={(question) => d.onUpdate({ question })} />
      <OptionRows alias={d.alias} options={d.options} withHandles={false}
        onChange={(options) => d.onUpdate({ options })} />
      <div className="b-graph-fallback">
        <span>continuar →</span>
        <Handle type="source" position={Position.Right} id="default" style={{ position: "static", transform: "none" }} />
      </div>
    </NodeShell>
  );
}

export function InterstitialNodeView({ data }: NodeProps) {
  const d = data as unknown as WithActions<InterstitialNodeData>;
  const KIND_LABEL: Record<InterstitialNodeData["kind"], string> = { loading: "Carregando", ring: "Pontuação (anel)", trust: "Confiança" };
  return (
    <NodeShell icon="⏳" label="Tela intermediária" onOpenInspector={d.onOpenInspector} onDelete={d.onDelete}>
      <Handle type="target" position={Position.Left} />
      <select value={d.kind} onChange={(e) => d.onUpdate({ kind: e.target.value as InterstitialNodeData["kind"] })}>
        {(Object.keys(KIND_LABEL) as InterstitialNodeData["kind"][]).map((k) => (
          <option key={k} value={k}>{KIND_LABEL[k]}</option>
        ))}
      </select>
      {d.kind === "ring" && <p className="b-graph-hint">mostra o valor de #{d.scoreRef || "?"}</p>}
      <Handle type="source" position={Position.Right} id="default" />
    </NodeShell>
  );
}

export function ConditionNodeView({ data }: NodeProps) {
  const d = data as unknown as WithActions<ConditionNodeData>;
  return (
    <NodeShell icon="🔀" label="Condição" onOpenInspector={d.onOpenInspector} onDelete={d.onDelete}>
      <Handle type="target" position={Position.Left} />
      {d.rules.length === 0 && <p className="b-graph-hint">nenhuma regra ainda — configure em ⚙️</p>}
      {d.rules.map((r, i) => (
        <div key={i} className="b-graph-rule-row">
          <span>{r.sourceAlias} {r.operator} {Array.isArray(r.value) ? r.value.join("/") : String(r.value)}</span>
          <Handle type="source" position={Position.Right} id={`rule_${i}`} style={{ position: "static", transform: "none" }} />
        </div>
      ))}
      <div className="b-graph-fallback">
        <span>senão →</span>
        <Handle type="source" position={Position.Right} id="default" style={{ position: "static", transform: "none" }} />
      </div>
    </NodeShell>
  );
}

export function ScoreNodeView({ data }: NodeProps) {
  const d = data as unknown as WithActions<ScoreNodeData>;
  return (
    <NodeShell icon="🎯" label="Pontuação" onOpenInspector={d.onOpenInspector} onDelete={d.onDelete}>
      <Handle type="target" position={Position.Left} />
      <div className="b-graph-alias">#{d.alias}</div>
      <p className="b-graph-hint">base {d.base}{d.cap ? `, limite ${d.cap}` : ""}, {d.rules.length} regra(s)</p>
      <Handle type="source" position={Position.Right} id="default" />
    </NodeShell>
  );
}

export function TerminalLeadNodeView({ data }: NodeProps) {
  const d = data as unknown as WithActions<TerminalLeadNodeData>;
  return (
    <NodeShell icon="✅" label="Fim: WhatsApp" onOpenInspector={d.onOpenInspector} onDelete={d.onDelete}>
      <Handle type="target" position={Position.Left} />
      <p className="b-graph-hint">evento: {d.metaEvent || "—"}</p>
      <p className="b-graph-hint">configure a mensagem em ⚙️</p>
    </NodeShell>
  );
}

export function TerminalDoubtNodeView({ data }: NodeProps) {
  const d = data as unknown as WithActions<TerminalDoubtNodeData>;
  return (
    <NodeShell icon="💬" label="Fim: dúvida" onOpenInspector={d.onOpenInspector} onDelete={d.onDelete}>
      <Handle type="target" position={Position.Left} />
      <p className="b-graph-hint">evento: {d.metaEvent || "—"}</p>
    </NodeShell>
  );
}

export const nodeTypes = {
  start: StartNodeView,
  choice: ChoiceNodeView,
  multiChoice: MultiChoiceNodeView,
  interstitial: InterstitialNodeView,
  condition: ConditionNodeView,
  score: ScoreNodeView,
  terminalLead: TerminalLeadNodeView,
  terminalDoubt: TerminalDoubtNodeView
};
