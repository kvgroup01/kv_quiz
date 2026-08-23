import { kv } from "@vercel/kv";
import type { FunnelData } from "./funnel-schema";

// Guarda dois "estados" por funil no Vercel KV:
//   draft:<slug>     — o que o builder está editando agora (link de preview)
//   published:<slug> — o que está no ar de verdade em /quiz/<slug>
// Publicar copia o rascunho atual pro estado publicado — sem precisar de
// commit/deploy. Sem o KV configurado, essas funções lançam erro e as rotas
// tratam isso com uma mensagem clara (mesmo padrão do leads-store.ts).

const INDEX_KEY = "funnels:index";
const draftKey = (slug: string) => `draft:${slug}`;
const publishedKey = (slug: string) => `published:${slug}`;

export interface StoredFunnel {
  data: FunnelData;
  updatedAt: string;
}

export async function saveDraft(data: FunnelData): Promise<StoredFunnel> {
  const stored: StoredFunnel = { data, updatedAt: new Date().toISOString() };
  await kv.set(draftKey(data.slug), stored);
  await kv.sadd(INDEX_KEY, data.slug);
  return stored;
}

export async function getDraft(slug: string): Promise<StoredFunnel | null> {
  return (await kv.get<StoredFunnel>(draftKey(slug))) ?? null;
}

export async function publishFunnel(data: FunnelData): Promise<StoredFunnel> {
  const stored: StoredFunnel = { data, updatedAt: new Date().toISOString() };
  await kv.set(publishedKey(data.slug), stored);
  await kv.set(draftKey(data.slug), stored); // mantém o rascunho sincronizado
  await kv.sadd(INDEX_KEY, data.slug);
  return stored;
}

export async function getPublished(slug: string): Promise<StoredFunnel | null> {
  return (await kv.get<StoredFunnel>(publishedKey(slug))) ?? null;
}

export async function listKnownSlugs(): Promise<string[]> {
  return (await kv.smembers<string[]>(INDEX_KEY)) ?? [];
}
