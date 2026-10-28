import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  IconArrowRight,
  IconCheck,
  IconChevronDown,
  IconBuildingStore,
  IconCalendarEvent,
  IconReceipt,
  IconEye,
  IconFileInvoice,
  IconAdjustments,
  IconUserPlus,
  Icon3dCubeSphere,
  IconLayoutDashboard,
  IconSchool,
  IconCalculator,
  IconGift,
  IconMenu2,
  IconX,
  IconExternalLink,
  IconBrandWhatsapp,
} from "@tabler/icons-react";
import { supabase } from "@/integrations/supabase/client";
import { ParcLabsLogo } from "@/components/ParcLabsLogo";
import {
  TRIAL_DIAS,
  VAGAS_FUNDADOR,
  PRAZO_MONTAGEM_TEXTO,
  getWhatsappUrl,
  EMPRESA,
  EMPRESA_PLACEHOLDER,
  PAGINAS_LEGAIS_ATIVAS,
  CADASTRO_LAB_ATIVO,
  EM_BREVE,
  INDEXAR_SITE,
} from "@/lib/marketing-config";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "LabConect - A plataforma que conecta o mundo da odontologia" },
      {
        name: "description",
        content:
          "Plataforma que conecta dentistas, laboratórios de prótese e conhecimento: gestão de pedidos, ferramentas e cursos de capacitação em um único ecossistema.",
      },
      ...(!INDEXAR_SITE ? [{ name: "robots", content: "noindex, nofollow" }] : []),
      { property: "og:title", content: "LabConect - A plataforma que conecta o mundo da odontologia" },
      {
        property: "og:description",
        content:
          "Plataforma que conecta dentistas, laboratórios de prótese e conhecimento: gestão de pedidos, ferramentas e cursos de capacitação em um único ecossistema.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "LabConect - A plataforma que conecta o mundo da odontologia" },
      {
        name: "twitter:description",
        content:
          "Plataforma que conecta dentistas, laboratórios de prótese e conhecimento: gestão de pedidos, ferramentas e cursos de capacitação em um único ecossistema.",
      },
    ],
  }),
  component: LandingPage,
});

function ActionButton({
  label,
  className = "",
  size = "md",
}: {
  label: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const whatsappUrl = getWhatsappUrl("Olá! Gostaria de começar meu teste grátis na LabConect.");

  const sizeClasses =
    size === "sm"
      ? "px-3.5 py-1.5 text-xs"
      : size === "lg"
      ? "px-6 py-3.5 text-base"
      : "px-5 py-2.5 text-sm";

  if (CADASTRO_LAB_ATIVO) {
    return (
      <Link
        to="/cadastro-laboratorio"
        className={`inline-flex items-center justify-center font-semibold rounded-lg bg-gradient-brand text-white shadow-[var(--shadow-soft)] hover:opacity-95 transition ${sizeClasses} ${className}`}
      >
        {label}
      </Link>
    );
  }

  if (whatsappUrl) {
    return (
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center justify-center gap-2 font-semibold rounded-lg bg-gradient-brand text-white shadow-[var(--shadow-soft)] hover:opacity-95 transition ${sizeClasses} ${className}`}
      >
        <IconBrandWhatsapp size={16} />
        <span>{label}</span>
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled
      className={`inline-flex items-center justify-center font-semibold rounded-lg bg-surface-2 text-muted-foreground border border-border cursor-not-allowed opacity-60 ${sizeClasses} ${className}`}
    >
      Em breve
    </button>
  );
}

function LandingPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const whatsappGeneralUrl = getWhatsappUrl("Olá! Gostaria de falar com a equipe da LabConect.");

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
        Carregando...
      </div>
    );
  }

  const faqItems = [
    {
      q: "Preciso cadastrar todos os meus dentistas manualmente?",
      a: "Não. Seus dentistas se cadastram pelo link da sua loja, e você também pode lançar pedidos para quem ainda não tem conta. Nossa equipe ajuda na montagem inicial.",
    },
    {
      q: "O dentista precisa pagar para acompanhar os pedidos?",
      a: "Não. A conta do dentista é gratuita.",
    },
    {
      q: "Posso usar preços diferentes para cada dentista?",
      a: "Sim. Você pode aplicar desconto por cliente no fechamento da fatura.",
    },
    {
      q: "Como funciona o recebimento das faturas?",
      a: "Você envia a fatura por link e o dentista paga online.",
    },
    {
      q: `O que acontece depois dos ${TRIAL_DIAS} dias de teste?`,
      a: "Você escolhe o plano, cadastra o cartão e segue usando. Sem fidelidade.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <div>
        {/* =========================================================================
            ETAPA 1: CABEÇALHO (Header)
           ========================================================================= */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <Link to="/" aria-label="Página inicial LabConect">
              <ParcLabsLogo size="md" variant="light" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <a href="#laboratorios" className="text-muted-foreground hover:text-foreground transition">
                Para laboratórios
              </a>
              <a href="#dentistas" className="text-muted-foreground hover:text-foreground transition">
                Para dentistas
              </a>
              <a href="#como-funciona" className="text-muted-foreground hover:text-foreground transition">
                Como funciona
              </a>
              <Link to="/laboratorios" className="text-muted-foreground hover:text-foreground transition">
                Planos
              </Link>
              <a href="#dentistas" className="text-muted-foreground hover:text-foreground transition">
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
                  href="#laboratorios"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1 hover:text-foreground"
                >
                  Para laboratórios
                </a>
                <a
                  href="#dentistas"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1 hover:text-foreground"
                >
                  Para dentistas
                </a>
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
                  Planos
                </Link>
                <a
                  href="#dentistas"
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

        {/* =========================================================================
            ETAPA 2: PRIMEIRA DOBRA (Hero com 4 Cartões e Captura Real)
           ========================================================================= */}
        <section
          id="hero"
          className="relative overflow-hidden text-white"
          style={{ backgroundColor: "#0B0F1E" }}
        >
          <div
            aria-hidden
            className="absolute -top-40 -right-32 h-[28rem] w-[28rem] rounded-full opacity-30 blur-3xl pointer-events-none"
            style={{ background: "var(--gradient-brand-diagonal)" }}
          />
          <div
            aria-hidden
            className="absolute -bottom-52 -left-32 h-[32rem] w-[32rem] rounded-full opacity-20 blur-3xl pointer-events-none"
            style={{ background: "var(--gradient-brand)" }}
          />

          <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20 space-y-12">
            {/* Linha Principal do Hero */}
            <div className="max-w-3xl space-y-6">
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-xs font-medium text-white/80 backdrop-blur">
                Ecossistema para a Odontologia
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-[1.15] tracking-tight">
                Uma plataforma que conecta o mundo da odontologia.
              </h1>
              <p className="text-base sm:text-lg text-white/70 leading-relaxed max-w-2xl">
                Loja e gestão de pedidos para laboratórios, rede de parceiros para dentistas e cursos de capacitação técnica.
              </p>

              {/* CTAs do Hero */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <ActionButton label={`Testar ${TRIAL_DIAS} dias grátis`} size="md" />
                <a
                  href="#como-funciona"
                  className="inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition"
                >
                  Ver como funciona <IconArrowRight size={16} />
                </a>
              </div>

              {/* Microtexto e Link de Demonstração */}
              <div className="space-y-1 pt-1 text-xs text-white/60">
                <p>
                  {TRIAL_DIAS} dias grátis, sem cartão de crédito. Nossa equipe monta sua loja em {PRAZO_MONTAGEM_TEXTO}.
                </p>
                <p>
                  <Link
                    to="/l/$subdominio"
                    params={{ subdominio: "demo" }}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-white/80 hover:text-white underline underline-offset-2 transition"
                  >
                    <span>Veja uma loja de demonstração</span>
                    <IconExternalLink size={12} />
                  </Link>
                </p>
              </div>
            </div>

            {/* Imagem Real do Painel Demo com Legenda */}
            <div className="relative rounded-2xl border border-white/10 bg-white/5 p-2 sm:p-3 shadow-2xl backdrop-blur">
              <img
                src="/marketing/painel-demo.png"
                alt="Painel de controle do laboratório com entregas do dia e faturamento"
                width={1280}
                height={800}
                className="rounded-xl w-full h-auto object-cover border border-white/10"
              />
              <p className="mt-2 text-center text-xs text-white/50">
                Exemplo com dados fictícios.
              </p>
            </div>

            {/* Quatro Cartões do Ecossistema */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur shadow-[var(--shadow-soft)] space-y-2">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
                  <IconLayoutDashboard size={20} />
                </div>
                <div className="text-sm font-bold text-white">Gestão de Laboratório</div>
                <div className="text-xs text-white/65">
                  Controle pedidos, produção e valores em um só lugar.
                </div>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur shadow-[var(--shadow-soft)] space-y-2 relative">
                {EM_BREVE.cursos && (
                  <span className="absolute top-4 right-4 rounded-full bg-warning-tint px-2 py-0.5 text-[10px] font-bold text-warning">
                    Em breve
                  </span>
                )}
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
                  <IconSchool size={20} />
                </div>
                <div className="text-sm font-bold text-white">Cursos</div>
                <div className="text-xs text-white/65">
                  Conteúdo e capacitação técnica para evoluir na profissão.
                </div>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur shadow-[var(--shadow-soft)] space-y-2 relative">
                {EM_BREVE.ferramentas && (
                  <span className="absolute top-4 right-4 rounded-full bg-warning-tint px-2 py-0.5 text-[10px] font-bold text-warning">
                    Em breve
                  </span>
                )}
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
                  <IconCalculator size={20} />
                </div>
                <div className="text-sm font-bold text-white">Ferramentas</div>
                <div className="text-xs text-white/65">
                  Utilitários e calculadora de precificação para o dia a dia.
                </div>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur shadow-[var(--shadow-soft)] space-y-2 relative">
                {EM_BREVE.beneficios && (
                  <span className="absolute top-4 right-4 rounded-full bg-warning-tint px-2 py-0.5 text-[10px] font-bold text-warning">
                    Em breve
                  </span>
                )}
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
                  <IconGift size={20} />
                </div>
                <div className="text-sm font-bold text-white">Benefícios</div>
                <div className="text-xs text-white/65">
                  Vantagens e condições exclusivas para quem faz parte da rede.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            ETAPA 3: SEÇÃO DO LABORATÓRIO (Problemas que resolve)
           ========================================================================= */}
        <section id="laboratorios" className="mx-auto max-w-6xl px-6 py-20 scroll-mt-20">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Sua loja de prótese online. Seus dentistas conectados.
            </h2>
            <p className="text-base text-muted-foreground">
              Menos tempo organizando. Mais controle sobre seu laboratório.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-surface-2 p-6 shadow-[var(--shadow-soft)] space-y-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-tint text-primary font-bold">
                <IconBuildingStore size={22} />
              </div>
              <h3 className="text-base font-semibold text-foreground">Pedidos espalhados</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Chega de pedido por WhatsApp e planilha. Tudo em uma loja só.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface-2 p-6 shadow-[var(--shadow-soft)] space-y-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-tint text-primary font-bold">
                <IconCalendarEvent size={22} />
              </div>
              <h3 className="text-base font-semibold text-foreground">Prazos difíceis de acompanhar</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Veja as entregas do dia e identifique os pedidos atrasados.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface-2 p-6 shadow-[var(--shadow-soft)] space-y-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-tint text-primary font-bold">
                <IconReceipt size={22} />
              </div>
              <h3 className="text-base font-semibold text-foreground">Cobrança trabalhosa</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Envie a fatura por link e acompanhe o pagamento.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface-2 p-6 shadow-[var(--shadow-soft)] space-y-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-tint text-primary font-bold">
                <IconEye size={22} />
              </div>
              <h3 className="text-base font-semibold text-foreground">Dentista no escuro</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Seu cliente acompanha o status de cada trabalho.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            ETAPA 4: FUNCIONALIDADES (6 Cartões com Imagens e Ícones)
           ========================================================================= */}
        <section id="funcionalidades" className="bg-surface-1 border-y border-border py-20 scroll-mt-20">
          <div className="mx-auto max-w-6xl px-6 space-y-12">
            <div className="max-w-2xl space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Recursos da Plataforma
              </span>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                Tudo o que seu laboratório precisa em um único endereço.
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* 1. Loja própria (Ícone) */}
              <div className="rounded-2xl border border-border bg-surface-2 p-6 shadow-[var(--shadow-soft)] flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-tint text-primary">
                    <IconBuildingStore size={22} />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">1. Loja própria</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Seu endereço, sua logo, seus produtos. Catálogo online para seus dentistas fazerem pedidos.
                  </p>
                </div>
              </div>

              {/* 2. Pedido configurável (Ícone) */}
              <div className="rounded-2xl border border-border bg-surface-2 p-6 shadow-[var(--shadow-soft)] flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-tint text-primary">
                    <IconAdjustments size={22} />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">2. Pedido configurável</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Monte o formulário do seu jeito, com odontograma e envio de arquivos.
                  </p>
                </div>
              </div>

              {/* 3. Pedido para dentista sem conta (Ícone) */}
              <div className="rounded-2xl border border-border bg-surface-2 p-6 shadow-[var(--shadow-soft)] flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-tint text-primary">
                    <IconUserPlus size={22} />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    3. Pedido para dentista sem conta
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Lance o pedido mesmo se o dentista ainda não tem conta. Quando ele se cadastrar, você confirma que é ele e o histórico é vinculado.
                  </p>
                </div>
              </div>

              {/* 4. Fatura por link (Ícone) */}
              <div className="rounded-2xl border border-border bg-surface-2 p-6 shadow-[var(--shadow-soft)] flex flex-col justify-between space-y-4 relative">
                {EM_BREVE.faturaPorLink && (
                  <span className="absolute top-6 right-6 rounded-full bg-warning-tint px-2 py-0.5 text-[10px] font-bold text-warning">
                    Em breve
                  </span>
                )}
                <div className="space-y-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-tint text-primary">
                    <IconFileInvoice size={22} />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    4. Fatura por link
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Envie a cobrança por link, com opções de pagamento e baixa automática.
                  </p>
                </div>
              </div>

              {/* 5. Dashboard do laboratório (Ícone) */}
              <div className="rounded-2xl border border-border bg-surface-2 p-6 shadow-[var(--shadow-soft)] flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-tint text-primary">
                    <IconLayoutDashboard size={22} />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">5. Dashboard do laboratório</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Pedidos em andamento, entregues no mês, atrasados e valor dos pedidos em um só painel.
                  </p>
                </div>
              </div>

              {/* 6. Visualizador 3D (Ícone) */}
              <div className="rounded-2xl border border-border bg-surface-2 p-6 shadow-[var(--shadow-soft)] flex flex-col justify-between space-y-4 relative">
                {EM_BREVE.visualizador3d && (
                  <span className="absolute top-6 right-6 rounded-full bg-warning-tint px-2 py-0.5 text-[10px] font-bold text-warning">
                    Em breve
                  </span>
                )}
                <div className="space-y-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-tint text-primary">
                    <Icon3dCubeSphere size={22} />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    6. Visualizador 3D
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Veja arquivos STL e PLY direto na plataforma.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            ETAPA 5: COMO FUNCIONA (id="como-funciona")
           ========================================================================= */}
        <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-20 scroll-mt-20">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Seu laboratório organizado em poucos passos.
            </h2>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-surface-2 p-6 shadow-[var(--shadow-soft)] space-y-3">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                1
              </div>
              <p className="text-sm font-medium text-foreground leading-relaxed">
                Crie sua conta e escolha seu plano. {TRIAL_DIAS} dias grátis, sem cartão.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface-2 p-6 shadow-[var(--shadow-soft)] space-y-3">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                2
              </div>
              <p className="text-sm font-medium text-foreground leading-relaxed">
                Envie seus dados pelo WhatsApp. Mande a lista dos seus dentistas (nome e CRO) e sua tabela de preços. Nossa equipe monta sua loja em {PRAZO_MONTAGEM_TEXTO}.
              </p>
              <div className="rounded-lg bg-surface-1 border border-border p-2.5 text-[11px] text-muted-foreground">
                Não envie dados de pacientes por WhatsApp.
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface-2 p-6 shadow-[var(--shadow-soft)] space-y-3">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                3
              </div>
              <p className="text-sm font-medium text-foreground leading-relaxed">
                Divulgue sua loja e receba pedidos. Compartilhe o link por WhatsApp, e-mail ou QR Code.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            ETAPA 6: PARA DENTISTAS (id="dentistas")
           ========================================================================= */}
        <section id="dentistas" className="bg-surface-1 border-y border-border py-20 scroll-mt-20">
          <div className="mx-auto max-w-6xl px-6 space-y-8">
            <div className="max-w-2xl space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Acesso do Dentista
              </span>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                Todos os seus pedidos de prótese em um só lugar.
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Uma conta gratuita para pedir nos laboratórios que usam a LabConect, acompanhar seus trabalhos e ver suas faturas. Sem decorar uma senha para cada laboratório. Para começar, peça ao seu laboratório o link da loja dele.
              </p>
            </div>

            <div className="max-w-md space-y-2.5 text-xs text-foreground font-medium">
              <div className="flex items-center gap-2.5">
                <IconCheck size={16} className="text-primary shrink-0" />
                <span>Histórico centralizado de pedidos</span>
              </div>
              <div className="flex items-center gap-2.5">
                <IconCheck size={16} className="text-primary shrink-0" />
                <span>Faturas e pagamentos</span>
              </div>
              <div className="flex items-center gap-2.5">
                <IconCheck size={16} className="text-primary shrink-0" />
                <span>Cursos, Ferramentas e Benefícios</span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <Link
                to="/cadastro-dentista"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95 transition"
              >
                Criar minha conta de dentista <IconArrowRight size={16} />
              </Link>
              <div>
                <Link
                  to="/auth"
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition"
                >
                  Já tem conta? Entrar
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            ETAPA 7: RESUMO DE PLANOS
           ========================================================================= */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Planos que acompanham o crescimento do seu laboratório.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 max-w-4xl">
            {/* Plano Fundador */}
            <div className="rounded-2xl border-2 border-primary/40 bg-surface-2 p-6 shadow-[var(--shadow-soft)] flex flex-col justify-between space-y-6 relative">
              <div className="space-y-3">
                <div className="text-sm font-medium text-primary">Plano Fundador</div>
                <div className="text-3xl font-semibold text-foreground">
                  R$ 149<span className="text-base text-muted-foreground font-normal">/mês</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {VAGAS_FUNDADOR} vagas para os primeiros laboratórios.
                </p>
                <p className="text-xs font-semibold text-foreground">
                  {TRIAL_DIAS} dias grátis, sem cartão.
                </p>
              </div>
              <ActionButton label="Começar" size="md" className="w-full text-center" />
            </div>

            {/* Plano Padrão */}
            <div className="rounded-2xl border border-border bg-surface-2 p-6 shadow-[var(--shadow-soft)] flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground">Plano Padrão</div>
                <div className="text-3xl font-semibold text-foreground">
                  R$ 199<span className="text-base text-muted-foreground font-normal">/mês</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Solução completa para laboratórios em expansão.
                </p>
                <p className="text-xs font-semibold text-foreground">
                  {TRIAL_DIAS} dias grátis, sem cartão.
                </p>
              </div>
              <ActionButton label="Começar" size="md" className="w-full text-center" />
            </div>
          </div>

          <div className="mt-8">
            <Link
              to="/laboratorios"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <span>Ver planos e condições</span>
              <IconArrowRight size={16} />
            </Link>
          </div>
        </section>

        {/* =========================================================================
            ETAPA 8: UMA LOJA FUNCIONANDO
           ========================================================================= */}
        <section className="bg-surface-1 border-y border-border py-20">
          <div className="mx-auto max-w-6xl px-6 space-y-8">
            <div className="max-w-2xl space-y-3">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                Veja uma loja funcionando.
              </h2>
              <p className="text-base text-muted-foreground">
                Uma loja de demonstração, com dados fictícios, como seus dentistas a verão.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface-2 overflow-hidden shadow-[var(--shadow-soft-lg)] max-w-3xl">
              <img
                src="/marketing/loja-demo.png"
                alt="Vitrine pública do Laboratório Demonstração"
                loading="eager"
                width={800}
                height={450}
                className="w-full h-auto object-cover border-b border-border"
              />
              <div className="p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Laboratório Demonstração</h3>
                  <p className="text-xs text-muted-foreground">Endereço público: /l/demo</p>
                </div>
                <Link
                  to="/l/$subdominio"
                  params={{ subdominio: "demo" }}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-4 py-2 text-xs font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95 transition"
                >
                  <span>Ver loja</span>
                  <IconExternalLink size={14} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            ETAPA 9: PERGUNTAS FREQUENTES (Acordeão Acessível)
           ========================================================================= */}
        <section className="mx-auto max-w-4xl px-6 py-20 space-y-10">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground text-center">
            Perguntas frequentes
          </h2>

          <div className="divide-y divide-border rounded-2xl border border-border bg-surface-2 overflow-hidden shadow-[var(--shadow-soft)]">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index;
              const contentId = `faq-content-${index}`;
              const buttonId = `faq-button-${index}`;

              return (
                <div key={item.q} className="transition">
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={contentId}
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full flex items-center justify-between p-5 text-left text-sm font-semibold text-foreground hover:bg-surface-1 transition gap-4"
                  >
                    <span>{item.q}</span>
                    <IconChevronDown
                      size={18}
                      className={`text-muted-foreground shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-primary" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div
                      id={contentId}
                      role="region"
                      aria-labelledby={buttonId}
                      className="px-5 pb-5 text-xs text-muted-foreground leading-relaxed animate-in fade-in duration-150"
                    >
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* =========================================================================
            ETAPA 10: CTA FINAL E RODAPÉ
           ========================================================================= */}
        <section
          className="relative overflow-hidden text-white py-20"
          style={{ backgroundColor: "#0B0F1E" }}
        >
          <div
            aria-hidden
            className="absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-25 blur-3xl pointer-events-none"
            style={{ background: "var(--gradient-brand)" }}
          />

          <div className="relative mx-auto max-w-4xl px-6 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Pronto para ter sua loja de prótese online?
            </h2>
            <p className="text-base text-white/70 max-w-xl mx-auto leading-relaxed">
              Centralize seus pedidos, acompanhe a produção e mantenha seus dentistas conectados em uma única plataforma.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <ActionButton label="Começar teste grátis" size="lg" />
              {whatsappGeneralUrl && (
                <a
                  href={whatsappGeneralUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/20 px-6 py-3.5 text-base font-semibold text-white hover:bg-white/20 transition"
                >
                  <IconBrandWhatsapp size={18} />
                  <span>Falar com nossa equipe</span>
                </a>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Rodapé Oficial */}
      <footer className="border-t border-border bg-surface-1">
        <div className="mx-auto max-w-6xl px-6 py-12 space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <Link to="/" aria-label="Página inicial LabConect">
              <ParcLabsLogo size="md" variant="light" />
            </Link>

            <nav className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground font-medium">
              <a href="#funcionalidades" className="hover:text-foreground transition">
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
    </div>
  );
}