# Intake — Redesign do app interno · Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir o app interno (Início, Construtor, Leads, Histórico, Login) sobre os tokens do Notion com a linguagem visual de dashboard aprovada, unificando o Construtor num editor só (mapa horizontal + editor + prévia ao vivo) e trocando "salvar rascunho/publicar" por autosave + status + um botão — sem tocar no comportamento do quiz do lead.

**Architecture:** Camada de tokens CSS (`app/tokens.css`) + sete primitivos em `components/ui/` + telas reconstruídas sobre eles. Lógica nova (layout do grafo, métricas da home) vive em `lib/` como funções puras testadas com `node:test`. O CSS do quiz é isolado em `app/quiz.css` antes de qualquer outra mudança.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, CSS puro, `@xyflow/react` 12 (já instalado), Vercel KV. Teste: `node:test` + `tsx` (única devDependency nova).

**Spec:** `docs/superpowers/specs/2026-09-17-intake-redesign-app-interno-design.md` — leia antes de começar. O plano argumenta a partir dele.

## Global Constraints

- Nome do produto em todo o app interno: **Intake**. Rotas inalteradas: `/`, `/builder`, `/kanban`, `/kanban/banco`, `/login`.
- Nenhuma dependência de runtime nova. Única devDependency nova: `tsx`.
- CSS puro com variáveis. Botões/inputs raio **8px**, cards **20px**, badges/pílulas **9999px**, chips de tag **6px**. Roxo `#5645d4` só no CTA dominante da tela.
- Fonte do app interno: **Inter**. Fontes do quiz (Inter Tight, Fraunces, Kalam, JetBrains Mono) permanecem carregadas, usadas só pelo quiz.
- App interno só em tema claro. O tema por funil do quiz (`config.theme`) não muda.
- `app/quiz.css` não recebe mudança de estilo além do movimento `body → .quiz-page` da Task 2.
- Loop de verificação por tarefa: `npx tsc --noEmit` → `npm test` (quando houver teste) → `npm run build` → navegador (1440px e 390px via emulação do Chrome DevTools). Servidor dev: `npm run dev` em `http://localhost:3000`.
- **Critério de aceite obrigatório ao final:** passada completa em `/quiz/<slug>/preview` nos três funis (`default`, `salario-maternidade`, `salario-maternidade-avancada`) com telas, score, ramificação e texto do WhatsApp idênticos a antes.
- Commits pequenos, mensagem em português explicando o porquê, com o rodapé de atribuição em uso na sessão.
- **Handoff:** ao encerrar uma sessão de trabalho, marque as caixas concluídas aqui, escreva a entrada em `docs/HANDOFF.md` e commite.

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `AGENTS.md`, `CLAUDE.md`, `docs/HANDOFF.md` | criar | documentação de entrada e protocolo de handoff |
| `package.json` | modificar | devDep `tsx`, script `test` |
| `tests/*.test.ts` | criar | testes das funções puras |
| `app/quiz.css` | criar (mover) | tudo que o quiz do lead usa (linhas 1–385 do `globals.css` atual) |
| `app/tokens.css` | criar | variáveis do Notion |
| `app/globals.css` | reescrever | reset + primitivos + shell + telas internas |
| `app/layout.tsx` | modificar | título Intake, fonte Inter, importa `quiz.css` |
| `components/ui/{Card,Button,Badge,PillTabs,Stat,DataTable,PageHeader}.tsx` | criar | primitivos |
| `components/AppNav.tsx` | reescrever | marca + pílulas |
| `components/ThemeToggle.tsx` | apagar | — |
| `components/leads-ui.tsx` | modificar | card compacto, modal restilizado |
| `lib/dashboard-metrics.ts` | criar | saudação, período, contagens, "há X" |
| `components/dashboard/Dashboard.tsx` | criar | tela Início (client) |
| `app/page.tsx` | reescrever | renderiza `Dashboard` |
| `app/login/page.tsx` | modificar | restyle |
| `app/kanban/page.tsx`, `app/kanban/banco/page.tsx` | modificar | restyle, `DataTable` no histórico |
| `lib/graph-layout.ts` | criar | `layoutLeftToRight` |
| `app/builder/graph/GraphEditor.tsx`, `nodes.tsx`, `Inspector.tsx` | modificar | layout automático, zoom, seleção exposta, compacto |
| `lib/funnel-graph-engine.tsx` | modificar | prop `previewNodeId` |
| `app/api/funnels/route.ts` | modificar (aditivo) | devolve também `publishedAt` por slug |
| `components/builder/PhonePreview.tsx`, `SettingsDrawer.tsx` | criar | prévia e configurações |
| `app/builder/page.tsx` | reescrever | cabeçalho, autosave, status, 3 colunas |
| `lib/funnel-engine.tsx` | apagar | motor antigo sem uso |
| `README.md` | reescrever | estado atual |

---

### Task 1: Documentação de entrada, protocolo de handoff e runner de testes

**Files:**
- Create: `AGENTS.md`, `CLAUDE.md`, `docs/HANDOFF.md`, `tests/smoke.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: script `npm test` que roda `tsx --test tests/**/*.test.ts`; convenção de handoff usada por todas as tarefas seguintes.

- [x] **Step 1: Instalar `tsx` e criar o script de teste**

Run: `npm install --save-dev tsx`

Em `package.json`, dentro de `"scripts"`, adicione:

```json
"test": "tsx --test tests/**/*.test.ts"
```

- [x] **Step 2: Criar um teste de fumaça pra provar o runner**

`tests/smoke.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";

test("runner funciona", () => {
  assert.equal(1 + 1, 2);
});
```

Run: `npm test`
Expected: `✔ runner funciona` e `pass 1`.

- [x] **Step 3: Escrever `AGENTS.md`**

```markdown
# Intake — guia pra quem chega agora (humano ou agente)

## O que é
Ferramenta pra gestor de tráfego construir quizzes de pré-triagem que rodam em anúncios.
O lead responde no celular; quem está pronto vai pro WhatsApp do profissional com um
resumo; quem só tem dúvida cai num Kanban pra ser respondido depois. Serve qualquer
profissional (nasceu com advogados; o código ainda tem nomes "jurídico" em alguns lugares).

## Mapa
- `app/quiz/[slug]` — o quiz PUBLICADO que o lead responde. `…/preview` — o rascunho.
- `lib/funnel-graph-engine.tsx` — motor que interpreta o grafo do funil (nós + arestas).
- `lib/funnel-graph-schema.ts` — tipos do grafo. `lib/funnel-graph-adapter.ts` — sintetiza
  um grafo a partir de funis antigos (formato plano) sem migração.
- `lib/funnel-schema.ts` — `FunnelData` (conteúdo do funil). `content/funnels/*.json` — funis
  bundlados (fallback quando não há KV).
- `lib/funnels-store.ts` — rascunho/publicado no Vercel KV (`draft:<slug>`, `published:<slug>`).
- `lib/leads-store.ts` + `lib/lead-schema.ts` — leads no KV. `lib/kanban-columns-store.ts` — colunas.
- `app/builder` — Construtor (mapa do fluxo em `app/builder/graph/`).
- `app/kanban` — Leads (mês corrente). `app/kanban/banco` — Histórico por mês.
- `app/api/*` — rotas serverless (lead, conversion, draft, publish, funnels, leads, kanban/columns, login).
- `middleware.ts` + `lib/auth.ts` — login por cookie pro Kanban (Edge Runtime: use Web Crypto).
- `components/ui/` — primitivos visuais. `app/tokens.css` — variáveis de design. `app/quiz.css` —
  CSS do quiz (NÃO mexer sem spec próprio).

## Convenções
- CSS puro com variáveis. Sem dependência nova sem motivo forte. Sem tema escuro no app interno.
- Verificação antes de commitar: `npx tsc --noEmit` → `npm test` → `npm run build` → navegador
  (1440px e 390px). Cliques por script às vezes não disparam blur/foco de verdade no ambiente de
  automação — quando algo "não salva", teste com clique real antes de caçar bug.
- Sem KV local, Kanban/Início ficam vazios e autosave mostra "Não salvo (sem KV)". É esperado.
- Commits pequenos, em português, explicando o porquê.

## Como rodar
`npm install` · `npm run dev` → http://localhost:3000 · `npm test` · `npm run build`

## Onde está o trabalho
- Specs: `docs/superpowers/specs/`. Planos com checkboxes: `docs/superpowers/plans/`.
- `docs/HANDOFF.md`: última entrada no topo diz onde paramos e o que vem depois.

## Protocolo de handoff (obrigatório)
Antes de encerrar: (1) marque as caixas concluídas no plano ativo; (2) escreva uma entrada
datada no topo de `docs/HANDOFF.md` com "parei em / próximo / cuidado com"; (3) commite.
Ao retomar: leia este arquivo, depois `docs/HANDOFF.md`, depois o plano apontado por ele.
Não refaça o que está marcado. Se o plano não bater com o código, registre a divergência no
HANDOFF em vez de improvisar.
```

- [x] **Step 4: Criar `CLAUDE.md` e `docs/HANDOFF.md`**

`CLAUDE.md`:

```markdown
@AGENTS.md
```

`docs/HANDOFF.md`:

```markdown
# Handoff

Entrada mais recente no topo. Formato: data · quem · parei em · próximo · cuidado com.

## 2026-09-17 · Claude
- Parei em: Task 1 do plano `docs/superpowers/plans/2026-09-17-intake-redesign-app-interno.md` concluída.
- Próximo: Task 2 (isolar CSS do quiz em `app/quiz.css`).
- Cuidado com: nada ainda.
```

- [x] **Step 5: Verificar e commitar**

Run: `npm test && npx tsc --noEmit`
Expected: teste passa, tsc limpo.

```bash
git add AGENTS.md CLAUDE.md docs/HANDOFF.md tests/smoke.test.ts package.json package-lock.json
git commit -m "Docs de entrada, protocolo de handoff e runner de testes (node:test + tsx)"
```

---

### Task 2: Isolar o CSS do quiz e criar a camada de tokens

**Files:**
- Create: `app/quiz.css`, `app/tokens.css`
- Modify: `app/globals.css`, `app/layout.tsx`, e o `<div>` raiz de `app/page.tsx`, `app/builder/page.tsx`, `app/kanban/page.tsx`, `app/kanban/banco/page.tsx`, `app/login/page.tsx`

**Interfaces:**
- Produces: variáveis CSS `--c-*`, `--font-ui`, `--r-*`, `--sh-modal` usadas por todas as tarefas seguintes; classe `.in-app` (wrapper do app interno) e `.in-container` (1280px / gutter 32px → 16px no celular).

- [x] **Step 1: Mover as linhas 1–385 do `globals.css` para `app/quiz.css`**

Run (PowerShell):

```powershell
Get-Content app/globals.css -TotalCount 385 | Set-Content -Encoding utf8 app/quiz.css
Get-Content app/globals.css | Select-Object -Skip 385 | Set-Content -Encoding utf8 app/globals.tmp
Move-Item -Force app/globals.tmp app/globals.css
```

Confira que `app/quiz.css` começa em `:root{` e termina no bloco `.demo-note{ ... }` (linha ~385), e que `app/globals.css` agora começa em `/* ---------- builder ---------- */`.

- [x] **Step 2: Em `app/quiz.css`, escopar o que era `body` pra `.quiz-page`**

Localize:

```css
*{box-sizing:border-box;}
html, body{ padding:0; margin:0; }
body{
  background:var(--bg);
  color:var(--ink);
  font-family:"Inter Tight", sans-serif;
  min-height:100vh;
}
```

Substitua por (o reset sai daqui e vai pro `globals.css` no Step 4):

```css
.quiz-page{
  color:var(--ink);
  font-family:"Inter Tight", sans-serif;
}
```

(`.quiz-page` já define `background:var(--bg)` e `min-height:100vh` mais abaixo no mesmo arquivo — não duplique.) Se o bloco `@media (prefers-reduced-motion: reduce){...}` estiver em `quiz.css`, remova-o daqui — ele passa a viver só no `globals.css`.

- [x] **Step 3: Criar `app/tokens.css`**

```css
/* Tokens do app interno (Intake). Fonte: NOTION DESIGN.md. Prefixo --c- evita colisão
   com as variáveis do quiz (--bg, --ink, ...), que continuam existindo em quiz.css. */
:root{
  --c-canvas:#ffffff;
  --c-surface:#f6f5f4;
  --c-surface-soft:#fafaf9;
  --c-hairline:#e5e3df;
  --c-hairline-soft:#ede9e4;
  --c-hairline-strong:#c8c4be;

  --c-ink:#1a1a1a;
  --c-charcoal:#37352f;
  --c-slate:#5d5b54;
  --c-steel:#787671;
  --c-stone:#a4a097;
  --c-muted:#bbb8b1;

  --c-primary:#5645d4;
  --c-primary-pressed:#4534b3;
  --c-on-primary:#ffffff;

  --c-success:#1aae39;
  --c-warning:#dd5b00;
  --c-error:#e03131;

  --c-tint-lavender:#e6e0f5;
  --c-tint-peach:#ffe8d4;
  --c-tint-mint:#d9f3e1;
  --c-tint-rose:#fde0ec;
  --c-tint-gray:#f0eeec;
  --c-purple-800:#391c57;
  --c-orange-deep:#793400;

  --font-ui:"Inter", -apple-system, system-ui, "Segoe UI", Helvetica, sans-serif;

  --r-tag:6px;
  --r-btn:8px;
  --r-input:8px;
  --r-card:20px;
  --r-pill:9999px;

  --sh-modal:rgba(15,15,15,0.16) 0 16px 48px -8px;
  --sh-card-hover:rgba(15,15,15,0.06) 0 2px 8px;
}
```

- [x] **Step 4: Cabeçalho novo do `globals.css`**

No topo do `app/globals.css` (antes do que sobrou), insira:

```css
@import "./tokens.css";

*{box-sizing:border-box;}
html, body{ padding:0; margin:0; }
body{ min-height:100vh; }
@media (prefers-reduced-motion: reduce){
  *{transition-duration:0.001ms !important; animation-duration:0.001ms !important;}
}

/* Wrapper de toda tela interna. color-scheme:light neutraliza o "color-scheme:dark" que
   quiz.css põe no :root quando o sistema do visitante é escuro — sem isso, inputs e
   scrollbars do app interno escureceriam sozinhos. */
.in-app{
  min-height:100vh;
  color:var(--c-ink);
  color-scheme:light;
  font-family:var(--font-ui);
  background:linear-gradient(180deg, var(--c-tint-lavender) 0%, #f4f2fa 220px, var(--c-canvas) 560px);
}
.in-container{ max-width:1280px; margin:0 auto; padding:0 32px; }
@media (max-width:720px){ .in-container{ padding:0 16px; } }
```

- [x] **Step 5: `app/layout.tsx` — Inter, título, importar `quiz.css`**

```tsx
import type { Metadata } from "next";
import "./quiz.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Intake",
  description: "Pré-triagem de leads de anúncio: quem está pronto vai pro WhatsApp, quem tem dúvida cai no Kanban."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@400;500;600;700&family=Fraunces:ital,wght@1,500&family=Kalam:wght@400;700&family=JetBrains+Mono:wght@500&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

- [x] **Step 6: Envolver as telas internas em `.in-app`**

Em `app/page.tsx`, `app/kanban/page.tsx`, `app/kanban/banco/page.tsx`, `app/login/page.tsx`: o `<div>` mais externo do retorno ganha `className="in-app"`. Em `app/builder/page.tsx` o `<div className="b-shell">` vira `className="in-app b-shell"`. O quiz (`app/quiz/**`) **não** ganha.

- [ ] **Step 7: Verificar — regressão do quiz e app ainda funcional**

Run: `npx tsc --noEmit && npm run build`
Expected: limpo.

Navegador: `/quiz/default/preview`, `/quiz/salario-maternidade/preview`, `/quiz/salario-maternidade-avancada/preview` — percorra do início ao fim (alta e baixa intenção). Compare com o que era: mesmas telas, fonte Inter Tight no quiz, cores/tema iguais. Depois abra `/`, `/builder`, `/kanban`: devem continuar funcionando (feios/mistos é aceitável nesta tarefa; quebrados não).

- [x] **Step 8: Commit**

```bash
git add app/quiz.css app/tokens.css app/globals.css app/layout.tsx app/page.tsx app/builder/page.tsx app/kanban/page.tsx app/kanban/banco/page.tsx app/login/page.tsx
git commit -m "Isola o CSS do quiz em quiz.css e cria a camada de tokens do app interno"
```

---

### Task 3: Primitivos de UI

**Files:**
- Create: `components/ui/Card.tsx`, `components/ui/Button.tsx`, `components/ui/Badge.tsx`, `components/ui/PillTabs.tsx`, `components/ui/Stat.tsx`, `components/ui/DataTable.tsx`, `components/ui/PageHeader.tsx`
- Modify: `app/globals.css` (seção nova `/* ---------- ui: primitivos ---------- */`)

**Interfaces:**
- Produces (usados por todas as telas):
  - `Card({ title?, subtitle?, action?, className?, children })`
  - `Button({ variant?: "primary"|"dark"|"secondary"|"ghost", size?: "md"|"sm", iconOnly?, href?, target?, ...ButtonHTMLAttributes })` — com `href` renderiza `<a>`/`<Link>`
  - `Badge({ tone?: "purple"|"orange"|"green"|"gray"|"red", children })`
  - `PillTabs({ items: {id,label,href?}[], active, onChange?, ariaLabel? })`
  - `Stat({ value, label, hint? })`
  - `DataTable<T extends {id:string}>({ columns: {key,label,render?,width?}[], rows, onRowClick?, emptyText })` — vira cards empilhados abaixo de 768px
  - `PageHeader({ title, subtitle?, actions? })`

- [x] **Step 1: `components/ui/Card.tsx`**

```tsx
import type { ReactNode } from "react";

export function Card({
  title, subtitle, action, className = "", children
}: { title?: string; subtitle?: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={"ui-card " + className}>
      {(title || action) && (
        <header className="ui-card-head">
          <div>
            {title && <h2 className="ui-card-title">{title}</h2>}
            {subtitle && <p className="ui-card-sub">{subtitle}</p>}
          </div>
          {action && <div className="ui-card-action">{action}</div>}
        </header>
      )}
      <div className="ui-card-body">{children}</div>
    </section>
  );
}
```

- [x] **Step 2: `components/ui/Button.tsx`**

```tsx
import Link from "next/link";
import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from "react";

type Variant = "primary" | "dark" | "secondary" | "ghost";
type Size = "md" | "sm";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  variant?: Variant;
  size?: Size;
  iconOnly?: boolean;
  href?: string;
  target?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  children: ReactNode;
};

export function Button({ variant = "secondary", size = "md", iconOnly, href, target, className = "", onClick, children, ...rest }: Props) {
  const cls = `ui-btn ui-btn-${variant} ui-btn-${size}${iconOnly ? " ui-btn-icon" : ""} ${className}`;
  if (href) {
    const external = href.startsWith("http") || target === "_blank";
    return external
      ? <a className={cls} href={href} target={target} rel="noopener" onClick={onClick}>{children}</a>
      : <Link className={cls} href={href} onClick={onClick}>{children}</Link>;
  }
  return <button type="button" className={cls} onClick={onClick} {...rest}>{children}</button>;
}
```

- [x] **Step 3: `components/ui/Badge.tsx`**

```tsx
import type { ReactNode } from "react";

export type BadgeTone = "purple" | "orange" | "green" | "gray" | "red";

export function Badge({ tone = "gray", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`ui-badge ui-badge-${tone}`}>{children}</span>;
}
```

- [x] **Step 4: `components/ui/PillTabs.tsx`**

```tsx
import Link from "next/link";

export interface PillItem { id: string; label: string; href?: string }

export function PillTabs({
  items, active, onChange, ariaLabel
}: { items: PillItem[]; active: string; onChange?: (id: string) => void; ariaLabel?: string }) {
  return (
    <nav className="ui-pills" aria-label={ariaLabel}>
      {items.map((it) => {
        const cls = "ui-pill" + (it.id === active ? " active" : "");
        return it.href
          ? <Link key={it.id} href={it.href} className={cls}>{it.label}</Link>
          : <button key={it.id} type="button" className={cls} onClick={() => onChange?.(it.id)}>{it.label}</button>;
      })}
    </nav>
  );
}
```

- [x] **Step 5: `components/ui/Stat.tsx` e `components/ui/PageHeader.tsx`**

`components/ui/Stat.tsx`:

```tsx
export function Stat({ value, label, hint }: { value: number | string; label: string; hint?: string }) {
  return (
    <div className="ui-stat">
      <span className="ui-stat-value">{value}</span>
      <span className="ui-stat-label">{label}</span>
      {hint && <span className="ui-stat-hint">{hint}</span>}
    </div>
  );
}
```

`components/ui/PageHeader.tsx`:

```tsx
import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="ui-page-head">
      <div>
        <h1 className="ui-page-title">{title}</h1>
        {subtitle && <p className="ui-page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="ui-page-actions">{actions}</div>}
    </header>
  );
}
```

- [x] **Step 6: `components/ui/DataTable.tsx`**

```tsx
import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  width?: string;
}

export function DataTable<T extends { id: string }>({
  columns, rows, onRowClick, emptyText
}: { columns: Column<T>[]; rows: T[]; onRowClick?: (row: T) => void; emptyText: string }) {
  if (!rows.length) return <p className="ui-table-empty">{emptyText}</p>;
  return (
    <table className="ui-table">
      <thead>
        <tr>
          {columns.map((c) => <th key={c.key} style={c.width ? { width: c.width } : undefined}>{c.label}</th>)}
          {onRowClick && <th aria-hidden style={{ width: 32 }} />}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className={onRowClick ? "clickable" : ""} onClick={onRowClick ? () => onRowClick(row) : undefined}>
            {columns.map((c) => (
              <td key={c.key} data-label={c.label}>{c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}</td>
            ))}
            {onRowClick && <td className="ui-table-chevron" aria-hidden>›</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [x] **Step 7: CSS dos primitivos (`app/globals.css`, seção nova no fim)**

```css
/* ---------- ui: primitivos ---------- */
.ui-card{ background:var(--c-canvas); border:1px solid var(--c-hairline); border-radius:var(--r-card); padding:24px; }
.ui-card-head{ display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:16px; }
.ui-card-title{ font-size:22px; font-weight:600; line-height:1.3; margin:0; letter-spacing:-0.2px; }
.ui-card-sub{ font-size:14px; color:var(--c-slate); margin:4px 0 0; }
.ui-card-action{ flex-shrink:0; }

.ui-btn{
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  font-family:var(--font-ui); font-size:14px; font-weight:500; line-height:1.3;
  border-radius:var(--r-btn); border:1px solid transparent; cursor:pointer; text-decoration:none;
  transition:background .15s, border-color .15s, opacity .15s; white-space:nowrap;
}
.ui-btn-md{ padding:10px 18px; min-height:40px; }
.ui-btn-sm{ padding:6px 12px; min-height:32px; font-size:13px; }
.ui-btn-icon.ui-btn-md{ width:40px; padding:0; }
.ui-btn-icon.ui-btn-sm{ width:32px; padding:0; }
.ui-btn-primary{ background:var(--c-primary); color:var(--c-on-primary); }
.ui-btn-primary:hover{ background:var(--c-primary-pressed); }
.ui-btn-dark{ background:#000; color:#fff; }
.ui-btn-secondary{ background:transparent; color:var(--c-ink); border-color:var(--c-hairline-strong); }
.ui-btn-secondary:hover{ background:var(--c-surface); }
.ui-btn-ghost{ background:transparent; color:var(--c-ink); }
.ui-btn-ghost:hover{ background:var(--c-surface); }
.ui-btn[disabled]{ opacity:.45; cursor:not-allowed; }
.ui-btn:focus-visible{ outline:2px solid var(--c-primary); outline-offset:2px; }

.ui-badge{ display:inline-flex; align-items:center; font-size:12px; font-weight:600; line-height:1.4; padding:2px 8px; border-radius:var(--r-tag); white-space:nowrap; }
.ui-badge-gray{ background:var(--c-tint-gray); color:var(--c-slate); }
.ui-badge-purple{ background:var(--c-tint-lavender); color:var(--c-purple-800); }
.ui-badge-orange{ background:var(--c-tint-peach); color:var(--c-orange-deep); }
.ui-badge-green{ background:var(--c-tint-mint); color:#0e6b24; }
.ui-badge-red{ background:#fde3e3; color:#8a1c1c; }

.ui-pills{ display:flex; gap:6px; flex-wrap:wrap; }
.ui-pill{
  font-family:var(--font-ui); font-size:14px; font-weight:500; padding:8px 16px; border-radius:var(--r-pill);
  border:1px solid var(--c-hairline); background:transparent; color:var(--c-steel); cursor:pointer; text-decoration:none;
  transition:background .15s, color .15s;
}
.ui-pill:hover{ background:var(--c-surface); color:var(--c-ink); }
.ui-pill.active{ background:#000; border-color:#000; color:#fff; }

.ui-stat{ display:flex; flex-direction:column; gap:2px; }
.ui-stat-value{ font-size:36px; font-weight:600; line-height:1.1; letter-spacing:-0.5px; font-variant-numeric:tabular-nums; }
.ui-stat-label{ font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--c-stone); }
.ui-stat-hint{ font-size:13px; color:var(--c-slate); }

.ui-page-head{ display:flex; align-items:flex-end; justify-content:space-between; gap:16px; flex-wrap:wrap; padding:36px 0 24px; }
.ui-page-title{ font-size:36px; font-weight:600; line-height:1.2; letter-spacing:-0.5px; margin:0; }
.ui-page-sub{ font-size:16px; color:var(--c-slate); margin:6px 0 0; }
.ui-page-actions{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
@media (max-width:720px){ .ui-page-head{ padding:24px 0 16px; } .ui-page-title{ font-size:28px; } }

.ui-table{ width:100%; border-collapse:collapse; font-size:14px; }
.ui-table th{ text-align:left; font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--c-stone); padding:10px 12px; background:var(--c-surface-soft); }
.ui-table th:first-child{ border-radius:8px 0 0 8px; } .ui-table th:last-child{ border-radius:0 8px 8px 0; }
.ui-table td{ padding:14px 12px; border-bottom:1px solid var(--c-hairline-soft); vertical-align:middle; }
.ui-table tr:last-child td{ border-bottom:none; }
.ui-table tr.clickable{ cursor:pointer; } .ui-table tr.clickable:hover td{ background:var(--c-surface-soft); }
.ui-table-chevron{ color:var(--c-stone); text-align:right; font-size:18px; }
.ui-table-empty{ color:var(--c-slate); font-size:14px; padding:24px 0; text-align:center; }
@media (max-width:768px){
  .ui-table thead{ display:none; }
  .ui-table, .ui-table tbody, .ui-table tr, .ui-table td{ display:block; width:100%; }
  .ui-table tr{ border:1px solid var(--c-hairline); border-radius:12px; padding:10px 12px; margin-bottom:8px; }
  .ui-table td{ display:flex; justify-content:space-between; gap:12px; padding:6px 0; border:none; }
  .ui-table td::before{ content:attr(data-label); font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--c-stone); }
  .ui-table-chevron{ display:none; }
}
```

- [ ] **Step 8: Verificar e commitar**

Run: `npx tsc --noEmit`
Expected: limpo (os componentes ainda não são usados; isso é ok).

```bash
git add components/ui app/globals.css
git commit -m "Primitivos de UI do Intake (Card, Button, Badge, PillTabs, Stat, DataTable, PageHeader)"
```

---

### Task 4: Casca do app — nav em pílulas, marca Intake, login

**Files:**
- Modify: `components/AppNav.tsx`, `app/login/page.tsx`, `app/globals.css`, e a prop `current` em `app/page.tsx`, `app/kanban/page.tsx`, `app/kanban/banco/page.tsx`
- Delete: `components/ThemeToggle.tsx`

**Interfaces:**
- Consumes: `PillTabs`, `Button`, `Card`.
- Produces: `AppNav({ current: "inicio" | "builder" | "leads" | "historico" })` — **as chaves mudaram** (`painel→inicio`, `kanban→leads`, `banco→historico`).

- [ ] **Step 1: Reescrever `components/AppNav.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { PillTabs } from "@/components/ui/PillTabs";

const ITEMS = [
  { id: "inicio", label: "Início", href: "/" },
  { id: "builder", label: "Construtor", href: "/builder" },
  { id: "leads", label: "Leads", href: "/kanban" },
  { id: "historico", label: "Histórico", href: "/kanban/banco" }
];

export type NavKey = "inicio" | "builder" | "leads" | "historico";

export default function AppNav({ current }: { current: NavKey }) {
  const [open, setOpen] = useState(false);
  return (
    <nav className="app-nav">
      <div className="in-container app-nav-bar">
        <Link href="/" className="app-nav-brand">Intake</Link>
        <div className="app-nav-links"><PillTabs items={ITEMS} active={current} ariaLabel="Seções" /></div>
        <button type="button" className="app-nav-burger" onClick={() => setOpen((v) => !v)} aria-label="Menu">{open ? "✕" : "☰"}</button>
      </div>
      {open && (
        <div className="in-container app-nav-drawer">
          {ITEMS.map((it) => (
            <Link key={it.id} href={it.href} className={"ui-pill" + (it.id === current ? " active" : "")} onClick={() => setOpen(false)}>{it.label}</Link>
          ))}
        </div>
      )}
    </nav>
  );
}
```

- [ ] **Step 2: Atualizar as chamadas existentes**

`app/page.tsx`: `current="inicio"` · `app/kanban/page.tsx`: `current="leads"` · `app/kanban/banco/page.tsx`: `current="historico"` · `app/builder/page.tsx`: `current="builder"` (já é).

- [ ] **Step 3: Apagar `components/ThemeToggle.tsx`**

Run: `git rm components/ThemeToggle.tsx`. Depois `grep -rn ThemeToggle --include=*.tsx .` deve não retornar nada (o `AppNav` novo não o importa mais).

- [ ] **Step 4: CSS da nav (substitui a seção `/* ---------- navegação ---------- */` inteira e o bloco responsivo `.app-nav-*`)**

```css
/* ---------- navegação ---------- */
.app-nav{ background:transparent; }
.app-nav-bar{ display:flex; align-items:center; gap:24px; padding-top:16px; padding-bottom:8px; }
.app-nav-brand{ font-weight:600; font-size:20px; letter-spacing:-0.3px; color:var(--c-ink); text-decoration:none; }
.app-nav-links{ flex:1; }
.app-nav-burger{ display:none; margin-left:auto; border:1px solid var(--c-hairline); background:var(--c-canvas); color:var(--c-ink); border-radius:var(--r-btn); font-size:18px; width:40px; height:40px; cursor:pointer; }
.app-nav-drawer{ display:none; flex-direction:column; gap:6px; padding-bottom:12px; }
@media (max-width:720px){
  .app-nav-links{ display:none; }
  .app-nav-burger{ display:block; }
  .app-nav-drawer{ display:flex; }
}
```

- [ ] **Step 5: Login — `app/login/page.tsx`**

Mantenha toda a lógica que já existe (estados, `fetch("/api/login")`, `router.push`, `Suspense`). Troque só o JSX retornado pelo componente interno por (adapte os nomes de estado aos que já existem no arquivo):

```tsx
<div className="in-app login-page">
  <Card className="login-card">
    <p className="app-nav-brand" style={{ marginBottom: 4 }}>Intake</p>
    <h1 className="ui-card-title" style={{ marginBottom: 20 }}>Entrar</h1>
    <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <label className="in-field">
        <span>Usuário</span>
        <input type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" />
      </label>
      <label className="in-field">
        <span>Senha</span>
        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
      </label>
      {erro && <p className="in-error">{erro}</p>}
      <Button variant="primary" type="submit" disabled={enviando} className="login-submit">{enviando ? "Entrando…" : "Entrar"}</Button>
    </form>
  </Card>
</div>
```

Importe `Card` de `@/components/ui/Card` e `Button` de `@/components/ui/Button`.

CSS (fim do `globals.css`):

```css
/* ---------- formulários internos + login ---------- */
.in-field{ display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
.in-field > span{ font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--c-stone); }
.in-field input, .in-field textarea, .in-field select{
  font-family:var(--font-ui); font-size:16px; color:var(--c-ink); background:var(--c-canvas);
  border:1px solid var(--c-hairline-strong); border-radius:var(--r-input); padding:10px 14px; min-height:44px;
}
.in-field textarea{ min-height:88px; resize:vertical; }
.in-field input:focus-visible, .in-field textarea:focus-visible, .in-field select:focus-visible{ outline:none; border:2px solid var(--c-primary); padding:9px 13px; }
.in-error{ color:var(--c-error); font-size:14px; margin:0 0 12px; }
.login-page{ display:flex; align-items:center; justify-content:center; padding:24px; }
.login-card{ width:100%; max-width:400px; }
.login-submit{ width:100%; margin-top:6px; }
```

- [ ] **Step 6: Verificar e commitar**

Run: `npx tsc --noEmit && npm run build`. Navegador: `/` mostra a nav "Intake · Início Construtor Leads Histórico" com a ativa preta; 390px mostra hambúrguer; `/login` mostra o card e entra com `radarjuridico`/`radarjuridico` (se houver env local).

```bash
git add components/AppNav.tsx app/login/page.tsx app/globals.css app/page.tsx app/kanban/page.tsx app/kanban/banco/page.tsx
git commit -m "Casca do Intake: nav em pílulas, marca nova, login restilizado, sem tema escuro interno"
```

---

### Task 5: Métricas da home (lógica pura + testes)

**Files:**
- Create: `lib/dashboard-metrics.ts`, `tests/dashboard-metrics.test.ts`

**Interfaces:**
- Consumes: `Lead` de `lib/lead-schema.ts`.
- Produces:
  - `type Period = "month" | "7d" | "today"`
  - `greeting(hour: number): "Bom dia" | "Boa tarde" | "Boa noite"`
  - `inPeriod(iso: string, period: Period, now: Date): boolean`
  - `pendingDoubts(leads: Lead[], entryColumnId: string): Lead[]` (desc por `criadoEm`)
  - `countByTipo(leads: Lead[]): { qualificado: number; duvida: number }`
  - `countByFunnel(leads: Lead[]): { funil: string; count: number }[]` (desc)
  - `timeAgo(iso: string, now: Date): string` (`"agora"`, `"há 5 min"`, `"há 2 h"`, `"há 3 d"`)

- [ ] **Step 1: Escrever os testes**

`tests/dashboard-metrics.test.ts`:

```ts
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
```

Se o tipo `Lead` tiver campos a mais/menos do que o helper `lead()` preenche, ajuste o helper — nunca o tipo.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: falha com "Cannot find module '../lib/dashboard-metrics'".

- [ ] **Step 3: Implementar `lib/dashboard-metrics.ts`**

```ts
import type { Lead } from "./lead-schema";

export type Period = "month" | "7d" | "today";

export function greeting(hour: number): "Bom dia" | "Boa tarde" | "Boa noite" {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function periodStart(period: Period, now: Date): Date {
  const d = new Date(now);
  if (period === "today") { d.setHours(0, 0, 0, 0); return d; }
  if (period === "7d") { d.setDate(d.getDate() - 7); return d; }
  d.setDate(1); d.setHours(0, 0, 0, 0); return d;
}

export function inPeriod(iso: string, period: Period, now: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= periodStart(period, now).getTime() && t <= now.getTime();
}

export function pendingDoubts(leads: Lead[], entryColumnId: string): Lead[] {
  return leads
    .filter((l) => l.tipo === "duvida" && l.status === entryColumnId)
    .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
}

export function countByTipo(leads: Lead[]): { qualificado: number; duvida: number } {
  return leads.reduce((acc, l) => { acc[l.tipo] += 1; return acc; }, { qualificado: 0, duvida: 0 });
}

export function countByFunnel(leads: Lead[]): { funil: string; count: number }[] {
  const map = new Map<string, number>();
  for (const l of leads) map.set(l.funil, (map.get(l.funil) ?? 0) + 1);
  return Array.from(map, ([funil, count]) => ({ funil, count })).sort((a, b) => b.count - a.count);
}

export function timeAgo(iso: string, now: Date): string {
  const s = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "agora";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
}
```

- [ ] **Step 4: Rodar e ver passar; commitar**

Run: `npm test`
Expected: 6 testes passam (5 + fumaça).

```bash
git add lib/dashboard-metrics.ts tests/dashboard-metrics.test.ts
git commit -m "Métricas da home como funções puras testadas"
```

---

### Task 6: Tela Início (dashboard)

**Files:**
- Create: `components/dashboard/Dashboard.tsx`
- Modify: `app/page.tsx`, `app/globals.css`

**Interfaces:**
- Consumes: `Card`, `Stat`, `Badge`, `Button`, `PillTabs`, `DataTable`, `PageHeader`, `AppNav`, `LeadDetailModal`, `waLink`, `fmtDate` (de `components/leads-ui.tsx`), tudo de `lib/dashboard-metrics.ts`, `Lead`/`KanbanColumn` de `lib/lead-schema.ts`.
- Produces: `app/page.tsx` renderiza `<Dashboard />`.

- [ ] **Step 1: `components/dashboard/Dashboard.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lead, KanbanColumn } from "@/lib/lead-schema";
import AppNav from "@/components/AppNav";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PillTabs } from "@/components/ui/PillTabs";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { LeadDetailModal, waLink, fmtDate } from "@/components/leads-ui";
import { greeting, inPeriod, pendingDoubts, countByTipo, countByFunnel, timeAgo, type Period } from "@/lib/dashboard-metrics";

const PERIODS = [{ id: "month", label: "Este mês" }, { id: "7d", label: "7 dias" }, { id: "today", label: "Hoje" }];

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [funnelNames, setFunnelNames] = useState<Record<string, string>>({});
  const [kvError, setKvError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("month");
  const [open, setOpen] = useState<Lead | null>(null);
  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    (async () => {
      try {
        const [l, c, f] = await Promise.all([fetch("/api/leads"), fetch("/api/kanban/columns"), fetch("/api/funnels")]);
        const ld = await l.json(); const cd = await c.json(); const fd = await f.json();
        setLeads(ld.leads || []); setColumns(cd.columns || []);
        if (ld.ok === false) setKvError(ld.error);
        const map: Record<string, string> = {};
        (fd.funnels || []).forEach((x: { slug: string; nome: string }) => { map[x.slug] = x.nome; });
        setFunnelNames(map);
      } catch { setKvError("Falha ao carregar."); }
    })();
  }, []);

  const entryColumn = columns[0]?.id ?? "novo";
  const colLabel = (id: string) => columns.find((c) => c.id === id)?.label ?? id;
  const funnelLabel = (slug: string) => funnelNames[slug] ?? slug;

  const pending = useMemo(() => pendingDoubts(leads, entryColumn), [leads, entryColumn]);
  const inRange = useMemo(() => leads.filter((l) => inPeriod(l.criadoEm, period, now)), [leads, period, now]);
  const tipos = countByTipo(inRange);
  const porFunil = countByFunnel(inRange);
  const maxFunil = porFunil[0]?.count ?? 1;
  const recentes = useMemo(() => [...leads].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)).slice(0, 10), [leads]);

  async function handleDelete(lead: Lead) {
    if (!confirm(`Excluir o lead de "${lead.nome}"?`)) return;
    setLeads((l) => l.filter((x) => x.id !== lead.id)); setOpen(null);
    try { await fetch(`/api/leads/${lead.id}`, { method: "DELETE" }); } catch { /* some no próximo load se falhar */ }
  }

  return (
    <div className="in-app">
      <AppNav current="inicio" />
      <main className="in-container">
        <PageHeader
          title={`${greeting(now.getHours())}, André`}
          subtitle="Aqui está o que precisa da sua atenção hoje."
          actions={<PillTabs items={PERIODS} active={period} onChange={(id) => setPeriod(id as Period)} ariaLabel="Período" />}
        />
        {kvError && <p className="in-notice">{kvError}</p>}

        <div className="dash-row-1">
          <Card title="Dúvidas aguardando resposta" subtitle="Quem escreveu e ainda não foi respondido" action={<Button href="/kanban" size="sm">ver todas →</Button>}>
            <Stat value={pending.length} label="pendentes" />
            {pending.length === 0 ? (
              <p className="dash-empty">Nenhuma dúvida esperando — tudo respondido ✓</p>
            ) : (
              <ul className="dash-pending">
                {pending.slice(0, 5).map((l) => (
                  <li key={l.id} onClick={() => setOpen(l)}>
                    <div className="dash-pending-main">
                      <strong>{l.nome}</strong>
                      <span className="dash-pending-meta"><Badge>{funnelLabel(l.funil)}</Badge> · {timeAgo(l.criadoEm, now)}</span>
                    </div>
                    <Button variant="primary" size="sm" href={waLink(l)} target="_blank" onClick={(e) => e.stopPropagation()}>Responder no WhatsApp</Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Números do período">
            <div className="dash-stats">
              <Stat value={tipos.qualificado} label="Qualificados" />
              <Stat value={tipos.duvida} label="Dúvidas" />
            </div>
            {porFunil.length === 0 ? <p className="dash-empty">Sem leads no período</p> : (
              <ul className="dash-bars">
                {porFunil.map((f) => (
                  <li key={f.funil}>
                    <span className="dash-bar-label">{funnelLabel(f.funil)}</span>
                    <span className="dash-bar-track"><span className="dash-bar-fill" style={{ width: `${(f.count / maxFunil) * 100}%` }} /></span>
                    <span className="dash-bar-value">{f.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card title="Últimos leads" subtitle="De todos os funis, mais recente primeiro" action={<Button href="/kanban" size="sm">ver todos →</Button>} className="dash-row-2">
          <DataTable
            rows={recentes}
            onRowClick={setOpen}
            emptyText="Nenhum lead ainda."
            columns={[
              { key: "nome", label: "Nome", render: (l) => <strong>{l.nome}</strong> },
              { key: "funil", label: "Funil", render: (l) => <Badge>{funnelLabel(l.funil)}</Badge> },
              { key: "tipo", label: "Tipo", render: (l) => l.tipo === "qualificado" ? <Badge tone="green">Qualificado</Badge> : <Badge tone="orange">Dúvida</Badge> },
              { key: "status", label: "Coluna", render: (l) => colLabel(l.status) },
              { key: "criadoEm", label: "Quando", render: (l) => fmtDate(l.criadoEm) }
            ]}
          />
        </Card>
      </main>
      {open && <LeadDetailModal lead={open} onClose={() => setOpen(null)} onDelete={handleDelete} funnelLabel={funnelLabel(open.funil)} />}
    </div>
  );
}
```

- [ ] **Step 2: `app/page.tsx`**

```tsx
import Dashboard from "@/components/dashboard/Dashboard";

export default function Home() {
  return <Dashboard />;
}
```

- [ ] **Step 3: CSS da home (fim do `globals.css`)**

```css
/* ---------- início ---------- */
.in-notice{ font-size:13px; color:var(--c-slate); background:var(--c-surface); border-radius:8px; padding:8px 12px; margin:0 0 16px; }
.dash-row-1{ display:grid; grid-template-columns:2fr 1fr; gap:16px; margin-bottom:16px; }
.dash-row-2{ margin-bottom:48px; }
@media (max-width:1024px){ .dash-row-1{ grid-template-columns:1fr; } }
.dash-empty{ color:var(--c-slate); font-size:14px; margin:12px 0 0; }
.dash-pending{ list-style:none; padding:0; margin:16px 0 0; display:flex; flex-direction:column; gap:8px; }
.dash-pending li{ display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; border:1px solid var(--c-hairline); border-radius:12px; cursor:pointer; }
.dash-pending li:hover{ background:var(--c-surface-soft); }
.dash-pending-main{ display:flex; flex-direction:column; gap:4px; min-width:0; }
.dash-pending-meta{ font-size:13px; color:var(--c-slate); display:flex; align-items:center; gap:6px; }
@media (max-width:560px){ .dash-pending li{ flex-direction:column; align-items:stretch; } }
.dash-stats{ display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; }
.dash-bars{ list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px; }
.dash-bars li{ display:grid; grid-template-columns:minmax(0,1fr) 2fr auto; align-items:center; gap:10px; font-size:13px; }
.dash-bar-label{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--c-slate); }
.dash-bar-track{ height:6px; background:var(--c-tint-gray); border-radius:3px; overflow:hidden; }
.dash-bar-fill{ display:block; height:100%; background:var(--c-primary); border-radius:3px; }
.dash-bar-value{ font-variant-numeric:tabular-nums; font-weight:600; }
```

- [ ] **Step 4: Verificar e commitar**

Run: `npx tsc --noEmit && npm run build`. Navegador `/`: saudação certa pra hora, três cards, estado vazio elegante (sem KV local); troque o período e confira que não quebra; 390px empilha. Se tiver KV disponível (produção após deploy), confira que os números batem com o Kanban.

```bash
git add components/dashboard/Dashboard.tsx app/page.tsx app/globals.css
git commit -m "Início vira dashboard: dúvidas pendentes, números do período por funil, últimos leads"
```

---

### Task 7: Leads (Kanban) restilizado

**Files:**
- Modify: `components/leads-ui.tsx`, `app/kanban/page.tsx`, `app/globals.css`

**Interfaces:**
- Consumes: `Card`, `Badge`, `Button`, `PageHeader`.
- Produces: `LeadCard` compacto com a mesma assinatura atual (`lead, onOpen, onDelete, onDragStart?, funnelLabel?, statusLabel?`); `LeadDetailModal` inalterado na API.

- [ ] **Step 1: `LeadCard` compacto em `components/leads-ui.tsx`**

Substitua o retorno de `LeadCard` por:

```tsx
<div className="lead-card" draggable={!!onDragStart} onDragStart={onDragStart ? (e) => onDragStart(e, lead.id) : undefined} onClick={() => onOpen(lead)}>
  <div className="lead-card-top">
    <strong className="lead-card-name">{lead.nome}</strong>
    <span className="lead-card-actions">
      <a className="ui-btn ui-btn-ghost ui-btn-sm ui-btn-icon" href={waLink(lead)} target="_blank" rel="noopener" title="Chamar no WhatsApp" onClick={(e) => e.stopPropagation()}>💬</a>
      <button type="button" className="lead-card-delete" title="Excluir" onClick={(e) => { e.stopPropagation(); onDelete(lead); }}>✕</button>
    </span>
  </div>
  <div className="lead-card-badges">
    {funnelLabel && <Badge>{funnelLabel}</Badge>}
    {lead.tipo === "qualificado" ? <Badge tone="green">Qualificado</Badge> : <Badge tone="orange">Dúvida</Badge>}
    {statusLabel && <Badge>{statusLabel}</Badge>}
  </div>
  <span className="lead-card-time">{fmtDate(lead.criadoEm)}</span>
</div>
```

Importe `Badge` de `@/components/ui/Badge` e `Button` de `@/components/ui/Button`. No `LeadDetailModal`, troque os `<button className="btn small">` por `<Button size="sm">` (e `variant="secondary"` onde já era neutro), e o `<a className="btn primary kanban-wa-btn">` do rodapé por `<Button variant="primary" href={waLink(lead)} target="_blank">Chamar no WhatsApp →</Button>`. Classes `kanban-modal*`/`kanban-detail-grid`/`kanban-tags`/`kanban-question` continuam (restiladas no Step 3).

- [ ] **Step 2: `app/kanban/page.tsx`**

Mantenha `ColumnsEditor`, `load`, `moveLead`, `handleDelete`, `onDragStart/onDrop`, `isCurrentMonth`, `currentMonthLeads`, e os estados existentes. Troque o JSX de retorno principal por:

```tsx
<div className="in-app">
  <AppNav current="leads" />
  <main className="in-container">
    <PageHeader
      title="Leads"
      subtitle={`${new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" })} · ${currentMonthLeads.length} lead(s) · arraste entre colunas`}
      actions={<Button iconOnly title="Colunas" onClick={() => setEditingColumns(true)}>⚙</Button>}
    />
    {error && <p className="in-notice">{error}</p>}
    {loading ? <p className="dash-empty">Carregando…</p> : (
      <div className="kanban-board" style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(280px, 1fr))` }}>
        {columns.map((col) => {
          const items = currentMonthLeads.filter((l) => l.status === col.id);
          return (
            <Card key={col.id} className="kanban-col" title={col.label} action={<Badge>{items.length}</Badge>}>
              <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, col.id)} className="kanban-drop">
                {col.capiEvent && <p className="kanban-capi">📡 dispara "{col.capiEvent}" pro Meta</p>}
                {items.map((l) => <LeadCard key={l.id} lead={l} onDragStart={onDragStart} onOpen={setOpenLead} onDelete={handleDelete} funnelLabel={funnelNames[l.funil]} />)}
                {items.length === 0 && <p className="dash-empty">Vazio</p>}
              </div>
            </Card>
          );
        })}
      </div>
    )}
  </main>
  {openLead && <LeadDetailModal lead={openLead} onClose={() => setOpenLead(null)} onDelete={handleDelete} funnelLabel={funnelNames[openLead.funil]} />}
  {editingColumns && <ColumnsEditor columns={columns} onClose={() => setEditingColumns(false)} onSaved={setColumns} />}
</div>
```

Adapte os nomes (`funnelNames`, `openLead`, `editingColumns`, `error`, `loading`) aos que já existem no arquivo; se o arquivo não tiver `funnelNames`, ele já busca `/api/funnels` — reaproveite o mapa existente. No `ColumnsEditor`, troque os `<button className="btn ...">` por `<Button ...>` equivalentes (`primary` no "Salvar colunas").

- [ ] **Step 3: CSS — substitua a seção `/* ---------- kanban de leads ---------- */` inteira (e o bloco `RESPONSIVE: kanban`) por**

```css
/* ---------- leads (kanban) e componentes de lead ---------- */
.kanban-board{ display:grid; gap:16px; margin-bottom:48px; overflow-x:auto; }
.kanban-col .ui-card-body{ min-height:120px; }
.kanban-drop{ min-height:80px; }
.kanban-capi{ font-size:12px; color:var(--c-steel); margin:0 0 8px; }
.lead-card{ background:var(--c-canvas); border:1px solid var(--c-hairline); border-radius:12px; padding:12px 14px; margin-bottom:8px; cursor:pointer; transition:border-color .12s, box-shadow .12s; }
.lead-card:hover{ border-color:var(--c-hairline-strong); box-shadow:var(--sh-card-hover); }
.lead-card-top{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
.lead-card-name{ font-size:14px; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.lead-card-actions{ display:flex; align-items:center; gap:2px; flex-shrink:0; }
.lead-card-delete{ border:none; background:none; color:var(--c-stone); cursor:pointer; font-size:13px; width:28px; height:28px; border-radius:6px; opacity:0; transition:opacity .12s; }
.lead-card:hover .lead-card-delete{ opacity:1; }
.lead-card-delete:hover{ background:#fde3e3; color:#8a1c1c; }
.lead-card-badges{ display:flex; flex-wrap:wrap; gap:4px; margin:8px 0 6px; }
.lead-card-time{ font-size:12px; color:var(--c-stone); }

.kanban-modal-overlay{ position:fixed; inset:0; background:rgba(15,15,15,0.45); display:flex; align-items:flex-start; justify-content:center; padding:5vh 20px; z-index:100; overflow-y:auto; }
.kanban-modal{ background:var(--c-canvas); border-radius:var(--r-card); padding:24px; max-width:520px; width:100%; box-shadow:var(--sh-modal); }
.kanban-modal-head{ display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:8px; }
.kanban-detail-grid{ display:grid; grid-template-columns:1fr 1fr; gap:12px 16px; margin-top:12px; }
.kanban-detail-grid label, .kanban-modal label{ font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--c-stone); }
.kanban-detail-grid p{ margin:2px 0 0; font-size:14px; }
.kanban-tags{ display:flex; flex-wrap:wrap; gap:4px; margin-top:6px; }
.kanban-tag{ font-size:12px; background:var(--c-tint-gray); color:var(--c-slate); border-radius:var(--r-tag); padding:2px 8px; }
.kanban-tag.utm{ background:var(--c-tint-peach); color:var(--c-orange-deep); }
.kanban-question{ font-size:14px; font-style:italic; margin:6px 0 0; }
.kanban-col-edit-row{ display:flex; gap:6px; align-items:center; margin-bottom:8px; flex-wrap:wrap; }
.kanban-col-edit-order{ display:flex; gap:2px; }
.kanban-col-edit-label, .kanban-col-edit-capi{ flex:1; min-width:140px; font-family:var(--font-ui); border-radius:var(--r-input); border:1px solid var(--c-hairline-strong); padding:8px 10px; font-size:14px; }
.kanban-col-edit-remove{ border:none; background:none; cursor:pointer; font-size:14px; padding:4px; }
@media (max-width:768px){
  .kanban-board{ grid-template-columns:1fr !important; overflow-x:visible; }
  .lead-card-delete{ opacity:1; }
  .kanban-modal-overlay{ padding:0; align-items:stretch; }
  .kanban-modal{ max-width:none; border-radius:0; min-height:100%; }
  .kanban-detail-grid{ grid-template-columns:1fr; }
}
```

Apague as classes antigas que sobraram sem uso: `.kanban-card*`, `.kanban-whats`, `.kanban-meta-row`, `.kanban-area-clip`, `.kanban-date`, `.kanban-wa-btn`, `.kanban-count`, `.kanban-col-header`, `.kanban-banco-*` (o Histórico ganha classes novas na Task 8). Confirme com `grep -rn "kanban-card\|kanban-whats\|kanban-banco" --include=*.tsx .` que nenhum componente ainda as usa. Se o `ColumnsEditor` usa outras classes `kanban-col-edit-*` que não estão listadas acima, mantenha-as.

- [ ] **Step 4: Verificar e commitar**

Run: `npx tsc --noEmit && npm run build`. Navegador `/kanban` em 1440 e 390 (colunas empilham). Se houver dados (produção), arraste um card entre colunas e confirme que persiste; abra o modal; ✕ pede confirmação.

```bash
git add components/leads-ui.tsx app/kanban/page.tsx app/globals.css
git commit -m "Leads: colunas como cards, lead compacto com badges, modal nos tokens novos"
```

---

### Task 8: Histórico com pílulas de mês e tabela

**Files:**
- Modify: `app/kanban/banco/page.tsx`, `app/globals.css`

**Interfaces:**
- Consumes: `Card`, `PillTabs`, `DataTable`, `Badge`, `PageHeader`, `LeadDetailModal`, `fmtDate`.

- [ ] **Step 1: JSX de `app/kanban/banco/page.tsx`**

Mantenha `monthKey`, `monthLabel`, `MONTH_NAMES`, `load`, `months`, `currentMonth`, `selectedMonth` (+ efeito de padrão), `columnLabel`, `monthLeads`, `handleDelete`. Troque o retorno por:

```tsx
<div className="in-app">
  <AppNav current="historico" />
  <main className="in-container">
    <PageHeader title="Histórico" subtitle="Leads de meses anteriores. Nada é apagado — o Kanban só mostra o mês corrente." />
    {error && <p className="in-notice">{error}</p>}
    {loading ? <p className="dash-empty">Carregando…</p> : !months.length ? <p className="dash-empty">Ainda não há leads registrados.</p> : (
      <>
        <div className="hist-months">
          <PillTabs
            ariaLabel="Mês"
            items={months.map((m) => ({ id: m, label: monthLabel(m) + (m === currentMonth ? " (atual)" : "") }))}
            active={selectedMonth || ""}
            onChange={setSelectedMonth}
          />
        </div>
        <Card className="hist-table">
          <DataTable
            rows={monthLeads}
            onRowClick={setOpenLead}
            emptyText={`Nenhum lead em ${monthLabel(selectedMonth || "")}.`}
            columns={[
              { key: "nome", label: "Nome", render: (l) => <strong>{l.nome}</strong> },
              { key: "funil", label: "Funil", render: (l) => <Badge>{funnelNames[l.funil] ?? l.funil}</Badge> },
              { key: "tipo", label: "Tipo", render: (l) => l.tipo === "qualificado" ? <Badge tone="green">Qualificado</Badge> : <Badge tone="orange">Dúvida</Badge> },
              { key: "status", label: "Coluna", render: (l) => columnLabel(l.status) },
              { key: "criadoEm", label: "Data", render: (l) => fmtDate(l.criadoEm) }
            ]}
          />
        </Card>
      </>
    )}
  </main>
  {openLead && <LeadDetailModal lead={openLead} onClose={() => setOpenLead(null)} onDelete={handleDelete} funnelLabel={funnelNames[openLead.funil]} />}
</div>
```

Remova o import de `LeadCard` se não for mais usado aqui. Adapte nomes de estado aos existentes.

- [ ] **Step 2: CSS (fim do `globals.css`)**

```css
/* ---------- histórico ---------- */
.hist-months{ overflow-x:auto; padding-bottom:8px; margin-bottom:16px; }
.hist-months .ui-pills{ flex-wrap:nowrap; }
.hist-table{ margin-bottom:48px; }
```

- [ ] **Step 3: Verificar e commitar**

Run: `npx tsc --noEmit && npm run build`. Navegador `/kanban/banco` em 1440 (tabela) e 390 (linhas viram cards empilhados).

```bash
git add app/kanban/banco/page.tsx app/globals.css
git commit -m "Histórico: pílulas de mês e tabela de leads"
```

---

### Task 9: Layout automático do grafo (lógica pura + testes)

**Files:**
- Create: `lib/graph-layout.ts`, `tests/graph-layout.test.ts`

**Interfaces:**
- Consumes: `FunnelGraph`, `GraphNode`, `effectiveEdges` de `lib/funnel-graph-schema.ts`.
- Produces: `layoutLeftToRight(graph, size, opts?) => { positions: Record<string, {x:number;y:number}>; unreached: Set<string>; columns: string[][] }`, com `size(node) => {width,height}` e `opts = { gapX?: number; gapY?: number }` (padrão 80 / 40).

- [ ] **Step 1: Testes**

`tests/graph-layout.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { layoutLeftToRight } from "../lib/graph-layout";
import type { FunnelGraph, GraphNode } from "../lib/funnel-graph-schema";

const size = () => ({ width: 100, height: 50 });

function g(nodes: [string, GraphNode["type"]][], edges: [string, string][]): FunnelGraph {
  return {
    version: 1,
    nodes: nodes.map(([id, type]) => ({
      id, type, position: { x: 0, y: 0 },
      data: type === "condition" ? { rules: [], defaultNodeId: "" } : type === "choice" ? { alias: id, question: "", options: [] } : {}
    })) as GraphNode[],
    edges: edges.map(([s, t]) => ({ id: `${s}-${t}`, source: s, target: t }))
  };
}

test("cadeia linear vira colunas crescentes em x, mesmo y", () => {
  const graph = g([["start", "start"], ["a", "choice"], ["b", "choice"]], [["start", "a"], ["a", "b"]]);
  const { positions, columns } = layoutLeftToRight(graph, size);
  assert.deepEqual(columns, [["start"], ["a"], ["b"]]);
  assert.equal(positions.start.x, 0);
  assert.equal(positions.a.x, 180);
  assert.equal(positions.b.x, 360);
  assert.equal(positions.a.y, 0);
});

test("ramificação abre linhas paralelas na mesma coluna", () => {
  const graph = g([["start", "start"], ["a", "choice"], ["x", "terminalLead"], ["y", "terminalDoubt"]], [["start", "a"], ["a", "x"], ["a", "y"]]);
  const { positions } = layoutLeftToRight(graph, size);
  assert.equal(positions.x.x, positions.y.x);
  assert.equal(positions.x.y, 0);
  assert.equal(positions.y.y, 90);
});

test("nó inalcançável vai pra última coluna e é marcado", () => {
  const graph = g([["start", "start"], ["a", "choice"], ["orfao", "choice"]], [["start", "a"]]);
  const { positions, unreached, columns } = layoutLeftToRight(graph, size);
  assert.ok(unreached.has("orfao"));
  assert.equal(columns.length, 3);
  assert.equal(positions.orfao.x, 360);
});

test("condição usa os alvos das regras/default como arestas", () => {
  const graph = g([["start", "start"], ["c", "condition"], ["x", "terminalLead"]], [["start", "c"]]);
  (graph.nodes[1].data as { defaultNodeId: string }).defaultNodeId = "x";
  const { columns } = layoutLeftToRight(graph, size);
  assert.deepEqual(columns, [["start"], ["c"], ["x"]]);
});
```

Se o cast `as GraphNode[]` reclamar de campos obrigatórios em algum tipo de nó, use `as unknown as GraphNode[]` — o teste só precisa de `id`, `type` e do `data` da condição.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test` → falha por módulo inexistente.

- [ ] **Step 3: Implementar `lib/graph-layout.ts`**

```ts
import { effectiveEdges, type FunnelGraph, type GraphNode } from "./funnel-graph-schema";

export interface LayoutPos { x: number; y: number }
export interface LayoutResult { positions: Record<string, LayoutPos>; unreached: Set<string>; columns: string[][] }

/** Layout por camadas, sempre da esquerda pra direita: coluna = menor distância do
 * start (BFS pelas arestas que o motor realmente usa). Nós inalcançáveis vão pra uma
 * coluna extra no fim. Puro: mesma entrada, mesma saída. */
export function layoutLeftToRight(
  graph: FunnelGraph,
  size: (n: GraphNode) => { width: number; height: number },
  opts: { gapX?: number; gapY?: number } = {}
): LayoutResult {
  const gapX = opts.gapX ?? 80, gapY = opts.gapY ?? 40;
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const adj = new Map<string, string[]>();
  for (const e of effectiveEdges(graph)) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    if (!adj.get(e.source)!.includes(e.target)) adj.get(e.source)!.push(e.target);
  }

  const depth = new Map<string, number>();
  const start = graph.nodes.find((n) => n.type === "start");
  if (start) {
    const queue = [start.id]; depth.set(start.id, 0);
    while (queue.length) {
      const id = queue.shift()!;
      for (const next of adj.get(id) ?? []) {
        if (!depth.has(next) && byId.has(next)) { depth.set(next, depth.get(id)! + 1); queue.push(next); }
      }
    }
  }

  const columns: string[][] = [];
  for (const [id, d] of depth) { (columns[d] ??= []).push(id); }
  const unreached = new Set(graph.nodes.filter((n) => !depth.has(n.id)).map((n) => n.id));
  if (unreached.size) columns.push([...unreached]);

  const positions: Record<string, LayoutPos> = {};
  let x = 0;
  for (const col of columns) {
    let y = 0, colWidth = 0;
    for (const id of col) {
      const { width, height } = size(byId.get(id)!);
      positions[id] = { x, y };
      y += height + gapY;
      colWidth = Math.max(colWidth, width);
    }
    x += colWidth + gapX;
  }
  return { positions, unreached, columns };
}
```

- [ ] **Step 4: Rodar e ver passar; commitar**

Run: `npm test` → todos passam.

```bash
git add lib/graph-layout.ts tests/graph-layout.test.ts
git commit -m "Layout automático esquerda→direita do grafo, como função pura testada"
```

---

### Task 10: Mapa do fluxo — horizontal, zoom, duplo clique, compacto, seleção exposta

**Files:**
- Modify: `app/builder/graph/GraphEditor.tsx`, `app/builder/graph/nodes.tsx`, `app/globals.css`

**Interfaces:**
- Consumes: `layoutLeftToRight`.
- Produces: `GraphEditor({ funnelData, graph, onChange, onSelectedChange?: (id: string | null) => void })`. Nós recebem `data.compact: boolean`. Inspector fica sempre visível no desktop (placeholder sem seleção).

- [ ] **Step 1: `GraphEditor.tsx` — posições pelo layout, sem arrastar, zoom e duplo clique**

Imports: adicione `useReactFlow, useViewport` ao import de `@xyflow/react`; adicione `import { layoutLeftToRight } from "@/lib/graph-layout";`. Remova `applyNodeChanges`, `Controls` e `MiniMap` do import se ficarem sem uso. `import "@xyflow/react/dist/style.css"` **permanece**.

Na assinatura de `GraphEditorInner` e do `export default function GraphEditor`, adicione `onSelectedChange?: (id: string | null) => void` e repasse.

Dentro de `GraphEditorInner`, logo após `const isMobile = useIsMobile();`:

```tsx
const { fitView, zoomIn, zoomOut } = useReactFlow();
const { zoom } = useViewport();
const compact = zoom < 0.6;
const layout = useMemo(() => layoutLeftToRight(graph, estimateSize), [graph]);

function select(id: string | null) { setSelectedId(id); onSelectedChange?.(id); }

useEffect(() => { fitView({ padding: 0.2 }); }, [layout.columns.length, fitView]);
```

Troque todas as chamadas `setSelectedId(...)` no arquivo por `select(...)` (inclusive nas linhas mobile e em `onNodeClick`/`onPaneClick`).

Em `toFlowNodes`, mude a assinatura pra receber `positions: Record<string, {x:number;y:number}>` e `compact: boolean`, e use `position: positions[n.id] ?? n.position`, `draggable: false`, `data: { ...n.data, compact, onUpdate, onOpenInspector, onDelete }`. Atualize o `useMemo` de `flowNodes` pra passar `layout.positions` e `compact` e incluir ambos nas dependências.

Substitua `onNodesChange` inteiro por:

```tsx
function onNodesChange(changes: NodeChange[]) {
  const removed = new Set(
    changes.filter((c) => c.type === "remove").map((c) => c.id)
      .filter((id) => graph.nodes.find((n) => n.id === id)?.type !== "start")
  );
  if (!removed.size) return;
  onChange({
    ...graph,
    nodes: graph.nodes.filter((n) => !removed.has(n.id)),
    edges: graph.edges.filter((e) => !removed.has(e.source) && !removed.has(e.target))
  });
}
```

Em `addNode`, `position` pode ser `{ x: 0, y: 0 }` (o layout decide).

No `<ReactFlow ...>`: adicione `nodesDraggable={false}`, `minZoom={0.2}`, `maxZoom={1.6}`, e `onNodeDoubleClick={(_, n) => { select(n.id); fitView({ nodes: [{ id: n.id }], padding: 0.5, duration: 300 }); }}`. Remova `<Controls />` e `<MiniMap />`; no lugar, dentro do `.b-graph-canvas` e fora do `<ReactFlow>`, renderize:

```tsx
<div className="b-graph-zoom">
  <button type="button" onClick={() => zoomIn({ duration: 200 })} title="Aproximar">＋</button>
  <button type="button" onClick={() => zoomOut({ duration: 200 })} title="Afastar">－</button>
  <button type="button" onClick={() => fitView({ padding: 0.2, duration: 300 })} title="Ajustar tudo">⤢</button>
</div>
```

Quando não há seleção no desktop, em vez de não renderizar o `Inspector`, renderize `<aside className="b-graph-inspector b-graph-inspector-empty">Selecione um bloco no mapa</aside>`.

Nós em `layout.unreached` recebem `className: "unreached"` no objeto de nó do xyflow (o CSS abaixo os deixa a 55% de opacidade).

- [ ] **Step 2: `nodes.tsx` — variante compacta**

Estenda `WithActions<T>` com `compact: boolean`. No `NodeShell`, adicione prop `compact?: boolean` e, quando true, retorne:

```tsx
<div className="b-graph-node b-graph-node--compact">
  <span>{icon}</span><span className="b-graph-node-compact-label">{label}</span>
  {children /* só as Handles */}
</div>
```

Cada view (`ChoiceNodeView`, `MultiChoiceNodeView`, `InterstitialNodeView`, `ConditionNodeView`, `ScoreNodeView`, `TerminalLeadNodeView`, `TerminalDoubtNodeView`) lê `d.compact` e, se true, renderiza o `NodeShell` compacto contendo **só** as `Handle`s (com `style={{ opacity: 0 }}`) — sem elas as arestas somem. Regra por tipo: `target` em todos menos `start`; `source id="default"` em `choice`/`multiChoice`/`interstitial`/`score`; em `condition`, `source id={"rule_" + i}` pra cada regra + `id="default"`; nos terminais, nenhuma `source`. No modo compacto as arestas por opção do `choice` se ligam visualmente ao `default` — aceitável (ao aproximar, voltam ao lugar). O nó `start` não tem variante compacta (já é um chip).

- [ ] **Step 3: CSS do mapa — substitua a seção `/* ---------- editor visual de fluxo (grafo) ---------- */` e o bloco `RESPONSIVE: editor de fluxo` por**

```css
/* ---------- mapa do fluxo ---------- */
.b-graph-shell{ flex:1; display:flex; min-height:0; }
.b-graph-main{ flex:1; display:flex; flex-direction:column; min-width:0; }
.b-graph-toolbar{ display:flex; align-items:center; gap:8px; padding:10px 14px; border-bottom:1px solid var(--c-hairline); background:var(--c-canvas); }
.b-graph-toolbar select{ font-family:var(--font-ui); font-size:14px; padding:8px 10px; border-radius:var(--r-input); border:1px solid var(--c-hairline-strong); background:var(--c-canvas); }
.b-graph-warnings{ padding:8px 14px; display:flex; flex-direction:column; gap:4px; background:var(--c-tint-peach); }
.b-graph-warning{ font-size:13px; color:var(--c-orange-deep); } .b-graph-warning.blocking{ font-weight:600; }
.b-graph-canvas{ flex:1; min-height:420px; position:relative; background:var(--c-surface-soft); }
.b-graph-zoom{ position:absolute; right:12px; bottom:12px; display:flex; flex-direction:column; gap:4px; z-index:5; }
.b-graph-zoom button{ width:36px; height:36px; border-radius:var(--r-btn); border:1px solid var(--c-hairline); background:var(--c-canvas); cursor:pointer; font-size:16px; }
.react-flow__edge-path{ stroke:var(--c-steel) !important; stroke-width:1.5 !important; }
.react-flow__edge.selected .react-flow__edge-path{ stroke:var(--c-primary) !important; }
.react-flow__handle{ width:9px; height:9px; background:var(--c-steel); border:2px solid var(--c-canvas); }
.react-flow__node.selected .b-graph-node{ border-color:var(--c-primary); box-shadow:0 0 0 2px var(--c-tint-lavender); }
.react-flow__node.unreached{ opacity:.55; }

.b-graph-node{ background:var(--c-canvas); border:1.5px solid var(--c-hairline); border-radius:12px; width:100%; height:100%; box-sizing:border-box; overflow-y:auto; font-family:var(--font-ui); }
.b-graph-node--start{ padding:10px 18px; border-radius:var(--r-pill); display:flex; align-items:center; justify-content:center; background:#000; color:#fff; font-weight:600; }
.b-graph-node--compact{ display:flex; align-items:center; gap:8px; padding:0 14px; font-size:20px; overflow:hidden; }
.b-graph-node-compact-label{ font-size:22px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.b-graph-node-header{ display:flex; align-items:center; justify-content:space-between; gap:6px; padding:8px 10px; border-bottom:1px solid var(--c-hairline-soft); font-size:12px; font-weight:600; color:var(--c-steel); }
.b-graph-node-actions{ display:flex; gap:4px; } .b-graph-node-actions button{ border:none; background:none; cursor:pointer; font-size:13px; padding:2px 4px; border-radius:6px; }
.b-graph-node-actions button:hover{ background:var(--c-surface); }
.b-graph-node-body{ padding:10px; }
.b-graph-alias{ font-size:11px; color:var(--c-purple-800); background:var(--c-tint-lavender); display:inline-block; padding:2px 6px; border-radius:var(--r-tag); margin-bottom:6px; }
.b-graph-question{ font-size:14px; font-weight:500; margin:0 0 8px; cursor:text; }
.b-graph-hint{ font-size:12px; color:var(--c-slate); margin:4px 0; }
.b-graph-opts{ display:flex; flex-direction:column; gap:4px; }
.b-graph-opt{ display:flex; align-items:center; gap:6px; padding:5px 8px; border-radius:8px; border:1px solid var(--c-hairline); position:relative; font-size:13px; }
.b-graph-opt .chip, .b-graph-opt .label{ cursor:text; } .b-graph-opt .label{ flex:1; }
.b-graph-fallback{ display:flex; align-items:center; justify-content:space-between; margin-top:8px; font-size:12px; color:var(--c-steel); border-top:1px dashed var(--c-hairline); padding-top:6px; }
.b-graph-rule-row{ display:flex; align-items:center; justify-content:space-between; gap:6px; font-size:12px; padding:5px 8px; border-radius:8px; border:1px solid var(--c-hairline); margin-bottom:4px; }
.b-graph-node-body select{ width:100%; font-family:var(--font-ui); font-size:13px; padding:6px 8px; border-radius:8px; border:1px solid var(--c-hairline-strong); background:var(--c-canvas); }

.b-graph-inspector{ width:360px; flex-shrink:0; border-left:1px solid var(--c-hairline); background:var(--c-canvas); overflow-y:auto; padding:16px; }
.b-graph-inspector-empty{ display:flex; align-items:center; justify-content:center; color:var(--c-stone); font-size:14px; }
.b-graph-inspector-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.b-graph-inspector .b-field label, .b-graph-mobile-panel .b-field label{ font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--c-stone); }
.b-graph-inspector .b-field input, .b-graph-inspector .b-field textarea, .b-graph-inspector .b-field select,
.b-graph-mobile-panel .b-field input, .b-graph-mobile-panel .b-field textarea, .b-graph-mobile-panel .b-field select{
  font-family:var(--font-ui); font-size:14px; border-radius:var(--r-input); border:1px solid var(--c-hairline-strong); padding:8px 10px; width:100%; background:var(--c-canvas);
}
.b-graph-rule-editor{ display:grid; grid-template-columns:1fr 1fr 1fr auto; gap:4px; align-items:center; margin-bottom:6px; }
.b-graph-chips{ display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; align-items:center; font-size:12px; color:var(--c-slate); }

/* lista mobile (substitui o canvas abaixo de 768px) */
.b-graph-mobile-list{ flex:1; overflow-y:auto; padding:10px 14px; display:flex; flex-direction:column; gap:8px; }
.b-graph-mobile-row{ display:flex; align-items:center; gap:10px; width:100%; text-align:left; background:var(--c-canvas); border:1px solid var(--c-hairline); border-radius:12px; padding:12px; cursor:pointer; font-family:var(--font-ui); }
.b-graph-mobile-row.unreached{ opacity:.55; }
.b-graph-mobile-row-icon{ font-size:20px; } .b-graph-mobile-row-body{ flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.b-graph-mobile-row-type{ font-size:11px; font-weight:600; color:var(--c-stone); text-transform:uppercase; letter-spacing:.5px; }
.b-graph-mobile-row-preview{ font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.b-graph-mobile-row-arrow{ font-size:20px; color:var(--c-stone); }
.b-graph-mobile-panel{ position:fixed; inset:0; z-index:200; background:var(--c-canvas); overflow-y:auto; padding:16px; }
.b-graph-mobile-panel-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; position:sticky; top:-16px; background:var(--c-canvas); padding:16px 0 10px; margin-top:-16px; }
.b-graph-mobile-goto{ font-size:13px; color:var(--c-slate); margin:4px 0; }
@media (max-width:768px){ .b-graph-toolbar{ flex-wrap:wrap; } .b-graph-toolbar select{ flex:1; min-width:0; } }
```

Se o `GraphEditor`/`Inspector`/`nodes` usarem alguma classe `.b-graph-*` que não está nesta lista, copie a regra antiga dela pra cá trocando cores/fontes pelos tokens. Não apague regra que ainda tem uso.

- [ ] **Step 4: Verificar e commitar**

Run: `npx tsc --noEmit && npm test && npm run build`. Navegador `/builder?slug=default` → aba Fluxo (a aba ainda existe até a Task 12): mapa horizontal legível; roda do mouse dá zoom; afastar abaixo de 0,6 mostra chips; duplo clique num bloco aproxima e seleciona; arrastar nó **não** move; arrastar de uma alça de opção pra outro bloco ainda cria conexão; ＋/－/⤢ funcionam; Inspector mostra o placeholder sem seleção; em 390px a lista continua funcionando.

```bash
git add app/builder/graph/GraphEditor.tsx app/builder/graph/nodes.tsx app/globals.css
git commit -m "Mapa do fluxo horizontal com layout automático, zoom, duplo clique e modo compacto"
```

---

### Task 11: Prévia do celular por bloco (`previewNodeId`)

**Files:**
- Modify: `lib/funnel-graph-engine.tsx`
- Create: `components/builder/PhonePreview.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `FunnelGraphEngine({ data, previewMode?, previewNodeId? })`; `PhonePreview({ data: FunnelData; nodeId: string | null })`.

- [ ] **Step 1: Prop `previewNodeId` no motor**

Em `lib/funnel-graph-engine.tsx`:

Assinatura: `export default function FunnelGraphEngine({ data, previewMode, previewNodeId }: { data: FunnelData; previewMode?: boolean; previewNodeId?: string })`.

Estado inicial de `answers` (substitua o `useState<Answers>({})` existente):

```tsx
const [answers, setAnswers] = useState<Answers>(() => {
  if (previewMode && previewNodeId) {
    const firstArea = data.areaOrder?.length ? data.areaOrder[0] : Object.keys(data.areas)[0];
    return firstArea ? { area: firstArea } : {};
  }
  return {};
});
```

No efeito que define o primeiro nó (o que começa com `if (currentId !== null || !startNode) return;`), antes de calcular o primeiro nó:

```tsx
if (previewMode && previewNodeId && byId.has(previewNodeId)) { setCurrentId(previewNodeId); return; }
```

Adicione `previewMode`, `previewNodeId` e `byId` às dependências desse efeito (se `byId` não for memoizado, memoize com `useMemo`). Nada mais muda — a remontagem por `key` no `PhonePreview` reinicia o estado quando o bloco muda.

- [ ] **Step 2: `components/builder/PhonePreview.tsx`**

```tsx
"use client";

import FunnelGraphEngine from "@/lib/funnel-graph-engine";
import type { FunnelData } from "@/lib/funnel-schema";

export function PhonePreview({ data, nodeId }: { data: FunnelData; nodeId: string | null }) {
  const theme = data.config.theme === "dark" ? "theme-dark" : "theme-light";
  return (
    <div className="phone-wrap">
      <div className="phone-frame">
        <div className={"phone-screen quiz-page " + theme}>
          <FunnelGraphEngine key={nodeId ?? "__start"} data={data} previewMode previewNodeId={nodeId ?? undefined} />
        </div>
      </div>
      <p className="phone-caption">Prévia ao vivo · {nodeId ? "bloco selecionado" : "tela de abertura"}</p>
    </div>
  );
}
```

Confira em `app/quiz/[slug]/preview/page.tsx` como o tema é aplicado hoje (classe `theme-light`/`theme-dark` num wrapper `.quiz-page`) e replique exatamente a mesma estrutura de classes aqui.

- [ ] **Step 3: CSS (fim do `globals.css`)**

```css
/* ---------- prévia do celular ---------- */
.phone-wrap{ display:flex; flex-direction:column; align-items:center; gap:10px; padding:16px; overflow:hidden; }
.phone-frame{ width:390px; height:760px; border-radius:36px; border:8px solid #111; background:#111; overflow:hidden; transform-origin:top center; transform:scale(var(--phone-scale, .72)); margin-bottom:calc(760px * (var(--phone-scale, .72) - 1)); }
.phone-screen{ width:100%; height:100%; overflow-y:auto; }
.phone-screen #app-shell{ min-height:100%; }
.phone-caption{ font-size:12px; color:var(--c-stone); margin:0; }
@media (min-width:1600px){ .phone-wrap{ --phone-scale:.85; } }
```

- [ ] **Step 4: Verificar e commitar**

Run: `npx tsc --noEmit && npm run build`. Regressão: `/quiz/default/preview` e `/quiz/default` (sem a prop) se comportam exatamente como antes. O componente será visto integrado na Task 12.

```bash
git add lib/funnel-graph-engine.tsx components/builder/PhonePreview.tsx app/globals.css
git commit -m "Motor aceita previewNodeId; prévia de celular por bloco pro Construtor"
```

---

### Task 12: Construtor unificado — cabeçalho, autosave, status, 3 colunas, configurações

**Files:**
- Modify: `app/api/funnels/route.ts` (aditivo), `app/builder/page.tsx` (reescrita do JSX e do estado de salvar), `app/globals.css`
- Create: `components/builder/SettingsDrawer.tsx`

**Interfaces:**
- Consumes: `GraphEditor` (com `onSelectedChange`), `PhonePreview`, `Button`, `Badge`, `toGraph`.
- Produces: `/api/funnels` responde `{ ok, funnels, publishedAt: Record<slug, string | null> }`.

- [ ] **Step 1: `/api/funnels` devolve `publishedAt` (aditivo)**

Abra `lib/list-funnels.ts` e confirme o nome do campo que indica quando um funil foi publicado (existe algo como `publishedAt` no item retornado por `listAllFunnels()`). Então, em `app/api/funnels/route.ts`:

```ts
export async function GET() {
  const items = await listAllFunnels();
  const publishedAt: Record<string, string | null> = {};
  for (const i of items) publishedAt[i.data.slug] = i.publishedAt ?? null;
  return NextResponse.json({ ok: true, funnels: items.map((i) => i.data), publishedAt });
}
```

Se o item não expuser essa data, adicione em `lib/list-funnels.ts` a leitura da chave `published:<slug>` no KV (existe → data atual; não existe → `null`) — só o suficiente pra distinguir "nunca publicado".

- [ ] **Step 2: `components/builder/SettingsDrawer.tsx`**

```tsx
"use client";

import type { FunnelData } from "@/lib/funnel-schema";
import { Button } from "@/components/ui/Button";

export function SettingsDrawer({
  active, onPatch, onSlugChange, onClose
}: { active: FunnelData; onPatch: (p: Partial<FunnelData>) => void; onSlugChange: (slug: string) => void; onClose: () => void }) {
  const cfg = (patch: Partial<FunnelData["config"]>) => onPatch({ config: { ...active.config, ...patch } });
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head"><strong>Configurações do funil</strong><Button size="sm" onClick={onClose}>Fechar</Button></div>
        <h3 className="drawer-section">Identificação</h3>
        <label className="in-field"><span>Nome interno</span><input value={active.nome} onChange={(e) => onPatch({ nome: e.target.value })} /></label>
        <label className="in-field"><span>Slug (URL: /quiz/SLUG)</span><input value={active.slug} onChange={(e) => onSlugChange(e.target.value)} /></label>
        <h3 className="drawer-section">Escritório e integrações</h3>
        <label className="in-field"><span>Nome do escritório</span><input value={active.config.firmName} onChange={(e) => cfg({ firmName: e.target.value })} /></label>
        <label className="in-field"><span>Profissional responsável</span><input value={active.config.lawyerName} onChange={(e) => cfg({ lawyerName: e.target.value })} /></label>
        <label className="in-field"><span>Registro (ex.: OAB/UF)</span><input value={active.config.oab} onChange={(e) => cfg({ oab: e.target.value })} /></label>
        <label className="in-field"><span>WhatsApp (DDI+DDD+número)</span><input value={active.config.whatsappNumber} onChange={(e) => cfg({ whatsappNumber: e.target.value })} /></label>
        <label className="in-field"><span>Pixel ID do Meta Ads</span><input value={active.config.metaPixelId} onChange={(e) => cfg({ metaPixelId: e.target.value })} /></label>
        <p className="b-help">O token da Conversions API fica nas variáveis de ambiente da Vercel, não aqui.</p>
        <h3 className="drawer-section">Aparência do quiz</h3>
        <div className="ui-pills">
          <button type="button" className={"ui-pill" + (active.config.theme !== "dark" ? " active" : "")} onClick={() => cfg({ theme: "light" })}>☀️ Claro</button>
          <button type="button" className={"ui-pill" + (active.config.theme === "dark" ? " active" : "")} onClick={() => cfg({ theme: "dark" })}>🌙 Escuro</button>
        </div>
        <p className="b-help">Tema fixo pra quem responde — não segue o sistema do lead.</p>
      </aside>
    </div>
  );
}
```

Os nomes dos campos de `config` (`firmName`, `lawyerName`, `oab`, `whatsappNumber`, `metaPixelId`, `theme`) devem ser conferidos em `lib/funnel-schema.ts` e na aba Configurações atual de `app/builder/page.tsx`; use exatamente os que existem.

- [ ] **Step 3: Reescrever `app/builder/page.tsx`**

Mantenha do arquivo atual: `LS_KEY`, `slugify`, `blankFunnel`, `downloadJson`, o `useEffect` de carga (merge servidor + localStorage, `?new=1`, `?slug=`), o `useEffect` que persiste no localStorage, `updateActive`, `novoFunil`, `duplicar`, `excluir`, `salvarNoDisco`, `publicar` (ajustado abaixo), o wrapper `Suspense`. **Remova:** `RAIL`, `RailId`, `step`, `railOpen`, `editingAreaKey`, `tab`, `OptionCanvasList`, `updateArea`, `addArea`, `removeArea`, `reorderAreas`, `salvarRascunho`, `draftMsg`, `saveMsg`, os imports de `EditableText/EditableHeadline`, `DEFAULT_QUESTIONS/DEFAULT_AREA_TEXT`, `Option`/`AreaContent`, e todo o JSX antigo (topbar, abas, rail, canvas, painel de config).

Estado novo em `BuilderInner`:

```tsx
const [published, setPublished] = useState<Record<string, string>>({});      // slug -> JSON publicado
const [publishedAt, setPublishedAt] = useState<Record<string, string | null>>({});
const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "nokv">("idle");
const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
const [settingsOpen, setSettingsOpen] = useState(false);
const [previewOpen, setPreviewOpen] = useState(false);
const [devMenuOpen, setDevMenuOpen] = useState(false);
const [switcherOpen, setSwitcherOpen] = useState(false);
const [publishMsg, setPublishMsg] = useState<string | null>(null);
const lastSavedJson = useRef<string>("");
```

No `useEffect` de carga, ao receber `data` de `/api/funnels`:

```tsx
const pub: Record<string, string> = {};
(data.funnels as FunnelData[]).forEach((f) => { pub[f.slug] = JSON.stringify(f); });
setPublished(pub);
setPublishedAt(data.publishedAt || {});
```

Derivados e autosave:

```tsx
const activeJson = active ? JSON.stringify(active) : "";
const isDirty = !!active && published[active.slug] !== activeJson;
const neverPublished = !!active && !publishedAt[active.slug];

useEffect(() => {
  if (!loaded || !active || activeJson === lastSavedJson.current) return;
  setSaveState("saving");
  const t = setTimeout(async () => {
    try {
      const res = await fetch("/api/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: activeJson });
      const d = await res.json();
      if (d.ok) { lastSavedJson.current = activeJson; setSaveState("saved"); } else setSaveState("nokv");
    } catch { setSaveState("nokv"); }
  }, 1500);
  return () => clearTimeout(t);
}, [activeJson, loaded, active]);
```

`publicar` passa a: após `data.ok`, executar

```tsx
setPublished((p) => ({ ...p, [active.slug]: activeJson }));
setPublishedAt((p) => ({ ...p, [active.slug]: new Date().toISOString() }));
setPublishMsg("Publicado ✓");
setTimeout(() => setPublishMsg(null), 3000);
```

JSX de retorno:

```tsx
<div className="in-app bl-shell">
  <AppNav current="builder" />
  {!active ? (
    <main className="in-container"><p className="dash-empty">Nenhum funil ainda.</p><Button variant="primary" onClick={novoFunil}>+ Criar meu primeiro funil</Button></main>
  ) : (
    <>
      <div className="bl-head">
        <div className="bl-head-left">
          <button type="button" className="bl-funnel-switch" onClick={() => setSwitcherOpen((v) => !v)}>{active.nome} <span className="bl-slug">/{active.slug}</span> ▾</button>
          {switcherOpen && (
            <div className="bl-dropdown">
              {funnels.map((f) => (
                <div key={f.slug} className={"bl-dropdown-item" + (f.slug === activeSlug ? " active" : "")}>
                  <button type="button" className="bl-dropdown-name" onClick={() => { setActiveSlug(f.slug); setSelectedNodeId(null); setSwitcherOpen(false); }}>{f.nome}</button>
                  <span><Button size="sm" variant="ghost" onClick={() => duplicar(f)}>Duplicar</Button><Button size="sm" variant="ghost" onClick={() => excluir(f.slug)}>Excluir</Button></span>
                </div>
              ))}
              <Button variant="primary" size="sm" onClick={novoFunil}>＋ Novo funil</Button>
            </div>
          )}
          <div className="bl-devmenu">
            <Button size="sm" variant="ghost" iconOnly title="Mais" onClick={() => setDevMenuOpen((v) => !v)}>⋯</Button>
            {devMenuOpen && (
              <div className="bl-dropdown">
                <button type="button" className="bl-dropdown-name" onClick={() => { downloadJson(active, `${active.slug}.json`); setDevMenuOpen(false); }}>Baixar JSON (backup)</button>
                <button type="button" className="bl-dropdown-name" onClick={() => { salvarNoDisco(); setDevMenuOpen(false); }}>Salvar em content/funnels (dev)</button>
              </div>
            )}
          </div>
        </div>
        <div className="bl-status">
          {neverPublished ? <Badge>⬤ Nunca publicado</Badge> : isDirty ? <Badge tone="orange">⬤ Alterações não publicadas</Badge> : <Badge tone="green">⬤ No ar · sem alterações</Badge>}
          <span className="bl-save">{saveState === "saving" ? "Salvando…" : saveState === "saved" ? "Salvo" : saveState === "nokv" ? "Não salvo (sem KV)" : ""}</span>
          {publishMsg && <span className="bl-save">{publishMsg}</span>}
        </div>
        <div className="bl-head-right">
          <Button iconOnly title="Configurações" onClick={() => setSettingsOpen(true)}>⚙</Button>
          <Button className="bl-preview-btn" onClick={() => setPreviewOpen(true)}>Ver prévia</Button>
          <Button href={`/quiz/${active.slug}/preview`} target="_blank">Pré-visualizar</Button>
          <Button variant="primary" disabled={!isDirty && !neverPublished} onClick={publicar}>Publicar</Button>
        </div>
      </div>

      <div className="bl-body">
        <div className="bl-editor">
          <GraphEditor key={active.slug} funnelData={active} graph={toGraph(active)} onChange={(g) => updateActive({ graph: g })} onSelectedChange={setSelectedNodeId} />
        </div>
        <div className={"bl-preview" + (previewOpen ? " open" : "")}>
          <div className="bl-preview-close"><Button size="sm" onClick={() => setPreviewOpen(false)}>Fechar</Button></div>
          <PhonePreview data={active} nodeId={selectedNodeId} />
        </div>
        {previewOpen && <div className="bl-preview-backdrop" onClick={() => setPreviewOpen(false)} />}
      </div>

      {settingsOpen && (
        <SettingsDrawer
          active={active}
          onPatch={(p) => updateActive(p)}
          onSlugChange={(raw) => { const s = slugify(raw); setFunnels((l) => l.map((f) => (f.slug === active.slug ? { ...f, slug: s } : f))); setActiveSlug(s); }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </>
  )}
</div>
```

Imports novos: `useRef`, `Button` (`@/components/ui/Button`), `Badge` (`@/components/ui/Badge`), `PhonePreview` (`@/components/builder/PhonePreview`), `SettingsDrawer` (`@/components/builder/SettingsDrawer`). `GraphEditor` e `toGraph` já são importados hoje.

- [ ] **Step 4: CSS do Construtor**

Substitua as seções `/* ---------- builder ---------- */` e `/* ---------- builder v2 ... ---------- */` e o bloco `RESPONSIVE: builder clássico` por:

```css
/* ---------- construtor ---------- */
.bl-shell{ display:flex; flex-direction:column; height:100vh; }
.bl-head{ display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:12px; padding:8px 32px 12px; border-bottom:1px solid var(--c-hairline); background:var(--c-canvas); }
.bl-head-left{ display:flex; align-items:center; gap:6px; position:relative; }
.bl-head-right{ display:flex; justify-content:flex-end; gap:8px; align-items:center; }
.bl-funnel-switch{ font-family:var(--font-ui); font-size:14px; font-weight:600; background:var(--c-surface); border:1px solid var(--c-hairline); border-radius:var(--r-btn); padding:8px 12px; cursor:pointer; }
.bl-slug{ font-weight:400; color:var(--c-steel); font-size:13px; margin-left:6px; }
.bl-dropdown{ position:absolute; top:44px; left:0; z-index:50; background:var(--c-canvas); border:1px solid var(--c-hairline); border-radius:12px; box-shadow:var(--sh-modal); padding:8px; min-width:320px; display:flex; flex-direction:column; gap:4px; }
.bl-devmenu{ position:relative; } .bl-devmenu .bl-dropdown{ min-width:240px; left:auto; right:0; }
.bl-dropdown-item{ display:flex; align-items:center; justify-content:space-between; gap:8px; padding:4px 6px; border-radius:8px; }
.bl-dropdown-item.active{ background:var(--c-surface); }
.bl-dropdown-name{ font-family:var(--font-ui); font-size:14px; text-align:left; background:none; border:none; cursor:pointer; padding:8px; flex:1; border-radius:8px; }
.bl-dropdown-name:hover{ background:var(--c-surface); }
.bl-status{ display:flex; align-items:center; gap:10px; justify-content:center; }
.bl-save{ font-size:13px; color:var(--c-stone); }
.bl-body{ flex:1; display:grid; grid-template-columns:7fr 3fr; min-height:0; position:relative; }
.bl-editor{ min-width:0; display:flex; }
.bl-editor .b-graph-shell{ flex:1; }
.bl-preview{ border-left:1px solid var(--c-hairline); background:var(--c-surface-soft); overflow:auto; display:flex; flex-direction:column; }
.bl-preview-close{ display:none; padding:8px 12px; justify-content:flex-end; }
.bl-preview-btn{ display:none; }
.bl-preview-backdrop{ display:none; }
@media (max-width:1279px){
  .bl-body{ grid-template-columns:1fr; }
  .bl-preview{ position:fixed; top:0; right:0; bottom:0; width:min(460px, 100vw); z-index:120; transform:translateX(100%); transition:transform .2s; box-shadow:var(--sh-modal); }
  .bl-preview.open{ transform:translateX(0); }
  .bl-preview-close{ display:flex; }
  .bl-preview-btn{ display:inline-flex; }
  .bl-preview-backdrop{ display:block; position:fixed; inset:0; background:rgba(15,15,15,.3); z-index:110; }
}
@media (max-width:860px){
  .bl-head{ grid-template-columns:1fr; padding:8px 16px 12px; }
  .bl-status{ justify-content:flex-start; }
  .bl-head-right{ justify-content:flex-start; flex-wrap:wrap; }
}
.drawer-overlay{ position:fixed; inset:0; background:rgba(15,15,15,.3); z-index:150; }
.drawer{ position:absolute; top:0; right:0; bottom:0; width:min(420px, 100vw); background:var(--c-canvas); box-shadow:var(--sh-modal); padding:20px; overflow-y:auto; }
.drawer-head{ display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
.drawer-section{ font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--c-stone); margin:18px 0 10px; }

/* peças do editor de bloco (Inspector) e dos nós, que já existiam */
.b-field{ margin-bottom:12px; } .b-field label{ display:block; margin-bottom:4px; }
.b-help{ font-size:13px; color:var(--c-slate); line-height:1.5; margin:0 0 12px; }
.b-add-opt{ border:1.5px dashed var(--c-hairline-strong); background:none; color:var(--c-slate); border-radius:10px; padding:10px 12px; width:100%; text-align:left; font-size:13px; cursor:pointer; margin-top:4px; font-family:var(--font-ui); }
.b-opt-remove{ border:none; background:none; color:var(--c-stone); cursor:pointer; font-size:13px; padding:4px; }
.b-editable{ cursor:text; border-radius:6px; outline:1px dashed transparent; transition:outline-color .12s; }
.b-editable:hover{ outline-color:var(--c-hairline-strong); }
.b-inline-edit{ width:100%; font:inherit; color:inherit; background:var(--c-canvas); border:1px solid var(--c-primary); border-radius:6px; padding:4px 6px; }
.b-placeholder{ color:var(--c-stone); font-style:italic; }
```

Antes de apagar as seções antigas, rode `grep -rn "b-drag-handle\|b-opt-editable\|b-section" --include=*.tsx .` — qualquer classe ainda usada por `Inspector.tsx`/`nodes.tsx`/`EditableInline.tsx` deve ter sua regra copiada pra cá (trocando cores/fontes pelos tokens), não apagada.

- [ ] **Step 5: Verificar e commitar**

Run: `npx tsc --noEmit && npm test && npm run build`. Navegador `/builder?slug=salario-maternidade-avancada` em 1440: cabeçalho com status; editar um texto no Inspector → prévia muda ao vivo e status vira laranja + "Salvando…"/"Salvo" (ou "Não salvo (sem KV)" local); ⚙ abre a gaveta; ⋯ mostra os itens de dev; "Publicar" desabilitado quando sem alteração (se houver KV). 1024px: "Ver prévia" abre o painel deslizante. 390px: lista → editor em tela cheia → "Ver prévia" abre a prévia.

```bash
git add app/api/funnels/route.ts lib/list-funnels.ts components/builder/SettingsDrawer.tsx app/builder/page.tsx app/globals.css
git commit -m "Construtor unificado: status de publicação, autosave, um botão Publicar, mapa + editor + prévia ao vivo"
```

---

### Task 13: Remover o motor antigo, código morto e atualizar o README

**Files:**
- Delete: `lib/funnel-engine.tsx`
- Modify: `app/globals.css` (varredura), `README.md`

- [ ] **Step 1: Apagar o motor antigo e checar referências**

Run: `git rm lib/funnel-engine.tsx`. Depois `grep -rn "funnel-engine\"" --include=*.ts --include=*.tsx .` → nada; `grep -rn "funnel-engine" --include=*.ts --include=*.tsx .` → só `funnel-engine-shared` e `funnel-graph-engine`. Se `lib/funnel-graph-adapter.ts` mencionar `lib/funnel-engine.tsx` em comentário, atualize o comentário.

- [ ] **Step 2: Varredura de CSS morto**

Para cada prefixo abaixo, rode `grep -rn "<prefixo>" --include=*.tsx .`; se não houver uso, remova as regras do `globals.css`: `b-rail`, `b-canvas`, `b-tabs`, `b-tab`, `b-topbar`, `b-body`, `b-funnel-switch`, `b-funnel-dropdown`, `b-funnel-list`, `b-funnel-item`, `b-section`, `b-config-panel`, `b-canvas-hint`, `b-opt-editable`, `b-drag-handle`, `area-switch`, `area-pill`, `.btn` (a classe antiga `.btn`/`.btn.primary`/`.btn.small`), `kanban-banco`. Confira também os marcadores `/* === RESPONSIVE: ... === */` — apague os que sobraram vazios.

- [ ] **Step 3: `README.md`**

Reescreva o topo (mantenha, abaixo, as seções de variáveis de ambiente e deploy/KV do README atual):

```markdown
# Intake

Quiz de pré-triagem de leads de anúncio + construtor visual de fluxo + Kanban de leads.
Quem está pronto vai pro WhatsApp do profissional com um resumo; quem só tem dúvida cai
no Kanban pra ser respondido depois. Roda no plano free da Vercel.

## Telas
- **`/` Início** — dúvidas aguardando resposta, números do período por funil, últimos leads.
- **`/builder` Construtor** — mapa do fluxo (esquerda→direita, zoom), editor do bloco
  selecionado e prévia do celular ao vivo. O rascunho salva sozinho; **Publicar** é o único
  botão que muda o que está no ar. O status no topo diz se há alteração não publicada.
- **`/kanban` Leads** — colunas arrastáveis, mês corrente. **`/kanban/banco` Histórico** — meses anteriores.
- **`/quiz/[slug]`** — o funil publicado que o lead responde. **`/quiz/[slug]/preview`** — o rascunho.
- **`/login`** — protege Leads/Histórico (`KANBAN_USER`/`KANBAN_PASSWORD`).

## Como funciona o funil
A lógica é um grafo (`FunnelData.graph`): blocos de pergunta, tela intermediária, condição,
pontuação e dois finais (WhatsApp / dúvida). Funis antigos sem `graph` são convertidos em
memória por `lib/funnel-graph-adapter.ts`. O motor é `lib/funnel-graph-engine.tsx`.

## Rodando
`npm install` · `npm run dev` · `npm test` · `npm run build`

## Pra quem vai continuar o trabalho
Leia `AGENTS.md` e `docs/HANDOFF.md`.
```

- [ ] **Step 4: Verificar e commitar**

Run: `npx tsc --noEmit && npm test && npm run build`.

```bash
git add -A lib/funnel-engine.tsx lib/funnel-graph-adapter.ts app/globals.css README.md
git commit -m "Remove o motor antigo e CSS morto; README reflete o Intake"
```

---

### Task 14: Verificação final, handoff e push

**Files:**
- Modify: `docs/HANDOFF.md`, este plano

- [ ] **Step 1: Regressão do quiz (obrigatória)**

Para `default`, `salario-maternidade`, `salario-maternidade-avancada`, em `/quiz/<slug>/preview`: percorra alta intenção até o formulário de WhatsApp (confira o texto do link `wa.me`) e baixa intenção até "Pergunta recebida ✓". Confirme score 82% no caminho padrão do `default` (urgência "recente" + 2 dores). Confirme que fonte, cores e tema estão iguais aos de antes (compare com a versão publicada em produção se preciso).

- [ ] **Step 2: Passada por tela em 1440 e 390**

`/`, `/builder` (3 funis), `/kanban`, `/kanban/banco`, `/login`. Sem erro no console. Sem scroll horizontal indevido.

- [ ] **Step 3: Marcar as caixas deste plano e escrever o handoff**

Adicione no topo de `docs/HANDOFF.md`:

```markdown
## <data> · <quem>
- Parei em: plano `2026-09-17-intake-redesign-app-interno.md` concluído (Tasks 1–14).
- Próximo: sub-projeto 2 — redesign do quiz do lead (precisa de brainstorm + spec próprios).
- Cuidado com: `app/quiz.css` é intocável até o spec 2; `previewNodeId` só existe em previewMode.
```

- [ ] **Step 4: Commit e push**

```bash
git add docs/HANDOFF.md docs/superpowers/plans/2026-09-17-intake-redesign-app-interno.md
git commit -m "Fecha o plano do redesign do app interno; handoff atualizado"
git push origin main
```

Confirme o deploy na Vercel e refaça o Step 1 em produção (`/quiz/<slug>/preview`) e o login em `/kanban`.
