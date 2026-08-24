import type { GraphNode, GraphOption, NodeType } from "@/lib/funnel-graph-schema";

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function newOption(): GraphOption {
  return { id: newId("opt"), t: "", icon: "🔹" };
}

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  start: "Início",
  choice: "Pergunta (escolha única)",
  multiChoice: "Pergunta (múltipla escolha)",
  interstitial: "Tela intermediária",
  condition: "Condição",
  score: "Pontuação",
  terminalLead: "Fim: WhatsApp (lead qualificado)",
  terminalDoubt: "Fim: captura de dúvida"
};

/** Nós que o usuário pode adicionar livremente pelo editor. "start" não
 * entra aqui — só existe um, criado junto com o funil. */
export const ADDABLE_NODE_TYPES: NodeType[] = [
  "choice", "multiChoice", "interstitial", "condition", "score", "terminalLead", "terminalDoubt"
];

export function blankNode(type: NodeType, position: { x: number; y: number }, existingNodeIdForDefault?: string): GraphNode {
  const id = newId(type);
  switch (type) {
    case "start":
      return { id, type, position, data: {} };
    case "choice":
      return {
        id, type, position,
        data: { alias: newId("alias"), question: "Nova pergunta", options: [newOption(), newOption()] }
      };
    case "multiChoice":
      return {
        id, type, position,
        data: { alias: newId("alias"), question: "Nova pergunta (múltipla escolha)", note: "Pode marcar mais de uma.", options: [newOption(), newOption()], minSelected: 1 }
      };
    case "interstitial":
      return { id, type, position, data: { kind: "trust" } };
    case "condition":
      return {
        id, type, position,
        data: { rules: [], defaultNodeId: existingNodeIdForDefault || id }
      };
    case "score":
      return { id, type, position, data: { alias: newId("score"), base: 55, rules: [], cap: 96 } };
    case "terminalLead":
      return {
        id, type, position,
        data: { metaEvent: "Lead", whatsappMessageTemplate: "Olá! Meu nome é {{nome}} e fiz a pré-triagem no site." }
      };
    case "terminalDoubt":
      return { id, type, position, data: { metaEvent: "Contact" } };
  }
}
