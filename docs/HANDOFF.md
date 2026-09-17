# Handoff

## 2026-09-17 · Codex
- Parei em: Task 12 implementada até o Step 4. `/api/funnels` agora devolve `publishedAt`; o Builder foi unificado com status/autosave, seletor de funil, configurações, mapa e prévia de celular.
- Próximo: concluir o Step 5 visual da Task 12 em 1440px, 1024px e 390px; depois seguir para Task 13, removendo o motor antigo e o CSS morto.
- Cuidado com: `npx tsc --noEmit`, `npm test` (10 testes), `npm run build`, as rotas principais e `/api/funnels` com `publishedAt` passaram. O CUA não expõe navegador (`apps: []`, `browsers: []`), então a inspeção de interação, autosave e responsividade permanece pendente. Não fazer push antes da Task 14.

## 2026-09-17 · Codex
- Parei em: Task 11 concluída. O motor aceita `previewNodeId` com estado inicial compatível, e `PhonePreview` renderiza o funil no frame de 390px com o tema do funil e reset por bloco.
- Próximo: Task 12 — unificar o Construtor com cabeçalho, autosave/status, três colunas, prévia e configurações.
- Cuidado com: `npx tsc --noEmit`, `npm test` (10 testes), `npm run build` e HTTP 200 em `/builder?slug=default`, `/`, `/quiz/default/preview`, `/quiz/salario-maternidade/preview` e `/quiz/salario-maternidade-avancada/preview` passaram. O CUA continua sem navegador (`apps: []`, `browsers: []`), então a inspeção visual 1440/390px permanece pendente. Não fazer push antes da Task 14.

## 2026-09-17 · Codex
- Parei em: Task 10 implementada até o código e verificação técnica. O mapa do fluxo agora usa `layoutLeftToRight`, é horizontal, não arrastável, tem zoom/fitView, duplo clique para aproximar, seleção exposta, placeholder do Inspector e nós compactos abaixo de zoom 0,6.
- Próximo: concluir o Step 4 visual da Task 10 em 1440px e 390px; depois seguir para Task 11 (`previewNodeId` e prévia de celular por bloco).
- Cuidado com: `npx tsc --noEmit`, `npm test` (10 testes), `npm run build` e HTTP 200 em `/builder?slug=default`, `/` e nos três previews passaram. O CUA não expõe navegador (`apps: []`, `browsers: []`), portanto zoom, duplo clique, arraste e inspeção visual permanecem sem validação. Não fazer push antes da Task 14.

## 2026-09-17 · Codex
- Parei em: Task 9 concluída. Adicionados `lib/graph-layout.ts` e `tests/graph-layout.test.ts`; o layout em camadas usa `effectiveEdges`, posiciona ramificações verticalmente e separa nós inalcançáveis em coluna final.
- Próximo: Task 10 — integrar o layout ao mapa do fluxo, com orientação horizontal, zoom, duplo clique, modo compacto e seleção exposta.
- Cuidado com: `npx tsc --noEmit`, `npm test` (10 testes) e `npm run build` passaram. A verificação visual das Tasks 2 Step 7, 3 Step 8, 4 Step 6, 6 Step 4, 7 Step 4 e 8 Step 3 permanece pendente porque o CUA não expõe navegador (`apps: []`, `browsers: []`). Não fazer push antes da Task 14.

## 2026-09-17 · Codex
- Parei em: Tasks 7 e 8 implementadas até os passos de código/CSS. A divergência foi resolvida renomeando o Histórico para classes `hist-*`; Kanban e Histórico usam os primitivos novos e não há referências `kanban-banco-*` ou `kanban-card*` em JSX.
- Próximo: concluir as verificações visuais pendentes das Tasks 2 Step 7, 3 Step 8, 4 Step 6, 6 Step 4, 7 Step 4 e 8 Step 3; depois iniciar Task 9.
- Cuidado com: `npx tsc --noEmit`, `npm test` (6 testes) e `npm run build` passaram. O CUA segue sem navegador exposto (`apps: []`, `browsers: []`), então os passos visuais continuam sem execução. Não fazer push antes da Task 14.

## 2026-09-17 · Codex
- Parei em: Task 7 do plano `docs/superpowers/plans/2026-09-17-intake-redesign-app-interno.md`; Steps 1–2 concluídos. LeadCard/modal e Kanban usam os primitivos novos, mantendo drag-and-drop, exclusão e modal.
- Próximo: resolver a divergência do Step 3: ele pede remover `.kanban-banco-*` embora a Task 8 seja a responsável por trocar essas classes no Histórico; depois concluir CSS/verificação da Task 7.
- Cuidado com: `npx tsc --noEmit`, `npm test` e `npm run build` passaram. CUA segue sem navegador (`apps: []`, `browsers: []`); Tasks 2 Step 7, 3 Step 8, 4 Step 6 e 6 Step 4 aguardam inspeção visual. Não fazer push antes da Task 14.

## 2026-09-17 · Codex
- Parei em: Task 6 do plano `docs/superpowers/plans/2026-09-17-intake-redesign-app-interno.md`; Steps 1–3 concluídos. A home agora renderiza o Dashboard com dúvidas pendentes, números por período/funil, últimos leads e modal compartilhado.
- Próximo: concluir o Step 4 da Task 6 com conferência visual em 1440px e 390px; depois iniciar Task 7.
- Cuidado com: `npx tsc --noEmit`, `npm test` e `npm run build` passaram. Tasks 2 Step 7, 3 Step 8 e 4 Step 6 também aguardam navegador; CUA segue sem navegador exposto. Não fazer push antes da Task 14.

## 2026-09-17 · Codex
- Parei em: Task 5 do plano `docs/superpowers/plans/2026-09-17-intake-redesign-app-interno.md` concluída. Criados `lib/dashboard-metrics.ts` e `tests/dashboard-metrics.test.ts`, cobrindo saudação, períodos, pendências, contagens e tempo relativo.
- Próximo: Task 6 — construir a tela Início/dashboard com os dados das APIs existentes.
- Cuidado com: Tasks 2 Step 7, 3 Step 8 e 4 Step 6 ainda aguardam conferência visual porque o CUA não expõe navegador nesta sessão; não fazer push antes da Task 14.

## 2026-09-17 · Codex
- Parei em: Task 4 do plano `docs/superpowers/plans/2026-09-17-intake-redesign-app-interno.md`; Steps 1–5 concluídos. AppNav agora usa a marca Intake e pílulas, as chaves de navegação foram atualizadas, ThemeToggle foi removido e o login usa Card/Button e os campos internos.
- Próximo: concluir o Step 6 da Task 4 com a conferência visual em 1440px e 390px; também permanecem pendentes os Steps 7 da Task 2 e 8 da Task 3 pelo mesmo motivo, depois iniciar Task 5.
- Cuidado com: `npx tsc --noEmit`, `npm test` e `npm run build` passaram. O CUA continua sem navegador exposto (`apps: []`, `browsers: []`); não fazer push antes da Task 14.

## 2026-09-17 · Codex
- Parei em: Task 3 do plano `docs/superpowers/plans/2026-09-17-intake-redesign-app-interno.md`; Steps 1–7 concluídos. Criados `Card`, `Button`, `Badge`, `PillTabs`, `Stat`, `DataTable` e `PageHeader`, com estilos `ui-*` em `app/globals.css`.
- Próximo: concluir o Step 8 da Task 3 com a conferência visual em 1440px e 390px; depois iniciar Task 4.
- Cuidado com: `npx tsc --noEmit`, `npm test` e `npm run build` passaram. O CUA continua sem navegador exposto (`apps: []`, `browsers: []`), portanto a conferência visual permanece pendente. O dev server está em `http://localhost:3000`; não fazer push antes da Task 14.

Entrada mais recente no topo. Formato: data · quem · parei em · próximo · cuidado com.

## 2026-09-17 · Codex
- Parei em: Task 2 do plano `docs/superpowers/plans/2026-09-17-intake-redesign-app-interno.md`; Steps 1–6 e 8 concluídos. CSS do quiz isolado em `app/quiz.css`, tokens criados, reset global e wrappers internos aplicados.
- Próximo: concluir o Step 7 da Task 2 com a passada visual no navegador em 1440px e 390px; depois iniciar Task 3.
- Cuidado com: `npx tsc --noEmit`, `npm test` e `npm run build` passaram; as rotas `/`, os três previews e `/builder`/`/kanban` responderam HTTP 200. A sessão não expôs navegador ao CUA (`listBrowsers()` vazio), então a inspeção visual não foi executada. O dev server está rodando em `http://localhost:3000`; não fazer push antes da Task 14.

## 2026-09-17 · Claude
- Parei em: Task 1 do plano `docs/superpowers/plans/2026-09-17-intake-redesign-app-interno.md` concluída
  (docs de entrada, `tsx` + `npm test`, teste de fumaça).
- Próximo: Task 2 — isolar o CSS do quiz em `app/quiz.css` e criar `app/tokens.css`. Seguir o plano
  tarefa por tarefa, marcando as caixas.
- Cuidado com: o spec aprovado está em `docs/superpowers/specs/2026-09-17-intake-redesign-app-interno-design.md`
  — leia antes da Task 2. O dev server pode estar rodando na porta 3000. Não faça push antes da Task 14.
