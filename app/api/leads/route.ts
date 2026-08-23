import { NextResponse } from "next/server";
import { listLeads } from "@/lib/leads-store";

// Protegido pelo middleware.ts (autenticação básica) — não deixe essa rota
// sem KANBAN_USER/KANBAN_PASSWORD configurados, ela expõe dados pessoais.

export async function GET() {
  try {
    const leads = await listLeads();
    return NextResponse.json({ ok: true, leads });
  } catch (e: any) {
    console.error("[api/leads] Falha ao listar do KV:", e?.message || e);
    return NextResponse.json(
      { ok: false, error: "Vercel KV não configurado ainda. Veja o README para conectar o Storage.", leads: [] },
      { status: 200 }
    );
  }
}
