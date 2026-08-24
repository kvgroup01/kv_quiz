// Contrato de dados de um funil. O builder edita objetos deste formato,
// o motor do quiz (funnel-engine.tsx) só sabe renderizar a partir dele.
// Trocar copy/perguntas nunca deve exigir mexer no motor.

export interface Option {
  v: string;
  t: string;
  /** Emoji da opção — pensado pra carregar o conteúdo E o tom emocional da
   * escolha, não só ilustrar. Opcional: sem ele, o motor mostra "•". */
  icon?: string;
}

export interface AreaContent {
  label: string;
  chip: string;
  selectorText: string;
  situacaoQ: string;
  situacaoOpts: Option[];
  doresQ: string;
  doresOpts: Option[];
}

export interface FunnelConfig {
  firmName: string;
  lawyerName: string;
  oab: string;
  whatsappNumber: string;
  /** Pixel ID do Meta Ads — público, pode ficar no JSON do funil sem problema. */
  metaPixelId: string;
  /** Tema do questionário publicado. Fixo por funil (não segue o sistema do
   * visitante) — quem decide é o escritório, no construtor. Sem valor: claro. */
  theme?: "light" | "dark";
}

export interface HeroContent {
  greeting: string;
  /** Suporta **negrito** e *itálico de destaque* (parser simples, sem HTML solto). */
  headline: string;
  subheadline: string;
  trustNote: string;
}

export interface EventNames {
  leadQualificado: string;
  duvidaCapturada: string;
}

export interface FunnelData {
  slug: string;
  nome: string; // nome interno do funil (pra listar no builder), não aparece pro lead
  config: FunnelConfig;
  eventos: EventNames;
  hero: HeroContent;
  areaOrder: string[];
  areas: Record<string, AreaContent>;
  /** Pergunta de cada tela. Opcionais pra não quebrar funis publicados antes
   * desse campo existir — sem valor, o motor/builder usa o texto padrão. */
  urgenciaQ?: string;
  urgencia: Option[];
  aspiracaoQ?: string;
  aspiracao: Option[];
  honorariosQ?: string;
  honorarios: Option[];
  compromissoQ?: string;
  compromisso: Option[];
}

// Texto usado quando o funil ainda não tem urgenciaQ/aspiracaoQ/etc. salvo
// (funis publicados antes desses campos existirem) — motor e builder usam
// os mesmos defaults pra nunca ficarem dessincronizados.
export const DEFAULT_QUESTIONS = {
  urgenciaQ: "Há quanto tempo isso está acontecendo ou aconteceu?",
  aspiracaoQ: "Se isso for resolvido, o que mudaria mais pra você?",
  honorariosQ: "Você sabe como funciona o pagamento de honorários num caso assim?",
  compromissoQ: "Se identificarmos que você pode ter direito a algo, você teria disponibilidade para falar com um advogado nos próximos dias?"
};

export function emptyOption(prefix: string, i: number): Option {
  return { v: `${prefix}_${i}_${Date.now()}`, t: "", icon: "🔹" };
}

export function blankArea(): AreaContent {
  return {
    label: "Nova área",
    chip: "📌",
    selectorText: "Nova área jurídica",
    situacaoQ: "Qual é a sua situação hoje?",
    situacaoOpts: [
      { v: "op1", t: "Opção 1", icon: "🔹" },
      { v: "op2", t: "Opção 2", icon: "🔹" },
      { v: "op3", t: "Opção 3", icon: "🔹" },
      { v: "op4", t: "Opção 4", icon: "🔹" }
    ],
    doresQ: "O que mais te preocupa nessa situação?",
    doresOpts: [
      { v: "d1", t: "Ponto 1", icon: "🔹" },
      { v: "d2", t: "Ponto 2", icon: "🔹" },
      { v: "d3", t: "Ponto 3", icon: "🔹" },
      { v: "d4", t: "Ponto 4", icon: "🔹" }
    ]
  };
}
