import { test } from "node:test";
import assert from "node:assert/strict";
import { layoutLeftToRight } from "../lib/graph-layout";
import type { FunnelGraph, GraphNode } from "../lib/funnel-graph-schema";

const size = () => ({ width: 100, height: 50 });

function g(nodes: [string, GraphNode["type"]][], edges: [string, string][]): FunnelGraph {
  return {
    version: 1,
    nodes: nodes.map(([id, type]) => ({
      id,
      type,
      position: { x: 0, y: 0 },
      data:
        type === "condition"
          ? { rules: [], defaultNodeId: "" }
          : type === "choice"
            ? { alias: id, question: "", options: [] }
            : {},
    })) as GraphNode[],
    edges: edges.map(([source, target]) => ({
      id: source + "-" + target,
      source,
      target,
    })),
  };
}

test("cadeia linear vira colunas crescentes em x, mesmo y", () => {
  const graph = g(
    [["start", "start"], ["a", "choice"], ["b", "choice"]],
    [["start", "a"], ["a", "b"]],
  );
  const { positions, columns } = layoutLeftToRight(graph, size);
  assert.deepEqual(columns, [["start"], ["a"], ["b"]]);
  assert.equal(positions.start.x, 0);
  assert.equal(positions.a.x, 180);
  assert.equal(positions.b.x, 360);
  assert.equal(positions.a.y, 0);
});

test("ramificação abre linhas paralelas na mesma coluna", () => {
  const graph = g(
    [["start", "start"], ["a", "choice"], ["x", "terminalLead"], ["y", "terminalDoubt"]],
    [["start", "a"], ["a", "x"], ["a", "y"]],
  );
  const { positions } = layoutLeftToRight(graph, size);
  assert.equal(positions.x.x, positions.y.x);
  assert.equal(positions.x.y, 0);
  assert.equal(positions.y.y, 90);
});

test("nó inalcançável vai pra última coluna e é marcado", () => {
  const graph = g(
    [["start", "start"], ["a", "choice"], ["orfao", "choice"]],
    [["start", "a"]],
  );
  const { positions, unreached, columns } = layoutLeftToRight(graph, size);
  assert.ok(unreached.has("orfao"));
  assert.equal(columns.length, 3);
  assert.equal(positions.orfao.x, 360);
});

test("condição usa os alvos das regras/default como arestas", () => {
  const graph = g(
    [["start", "start"], ["c", "condition"], ["x", "terminalLead"]],
    [["start", "c"]],
  );
  (graph.nodes[1].data as { defaultNodeId: string }).defaultNodeId = "x";
  const { columns } = layoutLeftToRight(graph, size);
  assert.deepEqual(columns, [["start"], ["c"], ["x"]]);
});
