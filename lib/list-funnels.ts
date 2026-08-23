import fs from "node:fs/promises";
import path from "node:path";
import type { FunnelData } from "./funnel-schema";
import { getPublished, listKnownSlugs } from "./funnels-store";

export interface FunnelListItem {
  data: FunnelData;
  publishedAt: string | null;
}

// Junta os funis bundlados em content/funnels/*.json com os que só existem
// no Vercel KV (criados e publicados direto pelo builder). Onde os dois
// existem, a versão publicada no KV é a que vale — é a mais atual.
export async function listAllFunnels(): Promise<FunnelListItem[]> {
  const dir = path.join(process.cwd(), "content", "funnels");
  const bundled = new Map<string, FunnelData>();
  try {
    const files = await fs.readdir(dir);
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try {
        const raw = await fs.readFile(path.join(dir, f), "utf-8");
        const data: FunnelData = JSON.parse(raw);
        bundled.set(data.slug, data);
      } catch (e) {
        console.error("[list-funnels] falha lendo", f, e);
      }
    }
  } catch { /* pasta pode não existir ainda */ }

  let kvSlugs: string[] = [];
  try {
    kvSlugs = await listKnownSlugs();
  } catch { /* KV não configurado — segue só com os bundlados */ }

  const allSlugs = new Set<string>([...bundled.keys(), ...kvSlugs]);
  const items: FunnelListItem[] = [];
  for (const slug of allSlugs) {
    let data = bundled.get(slug) ?? null;
    let publishedAt: string | null = null;
    try {
      const published = await getPublished(slug);
      if (published?.data) {
        data = published.data;
        publishedAt = published.updatedAt;
      }
    } catch { /* KV não configurado — usa o bundlado, sem timestamp de publicação */ }
    if (data) items.push({ data, publishedAt });
  }
  return items;
}
