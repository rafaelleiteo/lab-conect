export type OrderStage = "recebido" | "producao" | "cq" | "pronto" | "entregue";

export type Order = {
  code: string;
  product: string;
  dentist: string;
  patient: string;
  delivery: string;
  stage: OrderStage;
};

export const orders: Order[] = [
  { code: "UP-2481", product: "Coroa em zircônia", dentist: "Dr. Marcos Vidal", patient: "J.S.", delivery: "08/07", stage: "recebido" },
  { code: "UP-2482", product: "Guia cirúrgico", dentist: "Dra. Elaine Fonte", patient: "R.M.", delivery: "09/07", stage: "recebido" },
  { code: "UP-2470", product: "Faceta de porcelana", dentist: "Dr. Igor Nunes", patient: "A.C.", delivery: "07/07", stage: "producao" },
  { code: "UP-2465", product: "Coroa em zircônia", dentist: "Dra. Priscila Haddad", patient: "M.T.", delivery: "06/07", stage: "producao" },
  { code: "UP-2458", product: "Prótese sobre implante", dentist: "Dr. Marcos Vidal", patient: "L.F.", delivery: "05/07", stage: "cq" },
  { code: "UP-2450", product: "Modelo impresso", dentist: "Dr. Rafael Leite", patient: "B.O.", delivery: "04/07", stage: "pronto" },
  { code: "UP-2441", product: "Coroa em zircônia", dentist: "Dra. Elaine Fonte", patient: "V.P.", delivery: "02/07", stage: "entregue" },
  { code: "UP-2439", product: "Guia cirúrgico", dentist: "Dr. Igor Nunes", patient: "D.K.", delivery: "01/07", stage: "entregue" },
];

export type Product = {
  name: string;
  deadline: string;
  price: number;
  files: string[];
};

export const products: Product[] = [
  { name: "Coroa em zircônia", deadline: "5 dias úteis", price: 380, files: ["STL", "Foto intraoral", "Cor Vita"] },
  { name: "Guia cirúrgico", deadline: "7 dias úteis", price: 620, files: ["STL", "DICOM", "Planejamento"] },
  { name: "Faceta de porcelana", deadline: "6 dias úteis", price: 450, files: ["STL", "Fotos", "Escala de cor"] },
  { name: "Prótese sobre implante", deadline: "10 dias úteis", price: 1450, files: ["STL", "Componente", "Radiografia"] },
  { name: "Modelo impresso", deadline: "2 dias úteis", price: 90, files: ["STL"] },
];

export type Dentist = {
  name: string;
  clinic: string;
  orders: number;
  status: "ativo" | "pendente";
};

export const dentists: Dentist[] = [
  { name: "Dr. Marcos Vidal", clinic: "Vidal Odontologia", orders: 22, status: "ativo" },
  { name: "Dra. Elaine Fonte", clinic: "Clínica Fonte", orders: 15, status: "ativo" },
  { name: "Dr. Igor Nunes", clinic: "Nunes Odonto", orders: 9, status: "ativo" },
  { name: "Dra. Priscila Haddad", clinic: "Haddad Estética Dental", orders: 4, status: "pendente" },
  { name: "Dr. Rafael Leite", clinic: "Consultório Leite Oliveira", orders: 31, status: "ativo" },
];

export type FinanceEntry = {
  date: string;
  description: string;
  amount: number;
  kind: "entrada" | "comissao";
};

export const financeEntries: FinanceEntry[] = [
  { date: "05/07", description: "Pagamento · Dr. Marcos Vidal", amount: 1830, kind: "entrada" },
  { date: "04/07", description: "Comissão LabConect (2%)", amount: -36.6, kind: "comissao" },
  { date: "03/07", description: "Pagamento · Dra. Elaine Fonte", amount: 1240, kind: "entrada" },
  { date: "02/07", description: "Pagamento · Dr. Rafael Leite", amount: 2790, kind: "entrada" },
];

export type TeamMember = {
  name: string;
  role: string;
};

export const team: TeamMember[] = [
  { name: "Rafael", role: "Administrador" },
  { name: "Isabelle", role: "Financeiro e clientes" },
  { name: "Técnico CAD/CAM", role: "Produção" },
];

export const stageLabels: Record<OrderStage, string> = {
  recebido: "Recebido",
  producao: "Em produção",
  cq: "Controle de qualidade",
  pronto: "Pronto",
  entregue: "Entregue",
};

export const stageOrder: OrderStage[] = ["recebido", "producao", "cq", "pronto", "entregue"];

export const brandColors: { hex: string; name: string }[] = [
  { hex: "#4C5FF5", name: "Azul Parc" },
  { hex: "#2D6FDB", name: "Azul clássico" },
  { hex: "#28854F", name: "Verde" },
  { hex: "#C23A3A", name: "Vermelho" },
  { hex: "#9A6710", name: "Âmbar" },
];
