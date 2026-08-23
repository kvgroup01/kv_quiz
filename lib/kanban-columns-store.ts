import { kv } from "@vercel/kv";
import { DEFAULT_COLUMNS, type KanbanColumn } from "./lead-schema";

// Configuração das colunas do Kanban (única, compartilhada entre todos os
// funis). Guardada à parte dos leads pra poder editar nomes/ordem/disparo de
// CAPI sem tocar nos cards já existentes.

const COLUMNS_KEY = "kanban:columns";

export async function getColumns(): Promise<KanbanColumn[]> {
  const saved = await kv.get<KanbanColumn[]>(COLUMNS_KEY);
  if (saved && saved.length) return saved;
  return DEFAULT_COLUMNS;
}

export async function saveColumns(columns: KanbanColumn[]): Promise<KanbanColumn[]> {
  const cleaned = columns
    .map((c) => ({ id: c.id, label: c.label.trim() || c.id, capiEvent: c.capiEvent?.trim() || undefined }))
    .filter((c) => c.id);
  if (!cleaned.length) throw new Error("precisa de ao menos uma coluna");
  await kv.set(COLUMNS_KEY, cleaned);
  return cleaned;
}
