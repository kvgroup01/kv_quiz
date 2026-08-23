import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import FunnelEngine from "@/lib/funnel-engine";
import type { FunnelData } from "@/lib/funnel-schema";
import { getDraft, getPublished } from "@/lib/funnels-store";

export const dynamic = "force-dynamic";

// Mostra sempre o RASCUNHO mais recente (o que está sendo editado agora no
// builder) — nunca o publicado. Se ainda não existe rascunho salvo, cai pro
// publicado, e por último pro arquivo bundlado (pra sempre ter algo pra ver).
async function loadPreview(slug: string): Promise<FunnelData | null> {
  try {
    const draft = await getDraft(slug);
    if (draft?.data) return draft.data;
  } catch { /* KV não configurado */ }

  try {
    const published = await getPublished(slug);
    if (published?.data) return published.data;
  } catch { /* KV não configurado */ }

  try {
    const file = path.join(process.cwd(), "content", "funnels", `${slug}.json`);
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await loadPreview(slug);
  if (!data) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "#B5502C",
          color: "#fff",
          textAlign: "center",
          padding: "8px 14px",
          fontSize: "0.78rem",
          fontWeight: 600
        }}
      >
        🔧 PRÉ-VISUALIZAÇÃO: isto é o rascunho, não o funil publicado. Nada enviado aqui vira lead de verdade.
      </div>
      <div className={"quiz-page " + (data.config.theme === "dark" ? "theme-dark" : "theme-light")} style={{ flex: 1 }}>
        <FunnelEngine data={data} previewMode />
      </div>
    </div>
  );
}
