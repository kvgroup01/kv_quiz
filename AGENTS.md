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
  CSS do quiz (NÃO mexer sem spec próprio). (Os três são criados nas Tasks 2–3 do plano ativo.)

## Convenções
- CSS puro com variáveis. Sem dependência nova sem motivo forte. Sem tema escuro no app interno.
- Verificação antes de commitar: `npx tsc --noEmit` → `npm test` → `npm run build` → navegador
  (1440px e 390px). Cliques por script às vezes não disparam blur/foco de verdade no ambiente de
  automação — quando algo "não salva", teste com clique real antes de caçar bug.
- Sem KV local, Kanban/Início ficam vazios e autosave mostra "Não salvo (sem KV)". É esperado.
- Commits pequenos, em português, explicando o porquê. Trabalho direto na `main`; push só quando
  a regressão do quiz (`/quiz/<slug>/preview` nos 3 funis) passar.

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
