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

  // Só chama a Conversions API se as env vars estiverem configuradas —
  // sendCapiEvent já devolve ok:false silenciosamente se não estiverem.
  const capi = await sendCapiEvent({
    eventName: evento,
    whatsapp: body.whatsapp || null,
    fbp: body.fbp || null,
    fbc: body.fbc || null,
    eventSourceUrl: req.headers.get("referer") || undefined,
    customData: {
      funil: body.funil,
      area: body.area,
      situacao: body.situacao,
      urgencia: body.urgencia,
      prioridade: body.prioridade
    }
  });

  return NextResponse.json({ ok: true, capi: capi.ok });
}
