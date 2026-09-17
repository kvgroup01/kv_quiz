import { test } from "node:test";
import assert from "node:assert/strict";
import { progressFor } from "../lib/quiz-progress";
import type { FunnelGraph, GraphNode } from "../lib/funnel-graph-schema";

function graph(ids: string[], edges: [string, string][]): FunnelGraph {
  const nodes = ids.map((id, index) => ({
    id,
    type: id.startsWith("lead") ? "terminalLead" : id.startsWith("doubt") ? "terminalDoubt" : index === 0 ? "start" : "choice",
    position: { x: 0, y: 0 },
    data: id.startsWith("lead") ? { metaEvent: "Lead", whatsappMessageTemplate: "ok" } : id.startsWith("doubt") ? { metaEvent: "Contact" } : index === 0 ? {} : { alias: id, question: id, options: [] },
  })) as unknown as GraphNode[];
  return { version: 1, nodes, edges: edges.map(([source, target]) => ({ id: source + "-" + target, source, target })) };
}

test("cadeia linear divide o caminho em posições proporcionais", () => {
  const g = graph(["start", "a", "b", "lead"], [["start", "a"], ["a", "b"], ["b", "lead"]]);
  assert.equal(progressFor(g, null), 0);
  assert.equal(progressFor(g, "a"), 1 / 3);
  assert.equal(progressFor(g, "b"), 2 / 3);
  assert.equal(progressFor(g, "lead"), 1);
});

test("ramo lateral usa profundidade e menor distância até terminal", () => {
  const g = graph(["start", "a", "lateral", "lead"], [["start", "a"], ["a", "lateral"], ["a", "lead"], ["lateral", "lead"]]);
  assert.equal(progressFor(g, "lateral"), 2 / 3);
});

test("terminal é 1 e nó desconhecido é 0", () => {
  const g = graph(["start", "lead"], [["start", "lead"]]);
  assert.equal(progressFor(g, "lead"), 1);
  assert.equal(progressFor(g, "nao-existe"), 0);
});
