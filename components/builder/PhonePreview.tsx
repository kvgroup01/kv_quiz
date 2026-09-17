"use client";

import FunnelGraphEngine from "@/lib/funnel-graph-engine";
import type { FunnelData } from "@/lib/funnel-schema";

export function PhonePreview({ data, nodeId }: { data: FunnelData; nodeId: string | null }) {
  const theme = data.config.theme === "dark" ? "theme-dark" : "theme-light";
  return (
    <div className="phone-wrap">
      <div className="phone-frame">
        <div className={"phone-screen quiz-page " + theme}>
          <FunnelGraphEngine key={nodeId ?? "__start"} data={data} previewMode previewNodeId={nodeId ?? undefined} />
        </div>
      </div>
      <p className="phone-caption">Prévia ao vivo · {nodeId ? "bloco selecionado" : "tela de abertura"}</p>
    </div>
  );
}
