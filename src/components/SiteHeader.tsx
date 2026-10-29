import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { ParcLabsLogo } from "@/components/ParcLabsLogo";
import { ActionButton } from "@/components/ActionButton";

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link to="/" aria-label="Página inicial LabConect">
          <ParcLabsLogo size="md" variant="light" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="/#laboratorios" className="text-muted-foreground hover:text-foreground transition">
            Para laboratórios
          </a>
          <a href="/#dentistas" className="text-muted-foreground hover:text-foreground transition">
            Para dentistas
          </a>
          <a href="/#como-funciona" className="text-muted-foreground hover:text-foreground transition">
            Como funciona
          </a>
          <Link to="/laboratorios" className="text-muted-foreground hover:text-foreground transition">
            Planos
          </Link>
          <a href="/#dentistas" className="text-muted-foreground hover:text-foreground transition">
            Cursos
          </a>
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/auth"
            className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-2 transition border border-border"
          >
            Entrar
          </Link>
          <ActionButton label="Começar teste grátis" size="sm" />
        </div>

        {/* Mobile Hambúrguer Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-foreground/80 hover:text-foreground"
          aria-label="Alternar menu de navegação"
        >
          {mobileMenuOpen ? <IconX size={22} /> : <IconMenu2 size={22} />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background px-6 py-4 space-y-4">
          <nav className="flex flex-col space-y-3 text-sm text-muted-foreground">
            <a
              href="/#laboratorios"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-foreground"
            >
              Para laboratórios
            </a>
            <a
              href="/#dentistas"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-foreground"
            >
              Para dentistas
            </a>
            <a
              href="/#como-funciona"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-foreground"
            >
              Como funciona
            </a>
            <Link
              to="/laboratorios"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-foreground font-medium"
            >
              Planos
            </Link>
            <a
              href="/#dentistas"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-foreground"
            >
              Cursos
            </a>
          </nav>

          <div className="pt-3 border-t border-border flex flex-col gap-2">
            <Link
              to="/auth"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center rounded-lg border border-border py-2 text-xs font-semibold text-foreground bg-surface-1"
            >
              Entrar
            </Link>
            <ActionButton label="Começar teste grátis" size="sm" className="w-full text-center" />
          </div>
        </div>
      )}
    </header>
  );
}
