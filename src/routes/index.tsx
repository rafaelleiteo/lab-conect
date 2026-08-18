import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  IconArrowRight,
  IconBuildingStore,
  IconChartBar,
  IconShieldLock,
  IconCalculator,
  IconSchool,
  IconGift,
  IconMenu2,
  IconX,
} from "@tabler/icons-react";
import { supabase } from "@/integrations/supabase/client";
import { ParcLabsLogo } from "@/components/ParcLabsLogo";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "LabConect — A plataforma que conecta dentistas e laboratórios de prótese" },
      {
        name: "description",
        content:
          "Plataforma completa para laboratórios de prótese e dentistas: loja própria, pedidos, gestão, ferramentas e aprendizado em um único ecossistema.",
      },
      { property: "og:title", content: "LabConect" },
      {
        property: "og:description",
        content:
          "Plataforma que conecta dentistas e laboratórios de prótese. Conheça agora.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!data.user) {
        setChecking(false);
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      const role = roles?.[0]?.role;
      if (role === "admin") navigate({ to: "/admin", replace: true });
      else if (role === "lab") navigate({ to: "/lab", replace: true });
      else if (role === "dentist") navigate({ to: "/dentista", replace: true });
      else setChecking(false);
    })();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 1. Header (Navegação) */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/">
            <ParcLabsLogo size="sm" variant="light" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a
              href="#como-funciona"
              className="text-muted-foreground hover:text-foreground transition"
            >
              Como funciona
            </a>
            <Link
              to="/laboratorios"
              className="text-muted-foreground hover:text-foreground transition font-medium"
            >
              Para laboratórios
            </Link>
            <a
              href="#dentistas"
              className="text-muted-foreground hover:text-foreground transition"
            >
              Para dentistas
            </a>
            <a
              href="#dentistas"
              className="text-muted-foreground hover:text-foreground transition"
            >
              Academy
            </a>
            <Link
              to="/auth"
              className="text-muted-foreground hover:text-foreground transition"
            >
              Login
            </Link>
          </nav>

          {/* Desktop CTAs Lado a Lado (Mesmo Peso Visual) */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/laboratorios"
              className="rounded-lg border border-border px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-2 transition"
            >
              Sou laboratório
            </Link>
            <Link
              to="/cadastro-dentista"
              className="rounded-lg border border-border px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-2 transition"
            >
              Sou dentista
            </Link>
          </div>

          {/* Mobile Hambúrguer Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-foreground/80 hover:text-foreground"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <IconX size={22} /> : <IconMenu2 size={22} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-background px-6 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 pb-3 border-b border-border">
              <Link
                to="/laboratorios"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center rounded-lg border border-border py-2 text-xs font-semibold text-foreground bg-surface-1"
              >
                Sou laboratório
              </Link>
              <Link
                to="/cadastro-dentista"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center rounded-lg border border-border py-2 text-xs font-semibold text-foreground bg-surface-1"
              >
                Sou dentista
              </Link>
            </div>
            <nav className="flex flex-col space-y-2 text-sm text-muted-foreground">
              <a
                href="#como-funciona"
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
                Para laboratórios
              </Link>
              <a
                href="#dentistas"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-foreground"
              >
                Para dentistas
              </a>
              <a
                href="#dentistas"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-foreground"
              >
                Academy
              </a>
              <Link
                to="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-foreground font-medium text-primary"
              >
                Login
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* 2. Hero — Duas colunas, neutro, sem preço */}
      <section
        id="hero"
        className="relative overflow-hidden text-white"
        style={{ backgroundColor: "#0B0F1E" }}
      >
        <div
          aria-hidden
          className="absolute -top-40 -right-32 h-[28rem] w-[28rem] rounded-full opacity-30 blur-3xl"
          style={{ background: "var(--gradient-brand-diagonal)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-52 -left-32 h-[32rem] w-[32rem] rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--gradient-brand)" }}
        />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:py-24 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          {/* Coluna Esquerda */}
          <div className="space-y-6">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-xs font-medium text-white/80 backdrop-blur">
              Ecossistema para Odontologia & Prótese Dentária
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-[1.1] tracking-tight">
              A plataforma que conecta dentistas e laboratórios de prótese.
            </h1>
            <p className="max-w-xl text-base sm:text-lg text-white/70">
              Loja própria para laboratórios, catálogo inteligente, gestão operacional e rede de parceiros em uma única solução.
            </p>

            {/* Dois CTAs de mesmo peso visual */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/laboratorios"
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20 transition"
              >
                Sou laboratório <IconArrowRight size={16} />
              </Link>
              <Link
                to="/cadastro-dentista"
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20 transition"
              >
                Sou dentista <IconArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Coluna Direita — Composição decorativa de múltiplos elementos do ecossistema */}
          <div className="relative flex items-center justify-center">
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur shadow-[var(--shadow-soft)] space-y-2">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
                  <IconBuildingStore size={20} />
                </div>
                <div className="text-sm font-bold text-white">Gestão de Laboratório</div>
                <div className="text-xs text-white/60">Pedidos, revisões e faturamento.</div>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur shadow-[var(--shadow-soft)] space-y-2">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
                  <IconSchool size={20} />
                </div>
                <div className="text-sm font-bold text-white">Academy</div>
                <div className="text-xs text-white/60">Cursos e capacitação técnica.</div>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur shadow-[var(--shadow-soft)] space-y-2">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
                  <IconCalculator size={20} />
                </div>
                <div className="text-sm font-bold text-white">Tools</div>
                <div className="text-xs text-white/60">Utilitários e precificação.</div>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur shadow-[var(--shadow-soft)] space-y-2">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
                  <IconGift size={20} />
                </div>
                <div className="text-sm font-bold text-white">Benefícios</div>
                <div className="text-xs text-white/60">Condições exclusivas.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Seção "Como funciona" (Neutro) */}
      <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            Como funciona
          </h2>
          <p className="mt-3 text-muted-foreground">
            Um único link substitui catálogo em PDF, WhatsApp desorganizado e planilhas paralelas.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: <IconBuildingStore size={22} />,
              title: "Sua loja pública",
              desc: "Cada laboratório recebe um subdomínio próprio (ex.: meulab.labconect.com.br) para dentistas fazerem pedidos.",
            },
            {
              icon: <IconChartBar size={22} />,
              title: "Gestão do dia a dia",
              desc: "Pedidos, revisões, financeiro e clientes em painéis feitos para laboratório de prótese, não CRM genérico.",
            },
            {
              icon: <IconShieldLock size={22} />,
              title: "Pagamento seguro",
              desc: "Cobrança e split via Asaas. O dinheiro cai direto na conta do laboratório, com relatórios prontos.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-surface-2 p-6 shadow-[var(--shadow-soft)]"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-[var(--shadow-soft)]">
                {f.icon}
              </div>
              <div className="mt-4 text-base font-semibold text-foreground">
                {f.title}
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Seção "Para laboratórios" (Curta com CTA para /laboratorios) */}
      <section className="bg-surface-1 border-y border-border py-16">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Para Laboratórios de Prótese
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Alavanque seu laboratório com loja própria e gestão integrada
            </h2>
            <p className="text-sm text-muted-foreground">
              Receba pedidos de qualquer dentista com tabela por perfil, controle prazos de entrega e automatize o recebimento com split financeiro.
            </p>
          </div>
          <Link
            to="/laboratorios"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95 transition"
          >
            Ver planos e preços <IconArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* 5. Seção "Para dentistas" (Grátis) */}
      <section id="dentistas" className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            Grátis para dentistas
          </h2>
          <p className="mt-3 text-muted-foreground">
            Além de pedir de qualquer laboratório da rede com uma única conta, você tem acesso a ferramentas gratuitas para sua clínica.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {[
            {
              icon: <IconCalculator size={22} />,
              title: "LabConect Tools",
              desc: "Ferramentas de precificação e cálculo para o consultório.",
            },
            {
              icon: <IconSchool size={22} />,
              title: "LabConect Academy",
              desc: "Mentoria e cursos com dentistas especialistas — conheça, com acesso gratuito eventual.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-surface-2 p-6 shadow-[var(--shadow-soft)]"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-[var(--shadow-soft)]">
                {f.icon}
              </div>
              <div className="mt-4 text-base font-semibold text-foreground">
                {f.title}
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link
            to="/cadastro-dentista"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95 transition"
          >
            Criar conta de dentista
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
          <ParcLabsLogo size="sm" variant="light" className="!h-8" />
          <div>© {new Date().getFullYear()} LabConect. Todos os direitos reservados.</div>
        </div>
      </footer>
    </div>
  );
}