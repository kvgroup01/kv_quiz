"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, senha })
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.error || "Usuário ou senha incorretos.");
        setEnviando(false);
        return;
      }
      router.push(params.get("redirect") || "/kanban");
      router.refresh();
    } catch {
      setErro("Falha ao entrar. Tente de novo.");
      setEnviando(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg)" }}>
      <form onSubmit={handleSubmit} className="b-section" style={{ width: "100%", maxWidth: 360 }}>
        <p className="eyebrow">RADAR JURÍDICO</p>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "6px 0 18px" }}>Entrar no painel</h1>
        <div className="field">
          <label>Usuário</label>
          <input
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoFocus
            autoComplete="username"
          />
        </div>
        <div className="field">
          <label>Senha</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {erro && <p className="b-help" style={{ color: "var(--danger-text)" }}>{erro}</p>}
        <button type="submit" className="btn primary" style={{ width: "100%", marginTop: 4 }} disabled={enviando}>
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
