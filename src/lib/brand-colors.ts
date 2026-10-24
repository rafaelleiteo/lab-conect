export const BRAND_COLORS = [
  { hex: "#4C5FF5", name: "Azul Parc" },
  { hex: "#2D6FDB", name: "Azul clássico" },
  { hex: "#28854F", name: "Verde" },
  { hex: "#C23A3A", name: "Vermelho" },
  { hex: "#9A6710", name: "Âmbar" },
] as const;

export type BrandColor = (typeof BRAND_COLORS)[number]["hex"];
