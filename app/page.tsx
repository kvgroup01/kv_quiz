import Link from "next/link";
import AppNav from "@/components/AppNav";
import { listAllFunnels } from "@/lib/list-funnels";

function fmtDate(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default async function Home() {
  const items = await listAllFunnels();

  return (
    <div>
      <AppNav current="painel" />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 64px" }}>
        <p className="eyebrow">SEUS FUNIS</p>
        <h1 style={{ fontSize: "1.7rem", fontWeight: 600, letterSpacing: "-0.01em", margin: "8px 0 6px" }}>Painel</h1>
        <p className="sub" style={{ margin: "0 0 28px" }}>
          Cada funil tem dois estados: <b>rascunho</b> (o que você está editando, link só de teste) e{" "}
          <b>publicado</b> (o que o anúncio de verdade usa). Editar nunca muda o publicado sozinho, só quando você clica em Publicar no construtor.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {items.map(({ data, publishedAt }) => (
            <div key={data.slug} className="b-section" style={{ margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: "0 0 6px", fontSize: "1rem", letterSpacing: "-0.01em" }}>{data.nome}</h3>
                  <span className="oab-tag">/{data.slug}</span>{" "}
                  {publishedAt ? (
                    <span className="badge-pill" style={{ marginLeft: 6 }}>🟢 Publicado {fmtDate(publishedAt)}</span>
                  ) : (
                    <span className="badge-pill" style={{ marginLeft: 6 }}>🟡 Ainda não publicado</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                <Link href={`/builder?slug=${data.slug}`} className="btn primary small" style={{ textDecoration: "none" }}>✏️ Editar</Link>
                <Link href={`/quiz/${data.slug}/preview`} className="btn small" style={{ textDecoration: "none" }}>👁 Pré-visualizar rascunho</Link>
                {publishedAt ? (
                  <Link href={`/quiz/${data.slug}`} target="_blank" className="btn small" style={{ textDecoration: "none" }}>🔗 Ver publicado</Link>
                ) : (
                  <span className="btn small" style={{ opacity: 0.5 }}>🔗 Ver publicado (ainda não existe)</span>
                )}
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="b-help">Nenhum funil ainda.</p>}
        </div>

        <Link href="/builder?new=1" className="btn primary" style={{ marginTop: 20, display: "inline-block", textDecoration: "none" }}>
          + Novo funil
        </Link>
      </div>
    </div>
  );
}
