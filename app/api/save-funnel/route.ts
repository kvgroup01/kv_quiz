import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

// Conveniência SÓ PRA DEV LOCAL: grava o JSON do funil direto em
// content/funnels/<slug>.json, pra você só dar commit+push depois de editar
// no builder. Em produção (Vercel) o sistema de arquivos é efêmero — a rota
// se recusa a rodar lá. Em produção, use "Baixar JSON" e suba o arquivo você
// mesmo pelo Git.

const SLUG_RE = /^[a-z0-9-]{1,60}$/;

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    return NextResponse.json(
      { ok: false, error: "Salvar direto no disco só funciona em ambiente de desenvolvimento local. Use 'Baixar JSON' e suba o arquivo pelo Git." },
      { status: 403 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const slug = String(body.slug || "");
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ ok: false, error: "slug inválido (use letras minúsculas, números e hífen)" }, { status: 400 });
  }

  const dir = path.join(process.cwd(), "content", "funnels");
  const file = path.join(dir, `${slug}.json`);

  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(file, JSON.stringify(body, null, 2), "utf-8");
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[api/save-funnel]", e?.message || e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
