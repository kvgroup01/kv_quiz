import { kv } from "@vercel/kv";
import type { Lead, NewLead, LeadStatus } from "./lead-schema";

// Guarda os leads no Vercel KV (Redis via Upstash — tem plano free).
// Sem isso configurado (ver README), estas funções lançam erro — as rotas
// de API tratam isso e devolvem uma mensagem clara em vez de derrubar o app.

const INDEX_KEY = "leads:index";
const leadKey = (id: string) => `lead:${id}`;

export async function createLead(data: NewLead, initialStatus: string): Promise<Lead> {
  const id = crypto.randomUUID();
  const lead: Lead = { ...data, id, criadoEm: new Date().toISOString(), status: initialStatus };
  await kv.set(leadKey(id), lead);
  await kv.zadd(INDEX_KEY, { score: Date.now(), member: id });
  return lead;
}

export async function listLeads(): Promise<Lead[]> {
  const ids = await kv.zrange<string[]>(INDEX_KEY, 0, -1, { rev: true });
  if (!ids || !ids.length) return [];
  const leads = await Promise.all(ids.map((id) => kv.get<Lead>(leadKey(id))));
  return leads.filter((l): l is Lead => !!l);
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<Lead | null> {
  const lead = await kv.get<Lead>(leadKey(id));
  if (!lead) return null;
  const updated: Lead = { ...lead, status };
  await kv.set(leadKey(id), updated);
  return updated;
}

export async function deleteLead(id: string): Promise<void> {
  await kv.del(leadKey(id));
  await kv.zrem(INDEX_KEY, id);
}
