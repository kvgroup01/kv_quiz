export type LeadStatus = "novo" | "respondido" | "desqualificado";

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
