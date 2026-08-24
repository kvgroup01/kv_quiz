import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import FunnelGraphEngine from "@/lib/funnel-graph-engine";
import type { FunnelData } from "@/lib/funnel-schema";
import { getPublished } from "@/lib/funnels-store";

// Sempre dinâmica: precisa checar o KV a cada visita pra refletir o clique
// em "Publicar" do builder na hora, sem depender de rebuild/redeploy.
export const dynamic = "force-dynamic";

async function loadFunnel(slug: string): Promise<FunnelData | null> {
  try {
    const published = await getPublished(slug);
    if (published?.data) return published.data;
  } catch { /* KV não configurado — cai pro arquivo bundlado */ }

  try {
    const file = path.join(process.cwd(), "content", "funnels", `${slug}.json`);
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default async function QuizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await loadFunnel(slug);
  if (!data) notFound();

  return (
    <div className={"quiz-page " + (data.config.theme === "dark" ? "theme-dark" : "theme-light")}>
      <FunnelGraphEngine data={data} />
    </div>
  );
}
