import { test } from "node:test";
import assert from "node:assert/strict";
import { ACCENTS, accentHex } from "../lib/quiz-theme";

test("expõe os oito presets aprovados", () => {
  assert.deepEqual(ACCENTS.map((accent) => accent.id), [
    "roxo", "azul", "verde", "petroleo", "terracota", "rosa", "ambar", "grafite"
  ]);
  assert.equal(new Set(ACCENTS.map((accent) => accent.hex)).size, 8);
});

test("fallback é roxo para ausência e id desconhecido", () => {
  assert.equal(accentHex(), "#5645d4");
  assert.equal(accentHex("nao-existe"), "#5645d4");
});

test("ids conhecidos retornam o hex correspondente", () => {
  assert.equal(accentHex("azul"), "#2456c9");
  assert.equal(accentHex("grafite"), "#37352f");
});
