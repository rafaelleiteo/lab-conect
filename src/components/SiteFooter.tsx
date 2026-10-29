import { Link } from "@tanstack/react-router";
import { ParcLabsLogo } from "@/components/ParcLabsLogo";
import {
  EMPRESA,
  EMPRESA_PLACEHOLDER,
  PAGINAS_LEGAIS_ATIVAS,
  getWhatsappUrl,
} from "@/lib/marketing-config";

export function SiteFooter() {
  const whatsappGeneralUrl = getWhatsappUrl("Olá! Gostaria de falar com a equipe da LabConect.");

  return (
    <footer className="border-t border-border bg-surface-1">
      <div className="mx-auto max-w-6xl px-6 py-12 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <Link to="/" aria-label="Página inicial LabConect">
            <ParcLabsLogo size="md" variant="light" />
          </Link>

          <nav className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground font-medium">
            <a href="/#funcionalidades" className="hover:text-foreground transition">
              Funcionalidades
            </a>
            <Link to="/laboratorios" className="hover:text-foreground transition">
              Planos
            </Link>
            <Link to="/auth" className="hover:text-foreground transition">
              Acesso de dentistas
            </Link>
            {whatsappGeneralUrl && (
              <a
                href={whatsappGeneralUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition"
              >
                Suporte
              </a>
            )}
            {PAGINAS_LEGAIS_ATIVAS && (
              <>
                <Link to="/termos" className="hover:text-foreground transition">
                  Termos de uso
                </Link>
                <Link to="/privacidade" className="hover:text-foreground transition">
                  Política de privacidade
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div>
            {EMPRESA_PLACEHOLDER ? (
              <span>
                {EMPRESA.razaoSocial} | CNPJ: {EMPRESA.cnpj} | {EMPRESA.email} | {EMPRESA.telefone}
              </span>
            ) : (
              <span>
                {EMPRESA.razaoSocial} | CNPJ: {EMPRESA.cnpj} |{" "}
                <a href={`mailto:${EMPRESA.email}`} className="hover:underline">
                  {EMPRESA.email}
                </a>{" "}
                |{" "}
                <a href={`tel:${EMPRESA.telefone.replace(/\D/g, "")}`} className="hover:underline">
                  {EMPRESA.telefone}
                </a>
              </span>
            )}
          </div>
          <div>© {new Date().getFullYear()} LabConect. Todos os direitos reservados.</div>
        </div>
      </div>
    </footer>
  );
}
