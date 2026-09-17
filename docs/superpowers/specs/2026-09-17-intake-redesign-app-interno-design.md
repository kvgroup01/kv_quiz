# Intake — Redesign do app interno (sub-projeto 1)

**Data:** 2026-09-17
**Status:** aprovado em conversa, aguardando revisão do spec escrito
**Escopo:** app interno (Início, Construtor, Leads, Histórico, Login). O quiz público do lead (`/quiz/[slug]`) é o **sub-projeto 2**, com brief próprio, e **não muda** aqui.

## 1. Contexto e motivação

O produto (até aqui chamado "Radar Jurídico") é uma ferramenta pra gestor de tráfego: constrói quizzes de pré-triagem que rodam em anúncios, encaminha quem está pronto pro WhatsApp do profissional e captura a dúvida de quem não está, num Kanban. Funciona, mas o app interno ficou contra-intuitivo com o crescimento:

1. **O Construtor tem dois editores** pra mesma coisa — aba "Perguntas" (trilha linear) e aba "Fluxo" (grafo). Duas fontes de verdade, confusão sobre qual usar.
2. **A home não diz o que fazer** — é uma lista de funis com botões; não mostra dúvidas esperando resposta nem como cada funil rende.
3. **Rascunho vs. publicado é confuso** — dois botões ("Salvar rascunho" / "Publicar"), sem indicador do que está no ar.

Além disso o nome é nichado ("jurídico") e o produto serve qualquer profissional. Novo nome: **Intake** (termo real de escritórios/clínicas pro primeiro contato do cliente).

Referência visual: dashboard estilo bento (cards brancos arredondados sobre fundo lavanda suave, navegação em pílulas, cabeçalho "aqui está o que precisa da sua atenção") + tokens do `NOTION DESIGN.md` (raiz da pasta de contexto, fora do repo).

## 2. Decisões tomadas (com o usuário)

| Tema | Decisão |
|---|---|
| Escopo | App interno primeiro; quiz do lead depois, em spec separado |
| Construtor | Um editor só: mapa do fluxo + editor do bloco + prévia ao vivo. Aba "Perguntas" e trilha lateral somem. |
| Publicação | Autosave do rascunho + um botão "Publicar" + status sempre visível. Some "Salvar rascunho". |
| Home | Dúvidas aguardando resposta (destaque), números do período por funil, tabela de últimos leads. Sem lista de funis. |
| Tema | Só claro no app interno. Tema por funil do quiz (escolha do escritório) inalterado. |
| Nome | **Intake** |
| Mapa do fluxo | Sempre horizontal, esquerda→direita, layout automático (sem arrastar pra posicionar), zoom +/−/ajustar, duplo clique foca o bloco, zoom semântico |
| Leads em duas telas | Não é dor — estrutura mantida, só restilizada e renomeada |

## 3. Abordagem técnica

**Camada de tokens + primitivos mínimos + telas reconstruídas.** Sem dependência nova. CSS puro, seguindo a convenção do projeto.

- `app/tokens.css` — variáveis CSS extraídas do `NOTION DESIGN.md` (cores, tipografia, raios, espaçamentos, elevação). Fonte: **Inter** via Google Fonts (base do Notion Sans).
- `app/quiz.css` — o CSS do quiz do lead sai do `globals.css` pra um arquivo próprio, **sem alterações**. Isola o sub-projeto 2 e garante que nada do redesign vaza pro lead.
- `app/globals.css` — passa a ter só reset + tokens importados + estilos do app interno (reescritos).
- `components/ui/` — um arquivo por primitivo: `Card`, `Button`, `Badge`, `PillTabs`, `Stat`, `DataTable`, `PageHeader`.
- Telas reconstruídas sobre os primitivos. Nenhuma mudança em schema do grafo, motor de runtime, adaptador de funis legados ou rotas de API (exceto a prop `previewNodeId` no motor, ver §6.3).

## 4. Fundação visual

### 4.1 Tokens (de `NOTION DESIGN.md`)

- **Superfícies:** canvas `#ffffff`, surface `#f6f5f4`, hairline `#e5e3df` (bordas), hairline-strong `#c8c4be` (inputs). Fundo da página: degradê muito suave de `card-tint-lavender #e6e0f5` (topo) pra `#ffffff`.
- **Texto:** ink `#1a1a1a` (títulos/corpo), slate `#5d5b54` (secundário), steel `#787671` (terciário), stone `#a4a097` (rótulos), muted `#bbb8b1` (placeholder).
- **Primário:** roxo `#5645d4` (pressed `#4534b3`). **Só** no CTA dominante da tela: "Publicar", "Responder no WhatsApp", "Entrar". Nunca em texto corrido nem em fundo grande.
- **Semânticos:** sucesso `#1aae39`, aviso `#dd5b00`, erro `#e03131`. Tags suaves: lavanda/roxo-800, pêssego/laranja-deep, menta/verde.
- **Tipografia (Inter):** `heading-2` 36/600 título de página · `heading-4` 22/600 título de card · `heading-5` 18/600 subtítulo · `body-md` 16/400 · `body-sm` 14/400 corpo padrão de dashboard · `body-sm-medium` 14/500 botões e nav · `caption-bold` 13/600 badges · `micro-uppercase` 11/600/+1px eyebrow e cabeçalho de tabela. Letter-spacing negativo só em heading-2 (−0,5px).
- **Raios:** botões e inputs **8px** (retos, regra do Notion); cards **20px**; badges e pílulas de nav **9999px**; chips de tag 6px.
- **Elevação:** cards planos com borda hairline (nível 0). Sombra só em modal/dropdown: `rgba(15,15,15,0.16) 0 16px 48px -8px`.
- **Espaçamento:** base 4px; padding de card 24px; gap entre cards 16px; container 1280px com 32px de margem lateral.
- **Fontes removidas do app interno:** Fraunces, Kalam, JetBrains Mono (permanecem só no `quiz.css`).

### 4.2 Primitivos (`components/ui/`)

| Componente | Responsabilidade | API |
|---|---|---|
| `Card` | Caixa branca 20px com título, subtítulo opcional, ação opcional no canto superior direito, corpo | `title?, subtitle?, action?: ReactNode, children` |
| `Button` | Variantes `primary` (roxo), `dark` (preto), `secondary` (outline), `ghost`; tamanhos `md` (40px) e `sm` (32px); `iconOnly` | `variant, size, iconOnly?, disabled?, ...button` |
| `Badge` | Tag colorida | `tone: "purple" \| "orange" \| "green" \| "gray" \| "red"` |
| `PillTabs` | Pílulas horizontais, ativa preta com texto branco | `items: {id,label,href?}[], active, onChange?` |
| `Stat` | Número grande (heading-2) + rótulo (micro-uppercase) | `value, label, hint?` |
| `DataTable` | Cabeçalho micro-uppercase, linhas com hairline, chevron à direita, linha clicável; em <768px vira lista de cards compactos | `columns, rows, onRowClick?, emptyText` |
| `PageHeader` | Título heading-2 + subtítulo slate + área de ações à direita; empilha no mobile | `title, subtitle?, actions?` |

Cada primitivo: um arquivo `.tsx` + estilos no `globals.css` com prefixo `ui-`. Sem lógica de negócio.

## 5. Casca do app e navegação

- `components/AppNav.tsx` reescrito: marca **"Intake"** (wordmark, Inter 600, sem emoji) à esquerda; `PillTabs` ao centro: **Início · Construtor · Leads · Histórico**; nada à direita. Some o `ThemeToggle` do app interno (arquivo pode ser removido se não tiver outro uso).
- Rotas **mantidas**: `/` Início, `/builder` Construtor, `/kanban` Leads, `/kanban/banco` Histórico, `/login`.
- Mobile (<720px): hambúrguer + gaveta (já existe), restilizados.
- `<title>` das páginas e textos "Radar Jurídico" no app interno → "Intake". No quiz do lead, o rodapé/disclaimer que cita o escritório **não** muda (é conteúdo do funil, não marca do produto).
- `README.md` atualizado (nome, telas atuais, fluxo de publicação novo).
- **Login:** card branco centralizado sobre o fundo lavanda, wordmark Intake, inputs 44px com borda hairline-strong e foco roxo 2px, botão `primary` "Entrar". Sem mudança de lógica.

## 6. Telas

### 6.1 Início (`/`)

**Dados:** `/api/leads` (todos), `/api/funnels`, `/api/kanban/columns`. Cálculo no cliente. Sem API nova.

- **PageHeader:** saudação por hora ("Bom dia" <12h, "Boa tarde" <18h, "Boa noite") + ", André" (fixo — não há usuário no sistema; se um dia houver, vem daí) · subtítulo "Aqui está o que precisa da sua atenção hoje." · ação: `PillTabs` de período **Este mês · 7 dias · Hoje** (afeta só os números do §"Números", não a lista de pendentes).
- **Linha 1 (grid 2fr + 1fr; empilha <1024px):**
  - **Card "Dúvidas aguardando resposta"** — `Stat` com a contagem de leads `tipo === "duvida"` cuja `status` é o id da **primeira** coluna configurada (a coluna de entrada, "Novo" por padrão). Abaixo, os até 5 mais recentes: nome · funil (badge cinza) · "há X min/h/d" · botão `primary sm` "Responder no WhatsApp" (link `waLink` já existente, abre em nova aba). Rodapé: link "ver todas →" para `/kanban`. Vazio: "Nenhuma dúvida esperando — tudo respondido ✓".
  - **Card "Números do período"** — dois `Stat` lado a lado: **Qualificados** e **Dúvidas** (leads no período). Abaixo, uma linha por funil com nome (via `/api/funnels`, fallback slug) e barra horizontal fina proporcional à contagem, com o número à direita. Ordenado por contagem desc. Vazio: "Sem leads no período".
- **Linha 2 (largura total):** **Card "Últimos leads"** — `DataTable` com colunas **Nome · Funil · Tipo · Coluna · Quando**; Tipo é `Badge` verde "Qualificado" / laranja "Dúvida"; Coluna é o label da coluna atual; até 10 linhas, ordem por `criadoEm` desc. Clique na linha abre `LeadDetailModal` (o mesmo do Kanban). Rodapé: "ver todos →" para `/kanban`.
- Sem card de funis e sem "+ Novo funil" na home — ambos moram no Construtor.
- Sem KV (dev local): cada card mostra seu estado vazio; a mensagem de "KV não configurado" aparece uma vez, discreta, no topo.

### 6.2 Construtor (`/builder`) — unificado

**Cabeçalho (barra própria abaixo da nav):**
- Esquerda: seletor do funil ativo (dropdown: lista de funis, "＋ Novo funil", e por funil: Duplicar / Excluir).
- Centro: **status de publicação**, sempre visível:
  - `⬤ No ar · sem alterações` (verde) — rascunho igual ao publicado
  - `⬤ Alterações não publicadas` (laranja) — rascunho difere do publicado
  - `⬤ Nunca publicado` (cinza) — não existe versão publicada
  - Ao lado, indicador de autosave: "Salvo" / "Salvando…" / "Não salvo (sem KV)" em `caption`.
- Direita: ⚙ (abre painel de Configurações) · **"Pré-visualizar"** (`secondary`, abre `/quiz/<slug>/preview` em nova aba) · **"Publicar"** (`primary`, desabilitado quando status é "sem alterações").
- Menu "⋯" ao lado do seletor: "Baixar JSON (backup)", "Salvar em content/funnels (dev)". Ferramentas de dev, fora do caminho principal.

**Regra de "tem alteração?":** `JSON.stringify(rascunho) !== JSON.stringify(publicado)`. O publicado vem de `/api/funnels` (que já devolve a versão publicada quando existe, senão o JSON bundlado). Após "Publicar" com sucesso, o snapshot publicado em memória é atualizado com o rascunho.

**Autosave:** qualquer mudança no funil ativo dispara `POST /api/draft` com debounce de 1,5s. Falha (ex.: sem KV) → indicador "Não salvo (sem KV)" e `localStorage` continua como fallback (comportamento atual). Some o botão "Salvar rascunho".

**Corpo — desktop ≥1280px, três colunas (40% · 30% · 30%):**

1. **Mapa do fluxo** — o editor `@xyflow/react` existente, com estas mudanças:
   - **Layout automático, sempre horizontal esquerda→direita.** Função pura `layoutLeftToRight(graph)`: BFS a partir do nó `start` pelas arestas efetivas (`effectiveEdges`); cada nó recebe `depth` (coluna) = menor distância do início; dentro de cada coluna, ordem estável pela ordem de descoberta; ramificações abrem linhas paralelas na mesma coluna. Nós inalcançáveis vão pra última coluna + 1, com opacidade reduzida e aviso. x = coluna × (largura + 80px); y = linha × (altura + 40px). O campo `position` do schema é **ignorado na renderização** (permanece no JSON por compatibilidade; `onNodesChange` deixa de persistir posição; nós ficam `draggable={false}`).
   - Alças: saída à direita, entrada à esquerda (já é assim).
   - **Zoom:** roda/pinça (nativo) + controles fixos no canto inferior direito do mapa: **+**, **−**, **Ajustar tudo** (fitView). **Duplo clique num bloco** = `fitView` naquele nó (com padding) **e** seleciona ele no editor. Nó selecionado: borda roxa 2px.
   - **Zoom semântico:** abaixo de zoom 0,6, o card do nó renderiza só ícone + título curto (chip compacto, ~160×48); acima, o card completo. Implementado lendo o zoom via `useStore`/`useViewport` do xyflow e trocando a variante no componente do nó.
   - Barra fina no topo do mapa: "＋ Adicionar bloco" (dropdown de tipo) e a faixa de avisos de validação (existente). Novo bloco entra na coluna seguinte ao bloco selecionado (o layout automático cuida da posição).
   - Nós, arestas, minimap e controles restilizados nos tokens (nós brancos 12px, hairline; aresta `steel`; aresta da seleção roxa).
2. **Editor do bloco** — o `Inspector` atual como coluna fixa. Sem seleção: "Selecione um bloco no mapa" (ilustração leve opcional, texto basta). Já cobre 100% dos tipos (trabalho do mobile). Ganha os tokens novos (inputs 8px, rótulos micro-uppercase).
3. **Prévia do celular** — moldura de celular (390px lógicos, escalada com `transform: scale()` pra caber na coluna) com `FunnelGraphEngine` em `previewMode` e a prop nova **`previewNodeId`**: o motor abre direto naquele nó, com respostas padrão (área = primeira da `areaOrder`) pra nós que dependem de área. Reage ao vivo às edições. Sem bloco selecionado: mostra o primeiro nó real (a tela de abertura).

**Entre 768 e 1280px:** mapa + editor lado a lado (60/40); prévia vira botão "Ver prévia" no cabeçalho que abre painel deslizante à direita (overlay).

**Mobile <768px:** lista de blocos (existente, ordem BFS) → toque → editor em tela cheia (existente) → botão "Ver prévia" no topo do editor abre a prévia em tela cheia. Conectar blocos continua **desktop-only** (decisão anterior, mantida).

**Configurações do funil** (nome, slug, escritório, advogado/OAB, WhatsApp, Pixel ID, tema claro/escuro **do quiz**, eventos Meta legados): painel lateral direito (overlay 400px) aberto pelo ⚙. Mesmo formulário de hoje, tokens novos. Some a aba "Configurações".

**Removido:** aba "Perguntas", trilha lateral (`RAIL`, `.b-rail*`, `railOpen`), `OptionCanvasList`, `lib/funnel-engine.tsx` (motor antigo — era rollback; sem a trilha, nada mais o importa) e o CSS correspondente. `components/EditableInline.tsx` permanece (usado pelos nós do mapa).

**Inalterado:** `lib/funnel-graph-schema.ts`, `lib/funnel-graph-adapter.ts` (exceto: as posições sintetizadas deixam de importar), `lib/funnel-graph-engine.tsx` (exceto a prop `previewNodeId`), `lib/funnel-engine-shared.tsx`, todas as rotas de API, `lib/funnels-store.ts`.

### 6.3 Mudança no motor: `previewNodeId`

`FunnelGraphEngine` ganha prop opcional `previewNodeId?: string`. Quando presente (só em `previewMode`): o nó inicial é esse em vez do primeiro após `start`; `answers` inicial recebe `{ area: <primeira chave de areaOrder> }` pra que nós com `optionsFromArea`/`questionFromArea` tenham conteúdo; histórico começa vazio (sem botão "Voltar"). Mudança de `previewNodeId` reinicia o estado. Nada disso roda em produção (`/quiz/[slug]` não passa a prop).

### 6.4 Leads (`/kanban`)

- `PageHeader`: "Leads" + subtítulo "Setembro de 2026 · N leads" (mês corrente, regra atual) · ações: ícone ⚙ (colunas).
- Colunas como `Card` (título + `Badge` cinza com contagem); drag-and-drop **inalterado**.
- `LeadCard` compacto: nome (body-sm-medium) · linha de badges: funil (cinza), tipo (verde/laranja) · "há X" (caption, steel) · botão de WhatsApp vira `Button ghost iconOnly` no canto superior direito · ✕ de excluir aparece no hover (desktop) e sempre (mobile), regra atual.
- `LeadDetailModal` e `ColumnsEditor`: tokens novos, sem mudança de lógica.
- Filtro de mês corrente: inalterado.

### 6.5 Histórico (`/kanban/banco`)

- `PageHeader`: "Histórico" + subtítulo "Leads de meses anteriores. Nada é apagado."
- Seletor de mês: `PillTabs` horizontal com rolagem (Set · Ago · Jul …), mês corrente marcado "(atual)".
- Lista: `DataTable` (Nome · Funil · Tipo · Coluna · Data). Clique abre `LeadDetailModal`. Excluir disponível no modal. Mobile: a tabela empilha em cards compactos (comportamento do próprio `DataTable`).
- Regra de mês padrão (último mês passado com leads): inalterada.

### 6.6 Componentes de lead compartilhados

`LeadCard`, `LeadDetailModal` (em `components/leads-ui.tsx`) e `DataTable` são os únicos jeitos de exibir lead em Início, Leads e Histórico. `fmtDate`, `waLink` continuam ali.

## 7. Documentação e handoff entre agentes

Parte do escopo, feita **no primeiro commit da implementação**, antes de qualquer tela:

- **`AGENTS.md`** (raiz): o que é o Intake, mapa da arquitetura (pastas, schema do grafo, motor, adaptador, APIs, KV), convenções (CSS puro + tokens, sem deps novas sem motivo, loop de verificação `tsc → build → navegador`), como rodar, onde ficam specs e planos, e o **protocolo de handoff**: *antes de encerrar, marque as tarefas concluídas no plano, escreva sua entrada datada em `docs/HANDOFF.md` e commite.*
- **`CLAUDE.md`** (raiz): uma linha, `@AGENTS.md` — os dois agentes leem a mesma fonte.
- **`docs/HANDOFF.md`**: log datado, entrada mais recente no topo: "parei em / próximo / cuidado com". Quem retoma lê primeiro.
- **`docs/superpowers/specs/`** (este arquivo) e **`docs/superpowers/plans/`** (plano com checkboxes, gerado na próxima etapa).
- `README.md` atualizado.

## 8. Fora do escopo (explícito)

- Quiz do lead (sub-projeto 2).
- Busca global, avatar/usuário/perfil, multi-cliente ou multi-escritório, tema escuro do app interno, gráficos além das barras simples, exportação, notificações, qualquer API nova além de reutilizar as existentes.
- Migração de dados: nenhuma. Funis legados continuam sendo sintetizados pelo adaptador; o layout automático torna as posições antigas irrelevantes.

## 9. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Vazar estilo novo pro quiz do lead | CSS do quiz isolado em `quiz.css` antes de qualquer outra mudança; passada completa nos 3 funis em `/preview` como critério de aceite |
| Layout automático feio em grafos com muitas ramificações | Algoritmo por camadas é o padrão de fluxogramas; validar nos 3 funis reais + um grafo de teste com condição de 3 saídas |
| Autosave gravar rascunho quebrado no meio de uma digitação | Debounce 1,5s; rascunho nunca vai ao ar sozinho (Publicar continua explícito) |
| `previewNodeId` divergir do fluxo real | Prop só ativa em `previewMode`; produção não a usa; teste de regressão do quiz cobre |
| Remover `funnel-engine.tsx` | Produção já não o usa desde a fase 4 do editor de fluxo (24/08); a única referência era a trilha, que também sai |

## 10. Verificação (critérios de aceite)

Por tela, após implementar: `npx tsc --noEmit` → `npm run build` → conferência no navegador em **1440px** e **390px** (emulação de dispositivo do Chrome DevTools).

- **Início:** com dados reais em produção, os três cards mostram números coerentes com o Kanban; período muda os números; clique em lead abre o modal; "Responder no WhatsApp" abre o link certo. Sem KV: estados vazios, sem erro vermelho.
- **Construtor:** abrir os 3 funis existentes; mapa carrega horizontal e legível; duplo clique foca; zoom semântico troca a variante; editar um texto no editor reflete na prévia ao vivo; autosave marca "Salvo"; status muda pra "Alterações não publicadas"; "Publicar" volta pra "sem alterações"; ⚙ abre configurações; mobile mostra lista → editor → prévia.
- **Leads / Histórico:** drag-and-drop funciona; excluir funciona; Histórico troca de mês e abre modal.
- **Login:** entra com as credenciais atuais.
- **Regressão zero no quiz do lead (obrigatório):** passada completa em `/quiz/<slug>/preview` nos 3 funis — telas, score, ramificação alta/baixa intenção e texto do WhatsApp **idênticos** a antes. Nada de `quiz.css` alterado.
- **Handoff:** `AGENTS.md`, `CLAUDE.md`, `docs/HANDOFF.md` existem e o plano tem todas as caixas marcadas ao final.
