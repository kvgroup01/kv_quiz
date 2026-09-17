# Intake — Redesign do quiz do lead (sub-projeto 2)

Data: 2026-09-17 · Status: aprovado em conversa, aguardando plano

## 1. Contexto

O app interno já foi reconstruído sobre os tokens do Notion (spec
`2026-09-17-intake-redesign-app-interno-design.md`). O quiz que o lead responde
(`app/quiz/[slug]`, `app/quiz.css`, `lib/funnel-engine-shared.tsx`,
`lib/funnel-graph-engine.tsx`) ficou com a estética anterior: Inter Tight + Fraunces
itálico + Kalam manuscrita, cartão escuro verde-petróleo, pílulas e raios grandes.

O usuário quer que o quiz **pareça da mesma família do Intake**, mantendo o fluxo,
as perguntas, a ordem das telas e as animações que já existem. É uma troca de pele,
não de comportamento. Como o quiz é visto pelo lead do advogado (não pelo gestor),
cada funil ganha **uma cor de destaque** escolhida entre presets — a base é neutra.

## 2. Decisões

| Tema | Decisão |
|---|---|
| Estrutura do fluxo | Inalterada: mesmas 8 telas, mesma ordem, mesmo motor. |
| Identidade | Base Notion neutra (branco/cinzas, Inter) + 1 cor de destaque por funil (preset). Tema claro/escuro por funil continua. |
| Progresso | Barra fina no topo, sem número. |
| Abordagem técnica | `quiz.css` reescrito sobre `tokens.css`; marcação dos componentes quase intacta; sem usar os primitivos `components/ui/` no quiz. |
| Ênfase no título | `_texto_` (hoje serifa itálica) vira negrito na cor de destaque. |
| Emojis | Ficam. |
| Cor livre | Não. 8 presets com contraste garantido. |

## 3. Fundação visual do quiz

**Fonte:** Inter em tudo. `app/layout.tsx` deixa de carregar Inter Tight, Fraunces,
Kalam e JetBrains Mono (nenhum outro lugar usa).

**Paleta (variáveis `--q-*` definidas em `quiz.css`, lendo `tokens.css`):**

| Variável | Claro | Escuro |
|---|---|---|
| `--q-bg` | `#ffffff` | `#191919` |
| `--q-surface` | `#f6f5f4` | `#202020` |
| `--q-hairline` | `#e5e3df` | `#2f2f2f` |
| `--q-ink` | `#1a1a1a` | `#e6e6e6` |
| `--q-ink-soft` | `#5d5b54` | `#9b9b9b` |
| `--q-ink-mute` | `#a4a097` | `#6f6f6f` |
| `--q-accent` | preset (padrão `#5645d4`) | mesmo hex |
| `--q-accent-tint` | `color-mix(in srgb, var(--q-accent) 12%, var(--q-bg))` | 22% em vez de 12% |
| `--q-on-accent` | `#ffffff` | `#ffffff` |
| `--q-error` | `#e03131` | `#ff6b6b` |

O tema é a classe `.theme-light`/`.theme-dark` no `.quiz-page` (já existe, criado pelas
páginas do quiz e pelo `PhonePreview`); o accent entra como `style={{ "--q-accent": hex }}`
no `#app-shell`, raiz do motor — a variável herda pra todos os filhos. As variáveis antigas
(`--bg`, `--ink`, `--bg-card`, `--option-border`, `--purple-text`, `--danger-text`…)
deixam de existir — quem as usava é só o `quiz.css` atual, que será substituído.

**Presets de destaque** (`lib/quiz-theme.ts`), todos com contraste ≥ 4.5:1 contra
texto branco:

| id | nome | hex |
|---|---|---|
| `roxo` | Roxo (padrão) | `#5645d4` |
| `azul` | Azul | `#2456c9` |
| `verde` | Verde | `#1a7f37` |
| `petroleo` | Petróleo | `#0f5c66` |
| `terracota` | Terracota | `#b5502c` |
| `rosa` | Rosa | `#b8236b` |
| `ambar` | Âmbar | `#9a5b00` |
| `grafite` | Grafite | `#37352f` |

**Formas:** cartão 20px; opção 12px, borda 1px hairline, fundo `--q-bg`
(selecionada: borda 2px accent + fundo accent-tint); botão 8px (primário: accent com
texto branco; secundário: borda hairline; ghost: sem borda); chips/tags 6px; inputs
8px, 44px de altura. Sem sombras. Foco visível: `outline 2px accent`.

**Tipografia:** título de abertura 28/600 (−0.3px); título de pergunta 22/600; texto
16/400; notas 14/400 `--q-ink-soft`; micro-uppercase 11/600/+1px `--q-ink-mute`;
score 36/600 tabular.

## 4. Telas

**Casca comum (todas as telas).** Container 480px centralizado, padding 20px
lateral / 16px topo. Barra de progresso 3px no topo da página (trilho `--q-hairline`,
preenchimento accent, `transition: width .4s`). Abaixo: linha com "← Voltar" (ghost,
esquerda; oculto na abertura) e nome do escritório em micro-uppercase à direita.
Rodapé: aviso legal + "Escritório · Profissional · Registro" em 12px `--q-ink-mute`.
Faixa "🔧 PRÉ-VISUALIZAÇÃO…" continua no topo, fundo `#dd5b00`, 13px.

**Abertura (start + primeira pergunta).** Saudação 14px `--q-ink-soft` (texto do
funil, sem fonte manuscrita); título 28/600 com ênfase em accent; subtítulo 16px
`--q-ink-soft`; chip "💬 Sem custo…" em accent-tint, 13px; cartão de pergunta em
`--q-surface`, título 18/600, nota 14px, opções. Uma tela só.

**Escolha única / múltipla.** Título 22/600; nota 14px; opções empilhadas com gap
8px: quadrado 36px `--q-surface` raio 8px com o emoji à esquerda, texto 16px; na
múltipla, caixa de seleção 20px à direita (borda hairline; marcada: accent com ✓
branco) e botão "Continuar" primário full-width, desabilitado até `minSelected`.
`footerNote` (honorários) em caixa `--q-surface` 13px `--q-ink-soft`.

**Loading.** 🔎 em círculo 56px `--q-surface`; título 22/600; trilho 4px com
preenchimento accent; status 13px; os fatos como linhas emoji + texto 14px separadas
por hairline; "Continuar →" primário aparece ao concluir. `durationMs` inalterado.

**Anel de score.** Mesmo SVG; traço accent, trilho `--q-hairline`; número 36/600 no
centro; label micro-uppercase; "Continuar" primário.

**Confiança.** Título 22/600 + 3 itens: ✓ em círculo 24px accent-tint (✓ na cor
accent), texto 15px; "Continuar".

**Formulário de WhatsApp (terminalLead).** Faixa de resultado em accent-tint (texto
`--q-ink`), com badge "Prioridade NN%" (accent, texto branco, raio 6px); título
22/600; campos com label micro-uppercase e input 44px; botão primário full-width
"Chamar no WhatsApp →". Mensagem e link inalterados.

**Dúvida (terminalDoubt).** Eyebrow micro-uppercase "Antes de você decidir"; título;
FAQ como lista separada por hairlines (pergunta 15/600, resposta 14px `--q-ink-soft`,
sem acordeão novo — o comportamento atual se mantém); cartão "Sua dúvida" em
`--q-surface` com textarea, botão de áudio secundário (gravando: borda e texto
`--q-error`, ponto pulsante), nome/telefone, "Enviar minha dúvida" primário. Tela
final "Pergunta recebida ✓": ✓ em círculo 56px accent-tint, título 22/600, texto
14px, nota de demonstração em preview.

**Escuro.** Mesmas formas com a coluna "Escuro" da tabela.

## 5. Cor de destaque por funil

- `lib/funnel-schema.ts`: `config.accent?: AccentId`. Ausente = `roxo`. Nenhum JSON
  em `content/funnels` precisa mudar.
- `lib/quiz-theme.ts`: `export type AccentId`, `export const ACCENTS: {id, label, hex}[]`,
  `export function accentHex(id?: string): string` (desconhecido → roxo).
- `lib/funnel-graph-engine.tsx`: aplica `style={{ "--q-accent": accentHex(data.config.accent) }}`
  no `#app-shell` (raiz do motor). O `.quiz-page` com a classe de tema continua sendo criado
  por `/quiz/[slug]/page.tsx`, `/quiz/[slug]/preview/page.tsx` e `PhonePreview` — o motor não
  o cria. Como `PhonePreview` renderiza o mesmo motor, a prévia do Construtor reflete a cor
  imediatamente.
- `components/builder/SettingsDrawer.tsx`: abaixo de Claro/Escuro, linha "Cor de
  destaque" com 8 bolinhas 28px (borda 2px `--c-ink` na ativa, `title` com o nome),
  clicar → `cfg({ accent: id })`.

## 6. Progresso

- `lib/quiz-progress.ts`: `progressFor(graph: FunnelGraph, currentId: string | null): number`
  (0–1). Caminho canônico = BFS do `start` até o primeiro `terminalLead`/`terminalDoubt`
  alcançado, seguindo `effectiveEdges`. Se `currentId` está no caminho, progresso =
  índice ÷ (tamanho − 1). Se não (ramo lateral), progresso = profundidade BFS do bloco
  ÷ (profundidade do bloco + menor distância dele até um terminal); sem terminal
  alcançável → 0.5. Terminais → 1. `null`/desconhecido → 0. Puro; testado em
  `tests/quiz-progress.test.ts` (cadeia linear, ramo, terminal, desconhecido).
- O motor calcula `progressFor(graph, currentId)` e renderiza
  `<div className="q-progress"><span style={{ width: `${p*100}%` }} /></div>` como
  primeiro filho do `#app-shell`. Nós `score` (invisíveis) nunca são `currentId`
  visível, então não afetam.

## 7. Arquivos

| Arquivo | Ação |
|---|---|
| `app/quiz.css` | reescrever (≈250 linhas) |
| `app/layout.tsx` | remover Inter Tight/Fraunces/Kalam/JetBrains Mono do link do Google Fonts |
| `lib/funnel-engine-shared.tsx` | trocar classes/estrutura pontual das telas; remover `.hand`/`.eyebrow` manuscritos; `parseRich` passa a emitir `<em class="q-em">` para `_x_` |
| `lib/funnel-graph-engine.tsx` | wrapper com `--q-accent`; barra de progresso |
| `lib/funnel-schema.ts` | `config.accent?: AccentId` |
| `lib/quiz-theme.ts`, `lib/quiz-progress.ts`, `tests/quiz-progress.test.ts` | novos |
| `components/builder/SettingsDrawer.tsx` | seletor de accent |
| `components/builder/PhonePreview.tsx` | nada (herda) |

Sem mudança em: APIs, KV, `lib/leads-store.ts`, Pixel/CAPI, formato da mensagem do
WhatsApp, `lib/funnel-graph-schema.ts`, `lib/funnel-graph-adapter.ts`, app interno
(`globals.css`, `components/ui/`).

## 8. Fora do escopo

Mudar perguntas/ordem/textos; animações novas; color picker livre; fonte por funil;
logo do escritório; acordeão novo no FAQ; número "3 de 8" no progresso.

## 9. Riscos

- **Regressão de comportamento ao mexer no `funnel-engine-shared.tsx`.** Mitigação:
  mudanças só em `className`/estrutura de apresentação; roteiro de regressão idêntico
  ao do sub-projeto 1 (3 funis, 82%, link do WhatsApp, "Pergunta recebida ✓").
- **`color-mix()`** não existe em navegadores muito antigos (< 2023). Aceito: público
  de anúncio em celular atual; fallback é o accent-tint ficar transparente (o layout
  continua legível porque a seleção também tem borda).
- **Contraste do accent-tint no escuro** pode sumir para presets escuros (grafite,
  petróleo). Mitigação: no `.theme-dark`, `--q-accent-tint` usa 22% em vez de 12%.

## 10. Verificação / aceite

1. `npx tsc --noEmit` → `npm test` (inclui `quiz-progress`) → `npm run build`.
2. `/quiz/<slug>/preview` nos 3 funis, 390px, claro e escuro: alta intenção até o
   WhatsApp (82% no `default`, link com o template completo) e baixa até "Pergunta
   recebida ✓"; sem erro de console; nenhuma fonte além de Inter carregada.
3. Barra de progresso cresce a cada pergunta e chega a 100% nas telas finais.
4. Trocar o accent nas Configurações do Construtor muda a prévia na hora e o
   `/preview` após o autosave (ou o localStorage, sem KV).
5. Passada visual em 1440px (o quiz continua centralizado em 480px).
