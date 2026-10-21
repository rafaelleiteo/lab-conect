/**
 * Utilitário de Resolução de Contexto de Laboratório por Domínio / Subdomínio
 * 
 * Regra de Negócio (Passo 2):
 * 1. Simulação / Teste (Ambiente sem DNS Wildcard): Se a URL tiver o parâmetro `?lab=subdominio` (ex: `?lab=updigital`),
 *    este subdomínio é utilizado como contexto forçado do laboratório.
 * 2. Produção (DNS Wildcard Ativo): Se o hostname for `nomedolaboratorio.labconect.com.br` ou `nomedolaboratorio.lab-conect.vercel.app`,
 *    o subdomínio é extraído do próprio hostname.
 * 3. Domínio Raiz (`labconect.com.br` / `lab-conect.vercel.app` sem prefixo): Retorna `null` (contexto geral / institucional).
 */

/**
 * Define se o domínio próprio com DNS curinga (*.labconect.com.br) está ativo.
 * Esta constante vira true quando o domínio labconect.com.br e o DNS curinga estiverem prontos.
 */
export const CUSTOM_DOMAIN_ACTIVE = false;

/**
 * URL base oficial da aplicação e da imagem de compartilhamento open-graph.
 * Quando houver domínio próprio, basta atualizar SITE_URL para "https://labconect.com.br".
 */
export const SITE_URL = "https://lab-conect.vercel.app";
export const OG_IMAGE_URL = `${SITE_URL}/og-labconect.png`;

/**
 * Origens válidas de rastreamento de divulgação da vitrine do laboratório.
 * Qualquer outro valor fornecido na URL é normalizado para 'outro'.
 * Sem parâmetro, o acesso é classificado como 'direto'.
 * 'preview' é reservado para acessos internos da equipe do laboratório e nunca é contabilizado.
 */
export const VALID_STORE_VISIT_ORIGINS = [
  "whatsapp",
  "email",
  "qr",
  "link",
  "compartilhar",
  "preview",
] as const;

export type StoreVisitOrigin = (typeof VALID_STORE_VISIT_ORIGINS)[number];

/**
 * Único ponto centralizado para montagem do link público da vitrine do laboratório.
 * 
 * Regra de Domínio e Subdomínio:
 * Conforme diagnóstico da PARTE 0(b), a rota raiz ("/") renderiza a Landing page institucional e não
 * a vitrine do laboratório quando acessada via subdomínio (ex: updigital.labconect.com.br).
 * Portanto, mesmo quando CUSTOM_DOMAIN_ACTIVE for true, a vitrine continuará servida sob o path
 * `/l/{subdominio}` no domínio principal até que a raiz do subdomínio passe a renderizar a vitrine.
 */
export function getLabPublicUrl(subdominio: string, origem?: string): string {
  const cleanSub = (subdominio || "").trim().toLowerCase();
  const baseUrl = `${SITE_URL}/l/${cleanSub}`;
  if (!origem) {
    return baseUrl;
  }
  return `${baseUrl}?origem=${encodeURIComponent(origem)}`;
}

export function resolveLabSubdomain(customSearch?: string, customHostname?: string): string | null {
  if (typeof window === "undefined" && !customSearch && !customHostname) {
    return null;
  }

  const search = customSearch ?? (typeof window !== "undefined" ? window.location.search : "");
  const hostname = customHostname ?? (typeof window !== "undefined" ? window.location.hostname : "");

  // 1. Simulação de Teste via Query Parameter: ?lab=updigital
  if (search) {
    const params = new URLSearchParams(search);
    const queryLab = params.get("lab");
    if (queryLab && queryLab.trim() !== "") {
      return queryLab.trim().toLowerCase();
    }
  }

  // 2. Leitura Real do Hostname (DNS Wildcard em Produção)
  // --- SUBSTiTUIÇÃO / ATIVAÇÃO DE PRODUÇÃO ---
  // Quando o domínio próprio com CNAME / Wildcard estiver ativo, o hostname resolverá o subdomínio abaixo:
  if (hostname) {
    const parts = hostname.toLowerCase().split(".");
    
    // Ignora localhost e IP diretamente
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return null;
    }

    // Ex: updigital.labconect.com.br -> parts = ['updigital', 'labconect', 'com', 'br']
    if (parts.length >= 3) {
      const sub = parts[0];
      if (sub !== "www" && sub !== "app" && sub !== "lab-conect" && sub !== "labconect") {
        return sub;
      }
    }
  }

  return null;
}
