import { NextRequest, NextResponse } from "next/server";
import { getColumns, saveColumns } from "@/lib/kanban-columns-store";
import { DEFAULT_COLUMNS } from "@/lib/lead-schema";

export async function GET() {
  try {
    const columns = await getColumns();
    return NextResponse.json({ ok: true, columns });
  } catch (e: any) {
    console.error("[api/kanban/columns] Falha ao ler do KV:", e?.message || e);
    return NextResponse.json({ ok: true, columns: DEFAULT_COLUMNS, aviso: "Vercel KV não configurado, usando colunas padrão." });
  }
}

export async function PUT(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  if (!Array.isArray(body?.columns)) {
    return NextResponse.json({ ok: false, error: "columns precisa ser uma lista" }, { status: 400 });
  }

  try {
    const columns = await saveColumns(body.columns);
    return NextResponse.json({ ok: true, columns });
  } catch (e: any) {
    console.error("[api/kanban/columns] Falha ao salvar no KV:", e?.message || e);
    return NextResponse.json({ ok: false, error: "Vercel KV não configurado (veja README)." }, { status: 500 });
  }
}
