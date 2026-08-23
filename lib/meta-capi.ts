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
  eventTime?: number;
  eventSourceUrl?: string;
  whatsapp?: string | null;
  fbp?: string | null;
  fbc?: string | null;
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
  if (input.fbp) userData.fbp = input.fbp;
  if (input.fbc) userData.fbc = input.fbc;

  const payload = {
    data: [
      {
        event_name: input.eventName,
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
