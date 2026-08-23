import { NextRequest, NextResponse } from "next/server";
import { updateLeadStatus } from "@/lib/leads-store";
import { getColumns } from "@/lib/kanban-columns-store";
import { sendCapiEvent } from "@/lib/meta-capi";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const status = String(body?.status || "");
  const columns = await getColumns();
  const targetColumn = columns.find((c) => c.id === status);
  if (!targetColumn) {
    return NextResponse.json({ ok: false, error: "status inválido" }, { status: 400 });
  }

  try {
    const updated = await updateLeadStatus(id, status);
    if (!updated) return NextResponse.json({ ok: false, error: "lead não encontrado" }, { status: 404 });

    // Coluna configurada pra treinar o Pixel/conta de anúncios: dispara a
    // Conversions API com os dados do lead (sendCapiEvent já ignora
    // silenciosamente se META_CAPI_TOKEN/META_PIXEL_ID_SERVER não existirem).
    if (targetColumn.capiEvent) {
      sendCapiEvent({
        eventName: targetColumn.capiEvent,
        whatsapp: updated.whatsapp,
        customData: {
          funil: updated.funil,
          area: updated.area,
          situacao: updated.situacao,
          urgencia: updated.urgencia,
          coluna: targetColumn.label
        }
      }).catch((e) => console.error("[api/leads/:id] Falha ao disparar CAPI:", e?.message || e));
    }

    return NextResponse.json({ ok: true, lead: updated });
  } catch (e: any) {
    console.error("[api/leads/:id] Falha ao atualizar no KV:", e?.message || e);
    return NextResponse.json({ ok: false, error: "Vercel KV não configurado" }, { status: 500 });
  }
}
