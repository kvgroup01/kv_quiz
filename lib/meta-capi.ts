import crypto from "node:crypto";

// Chamada server-side da Conversions API do Meta. O token NUNCA passa pelo
// navegador — ele só existe aqui, lido de variável de ambiente.

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // Se não vier com código do país, assume Brasil (55).
  return digits.length <= 11 ? "55" + digits : digits;
}

export interface CapiEventInput {
  eventName: string;
  /** Mesmo id usado no fbq() do navegador — sem isso o Meta pode contar o
   * mesmo evento duas vezes (uma pelo Pixel, outra pela CAPI). */
  eventId?: string;
  eventTime?: number;
  eventSourceUrl?: string;
  whatsapp?: string | null;
  /** Reservado pra quando algum funil pedir e-mail — hoje nenhum pede. */
  email?: string | null;
  /** Nome completo do lead: aqui é dividido em fn/ln (primeiro/último nome)
   * pro Meta cruzar com a base dele, exatamente como faria com um formulário
   * nativo do Facebook. */
  nome?: string | null;
  /** Id único do lead (o id salvo no Kanban) — ajuda o Meta a deduplicar e
   * a linkar o evento ao registro certo. */
  externalId?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  /** IP e user-agent de quem respondeu o quiz — dois dos parâmetros de
   * maior peso pra qualidade de correspondência da CAPI. Vêm sempre do
   * servidor (nunca do navegador), então não tem como serem falsificados. */
  clientIp?: string | null;
  clientUserAgent?: string | null;
  customData?: Record<string, unknown>;
}

export async function sendCapiEvent(input: CapiEventInput): Promise<{ ok: boolean; status?: number; error?: string }> {
  const token = process.env.META_CAPI_TOKEN;
  const pixelId = process.env.META_PIXEL_ID_SERVER;
  if (!token || !pixelId) {
    return { ok: false, error: "META_CAPI_TOKEN ou META_PIXEL_ID_SERVER não configurados" };
  }

  const userData: Record<string, unknown> = {};
  if (input.whatsapp) userData.ph = [sha256(normalizePhone(input.whatsapp))];
  if (input.email) userData.em = [sha256(input.email)];
  if (input.nome) {
    const partes = input.nome.trim().split(/\s+/).filter(Boolean);
    if (partes[0]) userData.fn = [sha256(partes[0])];
    if (partes.length > 1) userData.ln = [sha256(partes.slice(1).join(" "))];
  }
  if (input.externalId) userData.external_id = [sha256(input.externalId)];
  // Funil é 100% em português pra leads no Brasil — país fixo ajuda o match.
  userData.country = [sha256("br")];
  if (input.clientIp) userData.client_ip_address = input.clientIp;
  if (input.clientUserAgent) userData.client_user_agent = input.clientUserAgent;
  if (input.fbp) userData.fbp = input.fbp;
  if (input.fbc) userData.fbc = input.fbc;

  const payload = {
    data: [
      {
        event_name: input.eventName,
        event_id: input.eventId,
        event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
        action_source: "website",
        event_source_url: input.eventSourceUrl,
        user_data: userData,
        custom_data: input.customData ?? {}
      }
    ]
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
    );
    if (!res.ok) {
      const text = await res.text();
      console.error("[meta-capi] resposta não-ok:", res.status, text);
      return { ok: false, status: res.status, error: text };
    }
    return { ok: true, status: res.status };
  } catch (e: any) {
    console.error("[meta-capi] falha na chamada:", e?.message || e);
    return { ok: false, error: String(e?.message || e) };
  }
}
