import { effectiveEdges, type FunnelGraph, type GraphNode } from "./funnel-graph-schema";

export interface LayoutPos {
  x: number;
  y: number;
}

export interface LayoutResult {
  positions: Record<string, LayoutPos>;
  unreached: Set<string>;
  columns: string[][];
}

/** Layout por camadas, sempre da esquerda para a direita: coluna é a menor
 * distância do start pelas arestas que o motor realmente usa. Nós
 * inalcançáveis vão para uma coluna extra no fim. */
export function layoutLeftToRight(
  graph: FunnelGraph,
  size: (node: GraphNode) => { width: number; height: number },
  opts: { gapX?: number; gapY?: number } = {},
): LayoutResult {
  const gapX = opts.gapX ?? 80;
  const gapY = opts.gapY ?? 40;
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, string[]>();

  for (const edge of effectiveEdges(graph)) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    const targets = adjacency.get(edge.source)!;
    if (!targets.includes(edge.target)) targets.push(edge.target);
  }

  const depth = new Map<string, number>();
  const start = graph.nodes.find((node) => node.type === "start");
  if (start) {
    const queue = [start.id];
    depth.set(start.id, 0);
    while (queue.length) {
      const id = queue.shift()!;
      for (const next of adjacency.get(id) ?? []) {
        if (!depth.has(next) && byId.has(next)) {
          depth.set(next, depth.get(id)! + 1);
          queue.push(next);
        }
      }
    }
  }

  const columns: string[][] = [];
  for (const [id, column] of depth) {
    (columns[column] ??= []).push(id);
  }

  const unreached = new Set(
    graph.nodes.filter((node) => !depth.has(node.id)).map((node) => node.id),
  );
  if (unreached.size) columns.push([...unreached]);

  const positions: Record<string, LayoutPos> = {};
  let x = 0;
  for (const column of columns) {
    let y = 0;
    let columnWidth = 0;
    for (const id of column) {
      const dimensions = size(byId.get(id)!);
      positions[id] = { x, y };
      y += dimensions.height + gapY;
      columnWidth = Math.max(columnWidth, dimensions.width);
    }
    x += columnWidth + gapX;
  }

  return { positions, unreached, columns };
}
