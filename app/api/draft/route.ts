import { NextRequest, NextResponse } from "next/server";
import { saveDraft, getDraft } from "@/lib/funnels-store";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  if (!body?.slug) return NextResponse.json({ ok: false, error: "slug obrigatório" }, { status: 400 });

  try {
    const stored = await saveDraft(body);
    return NextResponse.json({ ok: true, updatedAt: stored.updatedAt });
  } catch (e: any) {
    console.error("[api/draft] Falha ao salvar no KV:", e?.message || e);
    return NextResponse.json(
      { ok: false, error: "Vercel KV não configurado ainda — conecte o Storage na Vercel (veja README)." },
      { status: 200 }
    );
  }
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ ok: false, error: "slug obrigatório" }, { status: 400 });
  try {
    const draft = await getDraft(slug);
    return NextResponse.json({ ok: true, draft });
  } catch {
    return NextResponse.json({ ok: true, draft: null });
  }
}
