import { effectiveEdges, type FunnelGraph } from "@/lib/funnel-graph-schema";

export interface GraphWarning {
  nodeId?: string;
  message: string;
  /** Bloqueante: impede salvar (hoje só alias duplicado — corromperia dado
   * de resposta). O resto é aviso, não trava o fluxo do usuário. */
  blocking?: boolean;
}

export function validateGraph(graph: FunnelGraph): GraphWarning[] {
  const warnings: GraphWarning[] = [];
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  const edges = effectiveEdges(graph);

  // aliases duplicados — bloqueante
  const aliasSeen = new Map<string, string>();
  for (const n of graph.nodes) {
    if (n.type === "choice" || n.type === "multiChoice" || n.type === "score") {
      const prev = aliasSeen.get(n.data.alias);
      if (prev && prev !== n.id) {
        warnings.push({ nodeId: n.id, message: `Apelido "${n.data.alias}" repetido em mais de um nó.`, blocking: true });
      } else {
        aliasSeen.set(n.data.alias, n.id);
      }
    }
  }

  // arestas apontando pra nó inexistente
  for (const e of edges) {
    if (!nodeIds.has(e.source)) warnings.push({ message: `Uma conexão sai de um nó que não existe mais.` });
    if (!nodeIds.has(e.target)) warnings.push({ nodeId: e.source, message: `Uma conexão leva a um nó que não existe mais.` });
  }

  // condição sem alvo válido pro "senão"
  for (const n of graph.nodes) {
    if (n.type === "condition" && !nodeIds.has(n.data.defaultNodeId)) {
      warnings.push({ nodeId: n.id, message: `Este bloco de condição não tem um destino "senão" válido.`, blocking: true });
    }
  }

  // nós órfãos (sem entrada), exceto o start
  const hasIncoming = new Set(edges.map((e) => e.target));
  for (const n of graph.nodes) {
    if (n.type !== "start" && !hasIncoming.has(n.id)) {
      warnings.push({ nodeId: n.id, message: "Este bloco nunca é alcançado por ninguém." });
    }
  }

  // opções de escolha única sem destino e sem aresta padrão de reserva
  for (const n of graph.nodes) {
    if (n.type !== "choice") continue;
    const outgoing = edges.filter((e) => e.source === n.id);
    const hasDefault = outgoing.some((e) => e.sourceHandle === undefined || e.sourceHandle === "default");
    const optionsWithoutEdge = n.data.options.filter((o) => !outgoing.some((e) => e.sourceHandle === o.id));
    if (optionsWithoutEdge.length && !hasDefault) {
      warnings.push({
        nodeId: n.id,
        message: `${optionsWithoutEdge.length} opção(ões) aqui não levam a lugar nenhum (sem conexão própria nem padrão).`
      });
    }
  }

  // alcançabilidade dos terminais a partir do start
  const start = graph.nodes.find((n) => n.type === "start");
  if (start) {
    const adj = new Map<string, string[]>();
    for (const e of edges) {
      if (!adj.has(e.source)) adj.set(e.source, []);
      adj.get(e.source)!.push(e.target);
    }
    const visited = new Set<string>();
    const stack = [start.id];
    while (stack.length) {
      const cur = stack.pop()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      for (const next of adj.get(cur) || []) stack.push(next);
    }
    const hasTerminal = graph.nodes.some(
      (n) => (n.type === "terminalLead" || n.type === "terminalDoubt") && visited.has(n.id)
    );
    if (!hasTerminal) {
      warnings.push({ message: "Nenhum caminho a partir do início chega a uma tela final (WhatsApp ou dúvida)." });
    }
  } else {
    warnings.push({ message: "Este fluxo não tem um bloco de início." });
  }

  return warnings;
}
