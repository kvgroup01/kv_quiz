// status agora é o id de uma coluna do Kanban (dinâmica, configurável em
// lib/kanban-columns-store.ts) — deixou de ser um union fixo.
export type LeadStatus = string;

export type LeadTipo = "qualificado" | "duvida";

export interface LeadUtm {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
}

export interface Lead {
  id: string;
  criadoEm: string;
  funil: string;
  status: LeadStatus;
  tipo: LeadTipo;
  area: string;
  situacao: string;
  urgencia: string;
  dores: string[];
  compromisso: string;
  nome: string;
  whatsapp: string;
  perguntaTexto: string | null;
  perguntaAudioBase64: string | null;
  perguntaAudioMime: string | null;
  utm: LeadUtm;
}

export type NewLead = Omit<Lead, "id" | "criadoEm" | "status">;

export interface KanbanColumn {
  id: string;
  label: string;
  /** Nome do evento disparado pra Conversions API do Meta quando um card é
   * movido pra essa coluna (ex: "Purchase", "Schedule"). Vazio = não dispara. */
  capiEvent?: string;
}

export const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: "novo", label: "Novo" },
  { id: "respondido", label: "Respondido" },
  { id: "desqualificado", label: "Desqualificado" }
];
