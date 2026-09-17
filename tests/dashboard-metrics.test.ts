import { test } from "node:test";
import assert from "node:assert/strict";
import { greeting, inPeriod, pendingDoubts, countByTipo, countByFunnel, timeAgo } from "../lib/dashboard-metrics";
import type { Lead } from "../lib/lead-schema";

const now = new Date("2026-09-17T15:00:00");
function lead(p: Partial<Lead>): Lead {
  return {
    id: p.id ?? Math.random().toString(36).slice(2), criadoEm: p.criadoEm ?? now.toISOString(), funil: p.funil ?? "default",
    status: p.status ?? "novo", tipo: p.tipo ?? "duvida", area: "", situacao: "", urgencia: "", dores: [], compromisso: "",
    nome: p.nome ?? "x", whatsapp: "", perguntaTexto: null, perguntaAudioBase64: null, perguntaAudioMime: null, utm: {}
  };
}

test("greeting por hora", () => {
  assert.equal(greeting(8), "Bom dia");
  assert.equal(greeting(12), "Boa tarde");
  assert.equal(greeting(18), "Boa noite");
  assert.equal(greeting(23), "Boa noite");
});

test("inPeriod: mês, 7 dias, hoje", () => {
  assert.equal(inPeriod("2026-09-01T00:00:00", "month", now), true);
  assert.equal(inPeriod("2026-08-31T23:59:59", "month", now), false);
  assert.equal(inPeriod("2026-09-11T00:00:00", "7d", now), true);
  assert.equal(inPeriod("2026-09-09T00:00:00", "7d", now), false);
  assert.equal(inPeriod("2026-09-17T00:30:00", "today", now), true);
  assert.equal(inPeriod("2026-09-16T23:30:00", "today", now), false);
});

test("pendingDoubts: só dúvidas na coluna de entrada, mais recente primeiro", () => {
  const leads = [
    lead({ id: "a", tipo: "duvida", status: "novo", criadoEm: "2026-09-17T10:00:00" }),
    lead({ id: "b", tipo: "duvida", status: "respondido" }),
    lead({ id: "c", tipo: "qualificado", status: "novo" }),
    lead({ id: "d", tipo: "duvida", status: "novo", criadoEm: "2026-09-17T12:00:00" })
  ];
  assert.deepEqual(pendingDoubts(leads, "novo").map((l) => l.id), ["d", "a"]);
});

test("countByTipo e countByFunnel", () => {
  const leads = [lead({ tipo: "qualificado", funil: "a" }), lead({ tipo: "duvida", funil: "a" }), lead({ tipo: "duvida", funil: "b" })];
  assert.deepEqual(countByTipo(leads), { qualificado: 1, duvida: 2 });
  assert.deepEqual(countByFunnel(leads), [{ funil: "a", count: 2 }, { funil: "b", count: 1 }]);
});

test("timeAgo", () => {
  assert.equal(timeAgo("2026-09-17T14:59:40", now), "agora");
  assert.equal(timeAgo("2026-09-17T14:55:00", now), "há 5 min");
  assert.equal(timeAgo("2026-09-17T13:00:00", now), "há 2 h");
  assert.equal(timeAgo("2026-09-14T15:00:00", now), "há 3 d");
});
