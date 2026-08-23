import { NextRequest, NextResponse } from "next/server";
import { createLead } from "@/lib/leads-store";
import type { NewLead } from "@/lib/lead-schema";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const newLead: NewLead = {
    funil: String(body.funil || "default"),
    area: String(body.area || ""),
    situacao: String(body.situacao || ""),
    urgencia: String(body.urgencia || ""),
    dores: Array.isArray(body.dores) ? body.dores.map(String) : [],
    compromisso: String(body.compromisso || ""),
    nome: String(body.nome || "").slice(0, 120),
    whatsapp: String(body.whatsapp || "").slice(0, 40),
    perguntaTexto: body.pergunta_texto ? String(body.pergunta_texto).slice(0, 4000) : null,
    perguntaAudioBase64: body.pergunta_audio_base64 ? String(body.pergunta_audio_base64) : null,
    perguntaAudioMime: body.pergunta_audio_mime ? String(body.pergunta_audio_mime) : null,
    utm: body.utm && typeof body.utm === "object" ? body.utm : {}
  };

  if (!newLead.nome || !newLead.whatsapp) {
    return NextResponse.json({ ok: false, error: "nome e whatsapp são obrigatórios" }, { status: 400 });
  }

  let stored = null;
  let storeError: string | null = null;
  try {
    stored = await createLead(newLead);
  } catch (e: any) {
    // Sem Vercel KV configurado ainda — não derruba o lead, só avisa.
    storeError = "KV não configurado (veja README) — a dúvida não foi salva no Kanban.";
    console.error("[api/lead] Falha ao salvar no KV:", e?.message || e);
  }

  const webhook = process.env.LEAD_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "duvida_lead", ...newLead, enviado_em: new Date().toISOString() })
      });
    } catch (e) {
      console.error("[api/lead] Falha ao reenviar pro webhook:", e);
    }
  }

  return NextResponse.json({ ok: true, id: stored?.id ?? null, aviso: storeError });
}
