# Radar Jurídico

Quiz de pré-triagem de leads jurídicos + construtor de funis + Kanban de dúvidas, pronto pra rodar no plano free da Vercel.

## O que tem aqui

- **`/`** — o Painel: lista todos os seus funis, cada um com status (rascunho / publicado) e os três links (editar, pré-visualizar, ver publicado).
- **`/builder`** — editor visual do conteúdo do funil (perguntas, opções, textos, Pixel do Meta Ads), com preview ao vivo — clique no texto e edite direto, arraste pra reordenar.
- **`/quiz/[slug]`** — o funil PUBLICADO, que o lead responde de verdade (vindo do anúncio). Termina levando quem está pronto pro WhatsApp com um resumo pronto, e capturando texto/áudio de quem só quer tirar dúvida.
- **`/quiz/[slug]/preview`** — o RASCUNHO, sempre a versão mais recente que você está editando. Link público (dá pra mandar pro cliente revisar), mas não conta como lead de verdade.
- **`/kanban`** — quadro (arrastar e soltar) com as dúvidas capturadas, pra decidir quem o time chama no WhatsApp.
- **`/api/lead`**, **`/api/conversion`** — funções serverless que guardam segredos (token da Conversions API) fora do navegador do lead.

## Rascunho x Publicado

Pensa como Linktree: você edita à vontade no `/builder` sem afetar nada — cada tecla salva só no seu navegador. Dois botões decidem o que sai pra fora:

- **💾 Salvar rascunho** — grava o estado atual no banco (Vercel KV) e te dá o link de `/quiz/<slug>/preview`, pra você (ou o cliente) conferir como ficou antes de ir ao ar.
- **🚀 Publicar** — copia esse conteúdo pro estado publicado. Só a partir daqui `/quiz/<slug>` (o link real, o que vai no anúncio) muda. Editar e nem salvar rascunho, nem publicar, não muda absolutamente nada que já está no ar.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

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

O **Pixel ID** é público e fica no JSON do funil (editável no builder) — é assim que o Meta espera que funcione. O **token da Conversions API é secreto** e só existe na variável de ambiente `META_CAPI_TOKEN`, nunca no navegador do lead. Quando configurado, todo evento de conversão (`Lead` ao qualificar, `Contact` ao capturar uma dúvida — nomes editáveis no builder) é mandado tanto pelo pixel do navegador quanto pelo servidor, com o WhatsApp com hash SHA-256, como a Meta exige.

## LGPD

Este funil coleta nome, WhatsApp e, opcionalmente, um áudio da voz do lead — todos dados pessoais pela LGPD. Adicione um aviso de privacidade linkado no funil e, se for usar cookies de rastreamento (Pixel, UTMs), um banner de consentimento. Isso não vem pronto neste projeto — é uma decisão de cada escritório sobre como quer apresentar o próprio aviso.

## Aviso sobre a pré-triagem

O texto do quiz já vem calibrado pra não prometer resultado de processo nem usar depoimento fabricado como prova (isso viola as normas de publicidade da OAB). Ao editar a copy no builder, mantenha esse cuidado — fale de prazo e organização, não de "chance de ganhar".
