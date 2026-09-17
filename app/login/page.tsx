"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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
    <div className="in-app login-page">
      <Card className="login-card">
        <p className="app-nav-brand" style={{ marginBottom: 4 }}>Intake</p>
        <h1 className="ui-card-title" style={{ marginBottom: 20 }}>Entrar</h1>
        <form onSubmit={handleSubmit}>
          <label className="in-field">
            <span>Usuário</span>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </label>
          <label className="in-field">
            <span>Senha</span>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {erro && <p className="in-error">{erro}</p>}
          <Button variant="primary" type="submit" disabled={enviando} className="login-submit">
            {enviando ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </Card>
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
