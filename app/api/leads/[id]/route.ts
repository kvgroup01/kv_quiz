import { NextRequest, NextResponse } from "next/server";
import { updateLeadStatus } from "@/lib/leads-store";
import type { LeadStatus } from "@/lib/lead-schema";

const VALID: LeadStatus[] = ["novo", "respondido", "desqualificado"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const status = body?.status as LeadStatus;
  if (!VALID.includes(status)) {
    return NextResponse.json({ ok: false, error: "status inválido" }, { status: 400 });
  }

  try {
    const updated = await updateLeadStatus(id, status);
    if (!updated) return NextResponse.json({ ok: false, error: "lead não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, lead: updated });
  } catch (e: any) {
    console.error("[api/leads/:id] Falha ao atualizar no KV:", e?.message || e);
    return NextResponse.json({ ok: false, error: "Vercel KV não configurado" }, { status: 500 });
  }
}
