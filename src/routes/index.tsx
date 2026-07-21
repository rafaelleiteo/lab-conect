import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { IconArrowRight, IconBuildingStore, IconChartBar, IconShieldLock } from "@tabler/icons-react";
import { supabase } from "@/integrations/supabase/client";
import { ParcLabsLogo } from "@/components/ParcLabsLogo";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "LabConect — Loja e gestão do seu laboratório em um único link" },
      {
        name: "description",
        content:
          "LabConect conecta laboratórios de prótese e dentistas: catálogo, pedidos, pagamentos e gestão em uma única plataforma.",
      },
      { property: "og:title", content: "LabConect" },
      {
        property: "og:description",
        content:
          "Loja e gestão do seu laboratório de prótese em um único link. Comece agora.",
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
      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <ParcLabsLogo size="sm" variant="light" />
          <nav className="flex items-center gap-2 sm:gap-3">
            <a
              href="#como-funciona"
              className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition"
            >
              Como funciona
            </a>
            <a
              href="#planos"
              className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition"
            >
              Planos
            </a>
            <Link
              to="/auth"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-1 transition"
            >
              Login
            </Link>
            <Link
              to="/cadastro-laboratorio"
              className="rounded-lg bg-gradient-brand px-3 py-1.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95 transition"
            >
              Cadastrar laboratório
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section
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
        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-20 sm:py-28 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/70 backdrop-blur">
              Para laboratórios de prótese e dentistas
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold leading-[1.05] tracking-tight">
              Sua loja e gestão de laboratório em{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "var(--gradient-brand)" }}
              >
                um único link
              </span>
              .
            </h1>
            <p className="max-w-xl text-base sm:text-lg text-white/70">
              Catálogo com preços por dentista, pedidos, revisões, pagamentos e
              relatórios. Tudo pronto para você começar a vender hoje.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/cadastro-laboratorio"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-soft-md)] hover:opacity-95 transition"
              >
                Comece seu laboratório <IconArrowRight size={16} />
              </Link>
              <Link
                to="/cadastro-dentista"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10 transition"
              >
                Sou dentista
              </Link>
            </div>
          </div>
          <div className="relative hidden md:flex items-center justify-center">
            <div className="rounded-3xl bg-white/[0.03] p-10 backdrop-blur border border-white/10 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]">
              <ParcLabsLogo size="lg" variant="dark" className="!h-24" />
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            Como funciona
          </h2>
          <p className="mt-3 text-muted-foreground">
            Um único link substitui catálogo em PDF, WhatsApp desorganizado e
            planilhas paralelas.
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

      {/* Planos */}
      <section id="planos" className="bg-surface-1 border-y border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Planos
            </h2>
            <p className="mt-3 text-muted-foreground">
              Comece com um único plano transparente, sem taxas escondidas.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-[1fr_1fr] max-w-3xl">
            <div className="rounded-2xl border border-border bg-background p-6">
              <div className="text-sm font-medium text-muted-foreground">
                Dentista
              </div>
              <div className="mt-2 text-3xl font-semibold text-foreground">
                Grátis
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Cadastro sem custo. Você paga só pelos pedidos que fizer no
                laboratório escolhido.
              </p>
              <Link
                to="/cadastro-dentista"
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:border-primary hover:text-primary transition"
              >
                Criar conta de dentista
              </Link>
            </div>
            <div className="rounded-2xl border-2 border-primary/40 bg-background p-6 shadow-[var(--shadow-soft-md)]">
              <div className="text-sm font-medium text-primary">
                Laboratório
              </div>
              <div className="mt-2 text-3xl font-semibold text-foreground">
                R$ 199<span className="text-base text-muted-foreground">/mês</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Loja com subdomínio próprio, gestão de pedidos, revisões,
                financeiro e split de pagamento incluso.
              </p>
              <Link
                to="/cadastro-laboratorio"
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95 transition"
              >
                Cadastrar laboratório
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
          <ParcLabsLogo size="sm" variant="light" className="!h-8" />
          <div>© {new Date().getFullYear()} LabConect. Todos os direitos reservados.</div>
        </div>
      </footer>
    </div>
  );
}