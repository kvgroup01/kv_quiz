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

## Variáveis de ambiente

Copie `.env.example` pra `.env.local` e preencha o que for usar. Nenhuma delas é obrigatória pra rodar — sem elas, cada recurso cai num modo de demonstração (loga no console em vez de falhar).

| Variável | Pra quê serve |
|---|---|
| `LEAD_WEBHOOK_URL` | Reenvia toda dúvida capturada e todo evento de conversão pra um webhook seu (n8n, Make, Zapier, Google Apps Script, Airtable). Opcional se você só quer usar o Kanban. |
| `META_CAPI_TOKEN` + `META_PIXEL_ID_SERVER` | Habilita o envio server-side pra Conversions API do Meta (com hash SHA-256 do WhatsApp, como a Meta exige). **Nunca** coloque o token no builder — ele é secreto. |
| `KANBAN_USER` + `KANBAN_PASSWORD` | Protegem `/kanban` e a API de leads com autenticação básica **em produção**. Em desenvolvimento local (`npm run dev`) o Kanban abre sem senha, pra você conseguir testar sem configurar nada primeiro — só em produção (Vercel) ele fica bloqueado por padrão sem essas variáveis. |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` | Adicionadas automaticamente quando você conecta um banco KV/Redis à Vercel (veja abaixo) — é onde ficam os leads do Kanban **e** os rascunhos/publicações dos funis. Sem isso configurado (nem local nem em produção), Salvar rascunho/Publicar avisam que não deu e sugerem usar "Baixar JSON" como alternativa. |

## Deploy na Vercel (passo a passo)

1. Suba esta pasta pra um repositório no GitHub (`git init`, `git add .`, `git commit`, crie o repo e dê push).
2. Em [vercel.com](https://vercel.com), clique **Add New > Project** e importe o repositório. O free tier é suficiente.
3. Antes do primeiro deploy (ou depois, em Settings > Environment Variables), configure as variáveis da tabela acima que você for usar.
4. **Storage do Kanban**: na aba **Storage** do projeto na Vercel, clique **Create Database > KV** (Redis via Upstash, tem plano free). Ao conectar ao projeto, a Vercel já adiciona `KV_REST_API_URL`/`KV_REST_API_TOKEN` sozinha — não precisa copiar nada manualmente.
5. Clique **Deploy**. Pronto — `seu-projeto.vercel.app/quiz/default` já é o link pra colocar no anúncio.

Cada cliente (escritório) pode ter sua própria conta Vercel gratuita com seu próprio deploy — os dados de cada um ficam completamente isolados, cada instância com suas próprias variáveis de ambiente.

## Backup em Git (opcional)

O fluxo principal (Salvar rascunho / Publicar) grava tudo no Vercel KV — não precisa de commit pra nada disso funcionar. Se você quiser manter um histórico versionado dos funis mesmo assim, o builder também tem:

- **"Baixar JSON (backup)"** — baixa o funil atual; você pode guardar ou subir manualmente em `content/funnels/<slug>.json`.
- **"Salvar em content/funnels (dev)"** — só funciona rodando localmente (`npm run dev`); grava o JSON direto no disco pra você dar `git add`/`commit`/`push`.

Os arquivos em `content/funnels/*.json` também servem como *seed*: se o KV não estiver configurado ainda, é o que `/quiz/[slug]` e o Painel usam.

## Sobre o Meta Pixel e a Conversions API

O **Pixel ID** é público e fica no JSON do funil (editável no builder) — é assim que o Meta espera que funcione. O **token da Conversions API é secreto** e só existe na variável de ambiente `META_CAPI_TOKEN`, nunca no navegador do lead. Quando configurado, todo evento de conversão (`Lead` ao qualificar, `Contact` ao capturar uma dúvida, nomes editáveis no builder) é mandado tanto pelo pixel do navegador quanto pelo servidor, com o mesmo `event_id` nos dois lados (pro Meta deduplicar em vez de contar em dobro) e o máximo de parâmetros de correspondência que dá pra mandar sem pedir e-mail: WhatsApp, nome (dividido em primeiro/último nome), país, IP e user-agent de quem respondeu, `external_id` (o id do lead no Kanban), `fbp`/`fbc` e as UTMs da URL, tudo com hash SHA-256 onde o Meta exige.

## LGPD

Este funil coleta nome, WhatsApp e, opcionalmente, um áudio da voz do lead — todos dados pessoais pela LGPD. Adicione um aviso de privacidade linkado no funil e, se for usar cookies de rastreamento (Pixel, UTMs), um banner de consentimento. Isso não vem pronto neste projeto — é uma decisão de cada escritório sobre como quer apresentar o próprio aviso.

## Aviso sobre a pré-triagem

O texto do quiz já vem calibrado pra não prometer resultado de processo nem usar depoimento fabricado como prova (isso viola as normas de publicidade da OAB). Ao editar a copy no builder, mantenha esse cuidado — fale de prazo e organização, não de "chance de ganhar".
