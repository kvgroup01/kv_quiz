import { effectiveEdges, type FunnelGraph } from "./funnel-graph-schema";

function adjacency(graph: FunnelGraph): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const edge of effectiveEdges(graph)) {
    if (!out.has(edge.source)) out.set(edge.source, []);
    const targets = out.get(edge.source)!;
    if (!targets.includes(edge.target)) targets.push(edge.target);
  }
  return out;
}

function distancesFrom(start: string, adj: Map<string, string[]>): Map<string, number> {
  const distances = new Map([[start, 0]]);
  const queue = [start];
  while (queue.length) {
    const id = queue.shift()!;
    for (const next of adj.get(id) ?? []) {
      if (!distances.has(next)) {
        distances.set(next, distances.get(id)! + 1);
        queue.push(next);
      }
    }
  }
  return distances;
}

export function progressFor(graph: FunnelGraph, currentId: string | null): number {
  if (!currentId) return 0;
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const start = graph.nodes.find((node) => node.type === "start");
  const adj = adjacency(graph);
  if (!start || !byId.has(currentId)) return 0;
  if (byId.get(currentId)?.type === "terminalLead" || byId.get(currentId)?.type === "terminalDoubt") return 1;

  const depth = distancesFrom(start.id, adj);
  const canonical: string[] = [start.id];
  const seen = new Set(canonical);
  let cursor = start.id;
  while (true) {
    const next = (adj.get(cursor) ?? []).find((id) => !seen.has(id));
    if (!next) break;
    canonical.push(next);
    seen.add(next);
    cursor = next;
    const type = byId.get(next)?.type;
    if (type === "terminalLead" || type === "terminalDoubt") break;
  }
  const canonicalIndex = canonical.indexOf(currentId);
  if (canonicalIndex >= 0) return canonical.length <= 1 ? 0 : canonicalIndex / (canonical.length - 1);

  const reverse = new Map<string, string[]>();
  for (const [source, targets] of adj) {
    for (const target of targets) {
      if (!reverse.has(target)) reverse.set(target, []);
      reverse.get(target)!.push(source);
    }
  }
  const terminalIds = graph.nodes
    .filter((node) => node.type === "terminalLead" || node.type === "terminalDoubt")
    .map((node) => node.id);
  const toTerminal = new Map<string, number>();
  const queue = terminalIds.map((id) => {
    toTerminal.set(id, 0);
    return id;
  });
  while (queue.length) {
    const id = queue.shift()!;
    for (const previous of reverse.get(id) ?? []) {
      if (!toTerminal.has(previous)) {
        toTerminal.set(previous, toTerminal.get(id)! + 1);
        queue.push(previous);
      }
    }
  }
  const d = depth.get(currentId);
  const remaining = toTerminal.get(currentId);
  return d === undefined ? 0 : remaining === undefined ? 0.5 : d / (d + remaining);
}
