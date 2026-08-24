"use client";

// Editor visual de fluxo: canvas de nós/arestas (estilo n8n/Typebot) sobre o
// @xyflow/react. Recebe o FunnelGraph já materializado (legado sintetizado
// ou salvo de verdade — ver toGraph() em funnel-graph-adapter.ts) e devolve
// a versão editada via onChange, do mesmo jeito que qualquer outro campo do
// builder passa por updateActive().

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  applyNodeChanges, applyEdgeChanges,
  type Node, type Edge, type Connection, type NodeChange, type EdgeChange
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { FunnelData } from "@/lib/funnel-schema";
import { effectiveEdges, type FunnelGraph, type GraphNode } from "@/lib/funnel-graph-schema";
import { nodeTypes } from "./nodes";
import Inspector from "./Inspector";
import { validateGraph } from "./validate";
import { ADDABLE_NODE_TYPES, NODE_TYPE_LABELS, blankNode } from "./factory";

// Largura/altura iniciais "chutadas" por tipo de nó. Sem isso, o xyflow só
// descobre o tamanho real depois de medir o DOM já renderizado (via
// ResizeObserver) — e em alguns ambientes (inclusive testes automatizados
// de navegador) esse observer nunca dispara, deixando os nós presos com
// `visibility:hidden` pra sempre. Chutar um tamanho aproximado de antemão
// evita depender dessa medição pro primeiro render/fitView funcionar.
function estimateSize(n: GraphNode): { width: number; height: number } {
  const width = n.type === "start" ? 110 : 240;
  let height = 90;
  if (n.type === "choice") height = 110 + n.data.options.length * 38 + (n.data.footerNote ? 40 : 0);
  else if (n.type === "multiChoice") height = 100 + n.data.options.length * 34;
  else if (n.type === "condition") height = 100 + n.data.rules.length * 34;
  else if (n.type === "start") height = 44;
  else if (n.type === "interstitial") height = 110;
  else if (n.type === "score" || n.type === "terminalLead" || n.type === "terminalDoubt") height = 100;
  return { width, height };
}

function toFlowNodes(graph: FunnelGraph, opts: {
  onUpdateNode: (id: string, patch: Record<string, unknown>) => void;
  onOpenInspector: (id: string) => void;
  onDeleteNode: (id: string) => void;
}): Node[] {
  return graph.nodes.map((n) => {
    const { width, height } = estimateSize(n);
    return {
      id: n.id,
      type: n.type,
      position: n.position,
      width,
      height,
      style: { width, height },
      data: {
        ...n.data,
        onUpdate: (patch: Record<string, unknown>) => opts.onUpdateNode(n.id, patch),
        onOpenInspector: () => opts.onOpenInspector(n.id),
        onDelete: () => opts.onDeleteNode(n.id)
      },
      deletable: n.type !== "start"
    };
  });
}

function toFlowEdges(graph: FunnelGraph): Edge[] {
  return effectiveEdges(graph).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    deletable: true,
    style: { stroke: "var(--purple-mid)", strokeWidth: 1.6 }
  }));
}

function GraphEditorInner({
  funnelData, graph, onChange
}: { funnelData: FunnelData; graph: FunnelGraph; onChange: (g: FunnelGraph) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addType, setAddType] = useState<string>(ADDABLE_NODE_TYPES[0]);

  const updateNode = useCallback((id: string, patch: Record<string, unknown>) => {
    onChange({
      ...graph,
      nodes: graph.nodes.map((n) => (n.id === id ? ({ ...n, data: { ...n.data, ...patch } } as GraphNode) : n))
    });
  }, [graph, onChange]);

  const deleteNode = useCallback((id: string) => {
    const node = graph.nodes.find((n) => n.id === id);
    if (!node || node.type === "start") return;
    onChange({
      ...graph,
      nodes: graph.nodes.filter((n) => n.id !== id),
      edges: graph.edges.filter((e) => e.source !== id && e.target !== id)
    });
    if (selectedId === id) setSelectedId(null);
  }, [graph, onChange, selectedId]);

  const flowNodes = useMemo(
    () => toFlowNodes(graph, { onUpdateNode: updateNode, onOpenInspector: setSelectedId, onDeleteNode: deleteNode }),
    [graph, updateNode, deleteNode]
  );
  const flowEdges = useMemo(() => toFlowEdges(graph), [graph]);
  const warnings = useMemo(() => validateGraph(graph), [graph]);

  function onNodesChange(changes: NodeChange[]) {
    // "select"/"dimensions" não são dado persistido — só posição (arrastar)
    // e remoção mudam o FunnelGraph de verdade. Sem esse filtro, clicar em
    // QUALQUER lugar de um nó (o que sempre gera um evento de seleção do
    // xyflow) reescrevia o grafo inteiro a partir do `graph` "congelado" no
    // fechamento desta função, apagando qualquer exclusão/edição que tivesse
    // acabado de acontecer no mesmo clique.
    const relevant = changes.filter((c) => c.type === "position" || c.type === "remove");
    if (!relevant.length) return;

    const filtered = relevant.filter((c) => {
      if (c.type === "remove") {
        const n = graph.nodes.find((x) => x.id === c.id);
        return n?.type !== "start";
      }
      return true;
    });
    if (!filtered.length) return;
    const positioned = applyNodeChanges(filtered, flowNodes);
    const removedIds = new Set(filtered.filter((c) => c.type === "remove").map((c) => c.id));
    onChange({
      ...graph,
      nodes: graph.nodes
        .filter((n) => !removedIds.has(n.id))
        .map((n) => {
          const moved = positioned.find((p) => p.id === n.id);
          return moved ? { ...n, position: moved.position } : n;
        }),
      edges: removedIds.size ? graph.edges.filter((e) => !removedIds.has(e.source) && !removedIds.has(e.target)) : graph.edges
    });
  }

  function onEdgesChange(changes: EdgeChange[]) {
    const removed = changes.filter((c) => c.type === "remove").map((c) => c.id);
    if (!removed.length) return;
    const removedSet = new Set(removed);
    // Arestas derivadas de nó "condition" não moram em graph.edges — remover
    // uma delas significa apagar a regra (ou trocar o "senão", o que não é
    // permitido: ele é obrigatório).
    const derived = effectiveEdges(graph).filter((e) => removedSet.has(e.id));
    let next = graph;
    for (const e of derived) {
      const node = next.nodes.find((n) => n.id === e.source);
      if (node?.type === "condition" && e.sourceHandle?.startsWith("rule_")) {
        const idx = Number(e.sourceHandle.slice(5));
        const updatedRules = node.data.rules.filter((_, i) => i !== idx);
        next = {
          ...next,
          nodes: next.nodes.map((n) =>
            n.id === node.id ? ({ ...n, data: { ...node.data, rules: updatedRules } } as GraphNode) : n
          )
        };
      }
    }
    onChange({ ...next, edges: next.edges.filter((e) => !removedSet.has(e.id)) });
  }

  function onConnect(connection: Connection) {
    if (!connection.source || !connection.target || connection.source === connection.target) return;
    const sourceNode = graph.nodes.find((n) => n.id === connection.source);
    if (!sourceNode || sourceNode.type === "terminalLead" || sourceNode.type === "terminalDoubt") return;

    if (sourceNode.type === "condition") {
      const handle = connection.sourceHandle || "default";
      if (handle === "default") {
        updateNode(sourceNode.id, { defaultNodeId: connection.target });
      } else if (handle.startsWith("rule_")) {
        const idx = Number(handle.slice(5));
        const rules = [...sourceNode.data.rules];
        if (rules[idx]) {
          rules[idx] = { ...rules[idx], targetNodeId: connection.target };
          updateNode(sourceNode.id, { rules });
        }
      }
      return;
    }

    const sourceHandle = connection.sourceHandle || undefined;
    const withoutOld = graph.edges.filter((e) => !(e.source === connection.source && e.sourceHandle === sourceHandle));
    onChange({
      ...graph,
      edges: [...withoutOld, { id: `${connection.source}-${sourceHandle || "default"}-${connection.target}-${Date.now()}`, source: connection.source, target: connection.target, sourceHandle }]
    });
  }

  function addNode() {
    const type = addType as GraphNode["type"];
    const fallbackTarget = graph.nodes.find((n) => n.type === "terminalDoubt")?.id || graph.nodes[0]?.id;
    const position = { x: 320, y: 80 + graph.nodes.length * 40 };
    const node = blankNode(type, position, fallbackTarget);
    onChange({ ...graph, nodes: [...graph.nodes, node] });
    setSelectedId(node.id);
  }

  const selectedNode = graph.nodes.find((n) => n.id === selectedId) || null;

  return (
    <div className="b-graph-shell">
      <div className="b-graph-main">
        <div className="b-graph-toolbar">
          <select value={addType} onChange={(e) => setAddType(e.target.value)}>
            {ADDABLE_NODE_TYPES.map((t) => <option key={t} value={t}>{NODE_TYPE_LABELS[t]}</option>)}
          </select>
          <button type="button" className="btn small" onClick={addNode}>+ Adicionar bloco</button>
        </div>
        {warnings.length > 0 && (
          <div className="b-graph-warnings">
            {warnings.map((w, i) => (
              <div key={i} className={"b-graph-warning" + (w.blocking ? " blocking" : "")}>
                {w.blocking ? "⛔" : "⚠️"} {w.message}
              </div>
            ))}
          </div>
        )}
        <div className="b-graph-canvas">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelectedId(n.id)}
            onPaneClick={() => setSelectedId(null)}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </div>
      </div>
      {selectedNode && (
        <Inspector
          graph={graph}
          node={selectedNode}
          onUpdate={(patch) => updateNode(selectedNode.id, patch)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

export default function GraphEditor(props: { funnelData: FunnelData; graph: FunnelGraph; onChange: (g: FunnelGraph) => void }) {
  return (
    <ReactFlowProvider>
      <GraphEditorInner {...props} />
    </ReactFlowProvider>
  );
}
