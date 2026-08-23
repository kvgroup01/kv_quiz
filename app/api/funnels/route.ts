import { NextResponse } from "next/server";
import { listAllFunnels } from "@/lib/list-funnels";

export async function GET() {
  const items = await listAllFunnels();
  return NextResponse.json({ ok: true, funnels: items.map((i) => i.data) });
}
