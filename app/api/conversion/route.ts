import { NextRequest, NextResponse } from "next/server";
import { sendCapiEvent } from "@/lib/meta-capi";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const evento = String(body.evento || "Lead");

  const webhook = process.env.LEAD_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "evento_conversao", ...body })
      });
    } catch (e) {
      console.error("[api/conversion] Falha ao reenviar pro webhook:", e);
    }
  }

  // IP e user-agent reais de quem respondeu — só dá pra pegar aqui no
  // servidor (o navegador não manda esses dados sozinho), e contam bastante
  // pra qualidade de correspondência da Conversions API.
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  const clientUserAgent = req.headers.get("user-agent");

  const utm = body.utm && typeof body.utm === "object" ? body.utm : {};

  // Só chama a Conversions API se as env vars estiverem configuradas —
  // sendCapiEvent já devolve ok:false silenciosamente se não estiverem.
  const capi = await sendCapiEvent({
    eventName: evento,
    eventId: body.event_id || undefined,
    whatsapp: body.whatsapp || null,
    nome: body.nome || null,
    externalId: body.lead_id || null,
    fbp: body.fbp || null,
    fbc: body.fbc || null,
    clientIp,
    clientUserAgent,
    eventSourceUrl: req.headers.get("referer") || undefined,
    customData: {
      funil: body.funil,
      area: body.area,
      situacao: body.situacao,
      urgencia: body.urgencia,
      prioridade: body.prioridade,
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      utm_content: utm.utm_content,
      utm_term: utm.utm_term
    }
  });

  return NextResponse.json({ ok: true, capi: capi.ok });
}
