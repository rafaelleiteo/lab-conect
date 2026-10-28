/**
 * Configurações de Marketing e Políticas de Exibição Pública da LabConect
 * Único ponto de verdade para constantes de venda, dados institucionais e flags de lançamento.
 */

export const TRIAL_DIAS = 30;
export const VAGAS_FUNDADOR = 10;
export const PRAZO_MONTAGEM_TEXTO = "24 a 48 horas";

// Obtém o WhatsApp da equipe limpando para manter apenas dígitos com DDI
const rawWhatsapp =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_WHATSAPP_EQUIPE) ||
  (typeof process !== "undefined" && process.env?.VITE_WHATSAPP_EQUIPE) ||
  "";

export const WHATSAPP_EQUIPE = rawWhatsapp.replace(/\D/g, "");

export function getWhatsappUrl(mensagem?: string): string | null {
  if (!WHATSAPP_EQUIPE) return null;
  const baseUrl = `https://wa.me/${WHATSAPP_EQUIPE}`;
  if (!mensagem) return baseUrl;
  return `${baseUrl}?text=${encodeURIComponent(mensagem)}`;
}

export const EMPRESA = {
  razaoSocial: "LabConect (razão social a definir)",
  cnpj: "00.000.000/0001-00",
  email: "contato@example.com",
  telefone: "(00) 0000-0000",
};

export const EMPRESA_PLACEHOLDER = true;
export const PAGINAS_LEGAIS_ATIVAS = false;
export const CADASTRO_LAB_ATIVO = false;

export const EM_BREVE = {
  cursos: true,
  ferramentas: true,
  beneficios: true,
  faturaPorLink: true,
  visualizador3d: true,
};

export const INDEXAR_SITE = false;

export const SUBDOMINIOS_DEMO = ["demo"];

export function isSubdominioDemo(subdominio: string | null | undefined): boolean {
  if (!subdominio) return false;
  return SUBDOMINIOS_DEMO.includes(subdominio.trim().toLowerCase());
}
