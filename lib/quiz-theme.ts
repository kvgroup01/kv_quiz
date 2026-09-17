export type AccentId = "roxo" | "azul" | "verde" | "petroleo" | "terracota" | "rosa" | "ambar" | "grafite";

export const ACCENTS: { id: AccentId; label: string; hex: string }[] = [
  { id: "roxo", label: "Roxo", hex: "#5645d4" },
  { id: "azul", label: "Azul", hex: "#2456c9" },
  { id: "verde", label: "Verde", hex: "#1a7f37" },
  { id: "petroleo", label: "Petróleo", hex: "#0f5c66" },
  { id: "terracota", label: "Terracota", hex: "#b5502c" },
  { id: "rosa", label: "Rosa", hex: "#b8236b" },
  { id: "ambar", label: "Âmbar", hex: "#9a5b00" },
  { id: "grafite", label: "Grafite", hex: "#37352f" },
];

export function accentHex(id?: string): string {
  return ACCENTS.find((accent) => accent.id === id)?.hex ?? ACCENTS[0].hex;
}
