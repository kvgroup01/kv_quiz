# Intake — Redesign do quiz do lead · Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revestir o quiz que o lead responde com a linguagem visual neutra do Intake, mantendo fluxo, perguntas, ordem, animações, Pixel/CAPI, APIs, KV e mensagem do WhatsApp exatamente como estão. Cada funil pode ter uma cor de destaque entre oito presets acessíveis.

**Architecture:** O quiz continua sendo renderizado por `lib/funnel-graph-engine.tsx` e pelos componentes compartilhados de `lib/funnel-engine-shared.tsx`. `app/quiz.css` passa a ser a única camada visual do quiz e lê os tokens de `app/tokens.css` sem alterar `app/globals.css`. A lógica pura de presets e progresso fica em `lib/quiz-theme.ts` e `lib/quiz-progress.ts`, coberta por `node:test` antes da implementação.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, CSS puro, Framer Motion já instalado, Vercel KV já existente. Testes: `node:test` + `tsx` já configurado no projeto.

**Spec:** `docs/superpowers/specs/2026-09-17-intake-redesign-quiz-lead-design.md` — lido por inteiro antes deste plano. O plano cita as classes e funções existentes nos arquivos inspecionados antes de escrever.

## Global Constraints

- `app/globals.css` e `components/ui/` são intocáveis nesta fase. Todo estilo novo do quiz vai para `app/quiz.css`.
- Não alterar APIs, Vercel KV, `lib/leads-store.ts`, Pixel/CAPI, `postJson`, `initMetaPixel`, `fireEvent`, payloads ou o formato/texto da mensagem e do link do WhatsApp.
- Não adicionar dependências ao projeto; usar somente bibliotecas e ferramentas já presentes.
- Não mudar perguntas, textos do funil, ordem das telas, regras de roteamento, score, duração das animações, captura de áudio ou comportamento de FAQ.
- O quiz não usa os primitivos de `components/ui/`. A marcação compartilhada pode receber classes/estrutura semântica novas, preservando handlers e estados.
- Fonte do quiz: apenas Inter. `app/layout.tsx` deve remover Inter Tight, Fraunces, Kalam e JetBrains Mono do link Google Fonts; o app interno não pode ser alterado.
- Tema continua sendo `.theme-light`/`.theme-dark` no `.quiz-page` (criado pelas páginas e pelo `PhonePreview`, NÃO pelo motor). Accent é `style={{ "--q-accent": hex }}` no `#app-shell`, que é o elemento raiz do motor — variável CSS herda pra baixo, então o efeito é o mesmo; ausência ou id desconhecido usa `roxo`.
- O progresso não exibe número: `.q-progress` é o primeiro filho de `#app-shell`, 3px, preenchido por `progressFor`.
- Loop obrigatório antes de cada commit: `npx tsc --noEmit` → `npm test` → `npm run build` → navegador em 1440px e 390px. Se o navegador não estiver disponível, não marcar a caixa visual, não fazer push e registrar no `docs/HANDOFF.md`.
- Critério de aceite obrigatório: nos previews de `default`, `salario-maternidade` e `salario-maternidade-avancada`, alta intenção chega ao WhatsApp com score 82% no caminho padrão do `default` e template completo; baixa intenção chega a “Pergunta recebida ✓”; sem erros de console e sem fonte além de Inter.
- Commits pequenos, em português, um por tarefa. Nunca fazer push antes da regressão visual final da Task 7.
- Antes de encerrar uma sessão, marcar as caixas realmente concluídas, escrever no topo de `docs/HANDOFF.md` “parei em / próximo / cuidado com” e commitar.

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `app/quiz.css` | reescrever | Paleta, casca, telas, estados e responsividade do quiz; sem variáveis antigas |
| `app/layout.tsx` | modificar | Carregar apenas Inter para o quiz e o app interno |
| `lib/funnel-schema.ts` | modificar | `FunnelConfig.accent?: AccentId`, campo aditivo |
| `lib/quiz-theme.ts` | criar | Oito presets e fallback de accent |
| `tests/quiz-theme.test.ts` | criar | Contraste/IDs/fallback dos presets |
| `lib/quiz-progress.ts` | criar | Progresso puro por grafo |
| `tests/quiz-progress.test.ts` | criar | Cadeia, ramo, terminal e desconhecido |
| `lib/funnel-graph-engine.tsx` | modificar | Accent no wrapper, barra de progresso, sem mudar fluxo |
| `lib/funnel-engine-shared.tsx` | modificar | Classes semânticas e parser `_ênfase_`, sem mudar handlers |
| `components/builder/SettingsDrawer.tsx` | modificar | Oito bolinhas de cor de destaque |
| `components/builder/PhonePreview.tsx` | manter | Herda accent do mesmo wrapper; nenhuma mudança necessária |
| `app/globals.css` | não alterar | Restrição explícita |
| `components/ui/` | não alterar | Restrição explícita |
| `app/api/`, `lib/funnels-store.ts`, `lib/leads-store.ts` | não alterar | Contratos de dados e integrações |

---

### Task 1: Presets de destaque e contrato aditivo do funil

**Files:**
- Create: `lib/quiz-theme.ts`, `tests/quiz-theme.test.ts`
- Modify: `lib/funnel-schema.ts`

**Interfaces:**
- Produces `AccentId`, `ACCENTS` e `accentHex(id?: string): string`.
- `FunnelConfig` ganha apenas `accent?: AccentId`; JSONs existentes continuam válidos.

- [x] **Step 1: Testes primeiro**

`tests/quiz-theme.test.ts`:

```ts
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
```

- [x] **Step 2: Rodar e ver falhar**

Run: `npm test` → falha porque `../lib/quiz-theme` ainda não existe. Não criar implementação antes de observar essa falha.

- [x] **Step 3: Implementar os presets**

`lib/quiz-theme.ts`:

```ts
export type AccentId = "roxo" | "azul" | "verde" | "petroleo" | "terracota" | "rosa" | "ambar" | "grafite";

export const ACCENTS: { id: AccentId; label: string; hex: string }[] = [
  { id: "roxo", label: "Roxo", hex: "#5645d4" },
  { id: "azul", label: "Azul", hex: "#2456c9" },
  { id: "verde", label: "Verde", hex: "#1a7f37" },
  { id: "petroleo", label: "Petróleo", hex: "#0f5c66" },
  { id: "terracota", label: "Terracota", hex: "#b5502c" },
  { id: "rosa", label: "Rosa", hex: "#b8236b" },
  { id: "ambar", label: "Âmbar", hex: "#9a5b00" },
  { id: "grafite", label: "Grafite", hex: "#37352f" },
];

export function accentHex(id?: string): string {
  return ACCENTS.find((accent) => accent.id === id)?.hex ?? ACCENTS[0].hex;
}
```

Em `lib/funnel-schema.ts`, importe `AccentId` e adicione na interface existente:

```ts
import type { AccentId } from "./quiz-theme";

export interface FunnelConfig {
  // campos atuais permanecem iguais
  accent?: AccentId;
}
```

- [ ] **Step 4: Verificar e commitar**

Run: `npx tsc --noEmit` → `npm test` → `npm run build`. Navegador: abrir `/quiz/default/preview` em 1440px e 390px e confirmar que o JSON antigo ainda renderiza sem mudança visível/erro. Se não houver navegador, deixar a validação visual desmarcada no HANDOFF.

```bash
git add lib/quiz-theme.ts tests/quiz-theme.test.ts lib/funnel-schema.ts
git commit -m "Adiciona presets de destaque sem quebrar funis existentes"
```

---

### Task 2: Progresso puro do grafo com testes TDD

**Files:**
- Create: `lib/quiz-progress.ts`, `tests/quiz-progress.test.ts`

**Interfaces:**
- Produces `progressFor(graph: FunnelGraph, currentId: string | null): number`, sempre entre `0` e `1`.
- Usa `effectiveEdges`, reconhece terminais e não altera o grafo.

- [x] **Step 1: Testes primeiro**

`tests/quiz-progress.test.ts`:

```ts
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
```

- [x] **Step 2: Rodar e ver falhar**

Run: `npm test` → falha por módulo inexistente `../lib/quiz-progress`.

- [x] **Step 3: Implementar BFS e caminho lateral**

`lib/quiz-progress.ts`:

```ts
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
      if (!distances.has(next)) { distances.set(next, distances.get(id)! + 1); queue.push(next); }
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
    canonical.push(next); seen.add(next); cursor = next;
    const type = byId.get(next)?.type;
    if (type === "terminalLead" || type === "terminalDoubt") break;
  }
  const canonicalIndex = canonical.indexOf(currentId);
  if (canonicalIndex >= 0) return canonical.length <= 1 ? 0 : canonicalIndex / (canonical.length - 1);

  const reverse = new Map<string, string[]>();
  for (const [source, targets] of adj) for (const target of targets) {
    if (!reverse.has(target)) reverse.set(target, []);
    reverse.get(target)!.push(source);
  }
  const terminalIds = graph.nodes.filter((node) => node.type === "terminalLead" || node.type === "terminalDoubt").map((node) => node.id);
  const toTerminal = new Map<string, number>();
  const queue = terminalIds.map((id) => { toTerminal.set(id, 0); return id; });
  while (queue.length) {
    const id = queue.shift()!;
    for (const previous of reverse.get(id) ?? []) if (!toTerminal.has(previous)) {
      toTerminal.set(previous, toTerminal.get(id)! + 1); queue.push(previous);
    }
  }
  const d = depth.get(currentId);
  const remaining = toTerminal.get(currentId);
  return d === undefined ? 0 : remaining === undefined ? 0.5 : d / (d + remaining);
}
```

- [ ] **Step 4: Verificar e commitar**

Run: `npx tsc --noEmit` → `npm test` → `npm run build`. Navegador: `/quiz/default/preview` em 1440px/390px deve continuar carregando; barra ainda será integrada na Task 3. Sem navegador, não marcar a verificação visual.

```bash
git add lib/quiz-progress.ts tests/quiz-progress.test.ts
git commit -m "Calcula progresso do quiz por caminho do grafo"
```

---

### Task 3: Accent, progresso e fonte na casca do motor

**Files:**
- Modify: `lib/funnel-graph-engine.tsx`, `app/layout.tsx`

**Interfaces:**
- `FunnelGraphEngine` mantém as props atuais e continua aceitando `previewMode`/`previewNodeId`.
- O motor NÃO cria `.quiz-page` (as páginas e o `PhonePreview` já criam). O motor aplica `--q-accent` em style no `#app-shell`.

- [x] **Step 1: Aplicar accent no `#app-shell`**

No topo de `lib/funnel-graph-engine.tsx`, adicione `import type { CSSProperties } from "react"` e `import { accentHex } from "./quiz-theme";`. Antes do `return` final, crie:

```tsx
const quizStyle = { "--q-accent": accentHex(data.config.accent) } as CSSProperties;
```

Troque somente a linha `<div id="app-shell">` por `<div id="app-shell" style={quizStyle}>`. Não crie nenhum `.quiz-page` dentro do motor: `/quiz/[slug]/page.tsx`, `/quiz/[slug]/preview/page.tsx` e `components/builder/PhonePreview.tsx` já envolvem o motor nesse wrapper com a classe de tema, e continuam assim. (Divergência do spec resolvida em 2026-09-17 — spec §5 atualizado.)

- [x] **Step 2: Barra de progresso como primeiro filho do shell**

Importe `progressFor` e substitua o cálculo local `visibleHistoryCount`/`progressPct` por:

```tsx
const progress = progressFor(graph, currentId);
```

No primeiro filho de `#app-shell`, antes de `#topbar`, renderize:

```tsx
<div className="q-progress" aria-hidden="true">
  <span style={{ width: `${progress * 100}%` }} />
</div>
```

Não manter `#progress-track`/`#progress-fill` no motor, pois são a barra antiga e o CSS novo deve controlar apenas `.q-progress`.

- [x] **Step 3: Remover fontes antigas do layout**

Em `app/layout.tsx`, mantenha `Inter` e remova as famílias antigas:

```tsx
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
/>
```

Não alterar imports CSS, metadata, idioma ou o body.

- [ ] **Step 4: Verificar e commitar**

Run: `npx tsc --noEmit` → `npm test` → `npm run build`. Navegador: abrir os três previews em 390px e 1440px; confirmar uma única casca central e barra fina sem número. Não marcar esta etapa visual sem navegador.

```bash
git add lib/funnel-graph-engine.tsx app/layout.tsx
git commit -m "Aplica accent e barra fina de progresso ao quiz"
```

---

### Task 4: Marcação semântica das telas compartilhadas

**Files:**
- Modify: `lib/funnel-engine-shared.tsx`, `lib/funnel-graph-engine.tsx`

**Interfaces:**
- Handlers, estados, props, payloads e textos de negócio permanecem iguais.
- Classes antigas do quiz (`hand`, `eyebrow`, `accent`, `screen`, `plain-q`, `plain-note`, `opt`, `chip`, `label`, `box`, `cta`, `field`, `doubt-box`, `faq`, `faq-item`, `mic-btn`, `audio-redo`, `demo-note`, `disclaimer`) recebem equivalentes `q-*` sem alteração de comportamento.

- [x] **Step 1: Parser e componentes pequenos**

Em `parseRich`, preserve `**negrito**` e troque apenas a emissão da ênfase simples:

```ts
export function parseRich(str: string): string {
  return String(str || "")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.+?)\*/g, '<em class="q-em">$1</em>')
    .replace(/_(.+?)_/g, '<strong class="q-em">$1</strong>');
}
```

Em `OptionRow`, preserve `selected`, `checkbox`, `onClick` e texto, alterando classes:

```tsx
<button type="button" className={"q-option" + (selected ? " selected" : "")} onClick={onClick}>
  <span className="q-option-emoji">{chip}</span>
  <span className="q-option-label">{label}</span>
  {checkbox && <span className="q-option-box">{selected ? "✓" : ""}</span>}
</button>
```

Troque as classes dos componentes `SingleSelect`, `LoadingScreen`, `RingScreen`, `LeadContactForm` e `DoubtCapture` conforme este mapa real, sem mover os handlers:

```text
screen       -> q-screen
plain-q      -> q-title
plain-note   -> q-note
opt-list     -> q-options
load-icon    -> q-loading-icon
load-track   -> q-loading-track
load-fill    -> q-loading-fill
load-status  -> q-loading-status
fact-card    -> q-fact
ring-wrap    -> q-ring
ring-label   -> q-ring-label
doubt-box    -> q-form-card
field        -> q-field
cta          -> q-btn q-btn-primary
mic-btn      -> q-audio-btn
recording    -> recording (estado preservado)
faq          -> q-faq
faq-item     -> q-faq-item
demo-note    -> q-demo-note
disclaimer   -> q-disclaimer
```

Os textos atuais de `LeadContactForm` e `DoubtCapture` ficam byte a byte iguais.

- [x] **Step 2: Hero e telas específicas do motor do grafo**

Em `lib/funnel-graph-engine.tsx`, substitua só classes de apresentação:

```tsx
<div className="q-hero-greeting">{data.hero.greeting}</div>
<h1 className="q-hero-title" dangerouslySetInnerHTML={{ __html: parseRich(data.hero.headline) }} />
<p className="q-hero-sub">{data.hero.subheadline}</p>
<div className="q-trust-chip">💬 <span dangerouslySetInnerHTML={{ __html: parseRich(data.hero.trustNote) }} /></div>
```

Mapeie também `q-card`, `q-eyebrow`, `q-result`, `q-priority`, `q-profile`, `q-insight`, `q-trust-list`, `q-trust-item`, `q-mark` e `q-oab` nos lugares atuais de `.q-card`, `.eyebrow`, `.result-banner`, `.badge-pill`, `.profile-card`, `.insight-row`, `.trust-list`, `.trust-item`, `.mark` e `.oab-tag`. Não remover nenhuma chamada a `LeadContactForm`, `DoubtCapture`, `interpolateTemplate`, `fireEvent` ou `buildLegacyShapedPayload`.

- [ ] **Step 3: Verificar e commitar**

Run: `npx tsc --noEmit` → `npm test` → `npm run build`. Navegador: os três previews em 390px e 1440px, verificando abertura, escolha única/múltipla, loading, anel, confiança, WhatsApp e dúvida. Sem navegador, não marcar a parte visual.

```bash
git add lib/funnel-engine-shared.tsx lib/funnel-graph-engine.tsx
git commit -m "Atualiza a marcação das telas do quiz sem alterar o fluxo"
```

---

### Task 5: Reescrever o CSS isolado do quiz

**Files:**
- Modify: `app/quiz.css`

**Interfaces:**
- Nenhuma classe antiga de `globals.css` pode ser reintroduzida. O arquivo usa apenas tokens existentes de `app/tokens.css` e variáveis `--q-*`.

- [x] **Step 1: Fundação de tema e variáveis**

Substitua o topo do arquivo por este bloco e mantenha o seletor `.quiz-page` como casca:

```css
.quiz-page{
  --q-bg:#fff; --q-surface:#f6f5f4; --q-hairline:#e5e3df;
  --q-ink:#1a1a1a; --q-ink-soft:#5d5b54; --q-ink-mute:#a4a097;
  --q-accent:#5645d4; --q-accent-tint:color-mix(in srgb, var(--q-accent) 12%, var(--q-bg));
  --q-on-accent:#fff; --q-error:#e03131;
  min-height:100vh; background:var(--q-bg); color:var(--q-ink);
  font-family:var(--font-ui); color-scheme:light;
}
.quiz-page.theme-dark{
  --q-bg:#191919; --q-surface:#202020; --q-hairline:#2f2f2f;
  --q-ink:#e6e6e6; --q-ink-soft:#9b9b9b; --q-ink-mute:#6f6f6f;
  --q-accent-tint:color-mix(in srgb, var(--q-accent) 22%, var(--q-bg));
  --q-error:#ff6b6b; color-scheme:dark;
}
*{ box-sizing:border-box; }
.quiz-page button,.quiz-page input,.quiz-page textarea{ font:inherit; }
.quiz-page button:focus-visible,.quiz-page input:focus-visible,.quiz-page textarea:focus-visible{ outline:2px solid var(--q-accent); outline-offset:2px; }
```

- [x] **Step 2: Casca, progresso e tipografia**

```css
.quiz-page #app-shell{ width:100%; max-width:480px; min-height:100vh; margin:0 auto; background:var(--q-bg); display:flex; flex-direction:column; }
.q-progress{ height:3px; width:100%; background:var(--q-hairline); flex:none; }
.q-progress span{ display:block; height:100%; background:var(--q-accent); transition:width .4s ease; }
.quiz-page #topbar{ display:flex; align-items:center; justify-content:space-between; min-height:42px; padding:16px 20px 0; }
.quiz-page #back-btn,.q-ghost{ border:0; background:transparent; color:var(--q-ink-soft); padding:8px 0; cursor:pointer; font-size:14px; }
.quiz-page #stage{ flex:1; padding:0 20px 16px; }
.q-screen{ padding:16px 0 28px; }
.q-hero-greeting{ color:var(--q-ink-soft); font-size:14px; margin:12px 0 10px; }
.q-hero-title{ margin:0; font-size:28px; line-height:1.12; letter-spacing:-.3px; font-weight:600; }
.q-hero-sub{ margin:12px 0 14px; color:var(--q-ink-soft); font-size:16px; line-height:1.45; }
.q-em{ color:var(--q-accent); font-weight:700; font-style:normal; }
.q-trust-chip{ display:inline-flex; gap:6px; align-items:center; padding:7px 10px; border-radius:6px; background:var(--q-accent-tint); color:var(--q-ink-soft); font-size:13px; }
.q-eyebrow{ margin:0 0 8px; color:var(--q-ink-mute); font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; }
.q-title{ margin:0 0 8px; color:var(--q-ink); font-size:22px; line-height:1.2; font-weight:600; }
.q-note{ margin:0 0 14px; color:var(--q-ink-soft); font-size:14px; line-height:1.45; }
```

- [x] **Step 3: Componentes visuais e estados**

```css
.q-card,.q-form-card,.q-result,.q-profile{ border-radius:20px; background:var(--q-surface); padding:18px; }
.q-card{ margin-top:18px; }
.q-card .q-title{ font-size:18px; }
.q-options{ display:flex; flex-direction:column; gap:8px; }
.q-option{ display:flex; align-items:center; gap:10px; width:100%; min-height:56px; padding:9px 10px; border:1px solid var(--q-hairline); border-radius:12px; background:var(--q-bg); color:var(--q-ink); text-align:left; cursor:pointer; }
.q-option.selected{ border:2px solid var(--q-accent); padding:8px 9px; background:var(--q-accent-tint); }
.q-option-emoji{ display:grid; place-items:center; width:36px; height:36px; flex:none; border-radius:8px; background:var(--q-surface); font-size:20px; }
.q-option-label{ flex:1; font-size:16px; line-height:1.25; }
.q-option-box{ display:grid; place-items:center; width:20px; height:20px; border:1px solid var(--q-hairline); border-radius:5px; color:#fff; font-size:13px; }
.q-option.selected .q-option-box{ border-color:var(--q-accent); background:var(--q-accent); }
.q-btn{ width:100%; min-height:44px; border-radius:8px; cursor:pointer; padding:10px 14px; font-size:16px; font-weight:600; }
.q-btn-primary{ border:1px solid var(--q-accent); background:var(--q-accent); color:var(--q-on-accent); }
.q-btn-secondary{ border:1px solid var(--q-hairline); background:transparent; color:var(--q-ink); }
.q-btn:disabled{ opacity:.45; cursor:not-allowed; }
.q-field{ display:flex; flex-direction:column; gap:6px; margin:0 0 12px; }
.q-field label{ color:var(--q-ink-mute); font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; }
.q-field input,.q-field textarea{ width:100%; min-height:44px; border:1px solid var(--q-hairline); border-radius:8px; background:var(--q-bg); color:var(--q-ink); padding:10px 12px; }
.q-field textarea{ min-height:104px; resize:vertical; }
.q-loading-icon{ display:grid; place-items:center; width:56px; height:56px; margin:16px auto; border-radius:50%; background:var(--q-surface); font-size:26px; }
.q-loading-track{ height:4px; overflow:hidden; border-radius:4px; background:var(--q-hairline); }
.q-loading-fill{ height:100%; background:var(--q-accent); }
.q-loading-status{ color:var(--q-ink-soft); font-size:13px; text-align:center; }
.q-fact{ display:flex; gap:10px; padding:12px 0; border-bottom:1px solid var(--q-hairline); color:var(--q-ink-soft); font-size:14px; line-height:1.4; opacity:0; transform:translateY(4px); transition:opacity .25s,transform .25s; }
.q-fact.show{ opacity:1; transform:none; }
.q-fact .chip{ flex:none; }
.q-ring{ display:grid; place-items:center; margin:12px auto; }
.q-ring svg{ max-width:100%; }
.q-ring-label{ color:var(--q-ink-soft); font-size:14px; line-height:1.45; text-align:center; }
.q-faq{ border-top:1px solid var(--q-hairline); }
.q-faq-item{ display:flex; flex-direction:column; gap:4px; padding:12px 0; border-bottom:1px solid var(--q-hairline); }
.q-faq-item b{ font-size:15px; }
.q-faq-item span{ color:var(--q-ink-soft); font-size:14px; line-height:1.4; }
.q-audio-btn{ min-height:40px; border:1px solid var(--q-hairline); border-radius:8px; background:transparent; color:var(--q-ink); padding:8px 12px; cursor:pointer; }
.q-audio-btn.recording{ border-color:var(--q-error); color:var(--q-error); }
.q-demo-note,.q-disclaimer{ color:var(--q-ink-mute); font-size:12px; line-height:1.45; }
.q-disclaimer{ margin:24px 0 0; }
```

- [ ] **Step 4: Verificar e commitar**

Run: `npx tsc --noEmit` → `npm test` → `npm run build`. Navegador: conferir claro/escuro e 1440px/390px nos três funis; confirmar que não existe sombra, raio antigo ou fonte antiga. Sem navegador, não marcar.

```bash
git add app/quiz.css
git commit -m "Reescreve a pele do quiz com tokens e presets"
```

---

### Task 6: Seletor de accent nas configurações do Construtor

**Files:**
- Modify: `components/builder/SettingsDrawer.tsx`

**Interfaces:**
- `SettingsDrawer` continua recebendo `active`, `onPatch`, `onSlugChange` e `onClose`.
- Clicar numa bolinha chama `cfg({ accent: id })`; `PhonePreview` não muda porque herda o estilo do motor.

- [x] **Step 1: Importar presets e renderizar seleção**

Adicione:

```tsx
import { ACCENTS } from "@/lib/quiz-theme";
```

Logo abaixo do bloco `.ui-pills` de Claro/Escuro, adicione:

```tsx
<h3 className="drawer-section">Cor de destaque</h3>
<div className="q-accent-picker" role="radiogroup" aria-label="Cor de destaque">
  {ACCENTS.map((accent) => (
    <button
      key={accent.id}
      type="button"
      style={{
        width: 28, height: 28, borderRadius: 9999, cursor: "pointer", background: accent.hex,
        border: (active.config.accent ?? "roxo") === accent.id ? "3px solid var(--c-ink)" : "3px solid transparent",
        boxShadow: "0 0 0 1px var(--c-hairline)"
      }}
      title={accent.label}
      aria-label={accent.label}
      aria-pressed={(active.config.accent ?? "roxo") === accent.id}
      onClick={() => cfg({ accent: accent.id })}
    />
  ))}
</div>
```

Estilo inline de propósito: o seletor vive no app interno, `app/globals.css` não muda neste sub-projeto e `quiz.css` não é carregado pela gaveta. O contêiner das bolinhas usa `style={{ display: "flex", gap: 8, flexWrap: "wrap" }}`. (Divergência de escopo resolvida em 2026-09-17.)

- [ ] **Step 2: Verificar e commitar**

Run: `npx tsc --noEmit` → `npm test` → `npm run build`. Navegador: `/builder` em 1440px e 390px; trocar as oito cores, conferir prévia imediata e persistência no localStorage/rascunho sem KV. Não marcar sem navegador.

```bash
git add components/builder/SettingsDrawer.tsx
git commit -m "Adiciona escolha de cor de destaque por funil"
```

---

### Task 7: Regressão obrigatória, aceite e handoff final

**Files:**
- Modify: `docs/HANDOFF.md`, este plano

**Interfaces:**
- Nenhuma mudança de runtime nesta tarefa.

- [x] **Step 1: Loop técnico final**

Run exatamente nesta ordem: `npx tsc --noEmit` → `npm test` → `npm run build`. O runner deve incluir os testes de `quiz-theme` e `quiz-progress`.

- [ ] **Step 2: Regressão dos três funis no navegador**

Em 390px, claro e escuro, abrir:

```text
/quiz/default/preview
/quiz/salario-maternidade/preview
/quiz/salario-maternidade-avancada/preview
```

Percorrer alta intenção até o formulário/link `wa.me`, confirmando no `default` score 82% e o template completo. Percorrer baixa intenção até “Pergunta recebida ✓”. Conferir barra crescendo, 100% no terminal, uma casca central de 480px, Inter apenas, sem erro de console. Repetir smoke em 1440px. Se não houver navegador, deixar esta caixa e as caixas visuais anteriores desmarcadas e registrar a limitação.

- [ ] **Step 3: Verificar Builder e telas internas sem alterar escopo**

Em 1440px e 390px, conferir `/builder` (accent e PhonePreview), `/`, `/kanban`, `/kanban/banco` e `/login`; confirmar que não houve diff em `app/globals.css`, `components/ui/` ou APIs. Sem navegador, não marcar.

- [ ] **Step 4: Marcar, escrever handoff e commitar**

Somente após as verificações realmente realizadas:

```markdown
## <data> · <quem>
- Parei em: plano `2026-09-17-intake-redesign-quiz-lead.md` concluído.
- Próximo: manutenção do Intake; `app/quiz.css` continua sendo a fonte visual do quiz.
- Cuidado com: APIs/KV/Pixel-CAPI e a mensagem do WhatsApp não foram alterados; `previewNodeId` continua restrito ao preview.
```

```bash
git add docs/HANDOFF.md docs/superpowers/plans/2026-09-17-intake-redesign-quiz-lead.md
git commit -m "Fecha o redesign visual do quiz do lead"
```

Só depois da regressão visual completa o push poderá ser considerado. Sem navegador, encerrar com handoff pendente e sem push.
