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
