import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, expectedToken } from "./lib/auth";

// Protege o Kanban de dúvidas (nome, whatsapp, texto/áudio dos leads é dado
// pessoal) com login próprio (tela em /login, não o pop-up nativo do
// navegador). Configure KANBAN_USER e KANBAN_PASSWORD nas variáveis de
// ambiente — em PRODUÇÃO, sem isso o acesso fica bloqueado por padrão em vez
// de ficar público sem querer. Em desenvolvimento local (npm run dev)
// deixamos passar sem senha, pra não travar quem só quer testar na própria
// máquina.

export async function middleware(req: NextRequest) {
  const user = process.env.KANBAN_USER;
  const pass = process.env.KANBAN_PASSWORD;
  const isProd = process.env.NODE_ENV === "production" && !!process.env.VERCEL;

  if (!user || !pass) {
    if (!isProd) return NextResponse.next();
    return new NextResponse(
      "Kanban não configurado: defina KANBAN_USER e KANBAN_PASSWORD nas variáveis de ambiente (Vercel > Settings > Environment Variables) e refaça o deploy.",
      { status: 503 }
    );
  }

  const token = await expectedToken();
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie && token && cookie === token) {
    return NextResponse.next();
  }

  // Rotas de API são chamadas via fetch() pela própria página já carregada —
  // não faz sentido redirecionar, só devolver 401 pra ela tratar.
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "Não autenticado." }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/kanban/:path*", "/api/leads/:path*", "/api/kanban/:path*"]
};
