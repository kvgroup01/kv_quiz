import { NextRequest, NextResponse } from "next/server";

// Protege o Kanban de dúvidas (nome, whatsapp, texto/áudio dos leads é dado
// pessoal) com autenticação básica. Configure KANBAN_USER e KANBAN_PASSWORD
// nas variáveis de ambiente — em PRODUÇÃO, sem isso o acesso fica bloqueado
// por padrão em vez de ficar público sem querer. Em desenvolvimento local
// (npm run dev) deixamos passar sem senha, pra não travar quem só quer
// testar a ferramenta na própria máquina.

export function middleware(req: NextRequest) {
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

  const authHeader = req.headers.get("authorization");
  const expected = "Basic " + btoa(`${user}:${pass}`);

  if (authHeader === expected) {
    return NextResponse.next();
  }

  return new NextResponse("Autenticação necessária.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Radar Juridico Kanban"' }
  });
}

export const config = {
  matcher: ["/kanban/:path*", "/api/leads/:path*", "/api/kanban/:path*"]
};
