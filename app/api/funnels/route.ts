import { NextResponse } from "next/server";
import { listAllFunnels } from "@/lib/list-funnels";

export async function GET() {
  const items = await listAllFunnels();
  const publishedAt: Record<string, string | null> = {};
  for (const item of items) publishedAt[item.data.slug] = item.publishedAt ?? null;
  return NextResponse.json({ ok: true, funnels: items.map((i) => i.data), publishedAt });
}
