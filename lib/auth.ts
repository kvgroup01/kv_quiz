// Autenticação do Kanban. Usa Web Crypto (crypto.subtle) em vez de
// node:crypto porque este arquivo é importado tanto por rotas de API
// (runtime Node) quanto pelo middleware (sempre roda no Edge, que não tem
// o módulo "crypto" do Node — só a Web Crypto API global).

export const COOKIE_NAME = "radar_auth";

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Token guardado no cookie de sessão: hash das credenciais configuradas, não
// as credenciais em si. Middleware só precisa recalcular e comparar.
export async function expectedToken(): Promise<string | null> {
  const user = process.env.KANBAN_USER;
  const pass = process.env.KANBAN_PASSWORD;
  if (!user || !pass) return null;
  return sha256Hex(`${user}:${pass}`);
}

export function checkCredentials(usuario: string, senha: string): boolean {
  const user = process.env.KANBAN_USER;
  const pass = process.env.KANBAN_PASSWORD;
  return !!user && !!pass && usuario === user && senha === pass;
}
