import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, checkCredentials, expectedToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const usuario = String(body?.usuario || "");
  const senha = String(body?.senha || "");

  if (!checkCredentials(usuario, senha)) {
    return NextResponse.json({ ok: false, error: "Usuário ou senha incorretos." }, { status: 401 });
  }

  const token = await expectedToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30 // 30 dias
  });
  return res;
}
