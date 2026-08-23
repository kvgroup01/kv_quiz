import { NextRequest, NextResponse } from "next/server";
import { publishFunnel } from "@/lib/funnels-store";

// Copia o funil recebido pro estado "publicado" — é isso que /quiz/<slug>
// passa a servir pro tráfego real, instantaneamente (sem commit/deploy).

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  if (!body?.slug) return NextResponse.json({ ok: false, error: "slug obrigatório" }, { status: 400 });

  try {
    const stored = await publishFunnel(body);
    return NextResponse.json({ ok: true, updatedAt: stored.updatedAt });
  } catch (e: any) {
    console.error("[api/publish] Falha ao publicar no KV:", e?.message || e);
    return NextResponse.json(
      { ok: false, error: "Vercel KV não configurado ainda — conecte o Storage na Vercel (veja README). Enquanto isso, use 'Baixar JSON' e suba pelo Git." },
      { status: 200 }
    );
  }
}
