import { createFileRoute, Link } from "@tanstack/react-router";
import {
  IconBuildingStore,
  IconChartBar,
  IconShieldLock,
  IconArrowRight,
  IconCheck,
} from "@tabler/icons-react";
import { ParcLabsLogo } from "@/components/ParcLabsLogo";

export const Route = createFileRoute("/laboratorios")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "LabConect — Planos e Gestão para Laboratórios de Prótese" },
      {
        name: "description",
        content:
          "Sua loja própria e gestão completa de laboratório em um único link. Conheça os planos e cadastre seu laboratório.",
      },
    ],
  }),
  component: LaboratoriosPage,
});

const FUNDADOR_VAGAS_DISPONIVEIS = 10;

function LaboratoriosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <div>
        {/* Topbar */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <Link to="/">
              <ParcLabsLogo size="sm" variant="light" />
            </Link>
            <nav className="flex items-center gap-3">
              <Link
                to="/auth"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-1 transition"
              >
                Login
              </Link>
              <Link
                to="/cadastro-laboratorio"
                className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95 transition"
              >
                Cadastrar laboratório
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero Laboratórios */}
        <section
          className="relative overflow-hidden text-white"
          style={{ backgroundColor: "#0B0F1E" }}
        >
          <div
            aria-hidden
            className="absolute -top-40 -right-32 h-[28rem] w-[28rem] rounded-full opacity-30 blur-3xl"
            style={{ background: "var(--gradient-brand-diagonal)" }}
          />
          <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-24 text-center">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-xs font-medium text-white/80 backdrop-blur">
              Solução completa para Laboratórios de Prótese Dentária
            </span>
            <h1 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight leading-tight max-w-3xl mx-auto">
              Sua loja própria e gestão integrada em um só lugar.
            </h1>
            <p className="mt-4 text-base sm:text-lg text-white/70 max-w-2xl mx-auto">
              Receba pedidos de dentistas em um subdomínio exclusivo, gerencie prazos e trabalhe com split automático de pagamentos.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <a
                href="#planos"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-soft-md)] hover:opacity-95 transition"
              >
                Ver Planos e Preços <IconArrowRight size={16} />
              </a>
            </div>
          </div>
        </section>

        {/* Pilares para o Laboratório */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: <IconBuildingStore size={22} />,
                title: "Loja com subdomínio próprio",
                desc: "Seu laboratório ganha uma vitrine pública exclusiva (ex.: meulab.labconect.com.br) para catalogar produtos e receber pedidos.",
              },
              {
                icon: <IconChartBar size={22} />,
                title: "Gestão operacional & prazos",
                desc: "Painel intuitivo para gerenciar status de produção, solicitar revisões e emitir faturas sem depender de planilhas.",
              },
              {
                icon: <IconShieldLock size={22} />,
                title: "Split de Pagamentos Asaas",
                desc: "Integração transparente: receba por PIX ou cartão com relatórios financeiros automáticos direto na conta do seu laboratório.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-border bg-surface-2 p-6 shadow-[var(--shadow-soft)]"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-[var(--shadow-soft)]">
                  {item.icon}
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tabela de Planos (Movidada Home) */}
        <section id="planos" className="bg-surface-1 border-y border-border">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Planos transparentes para seu laboratório
              </h2>
              <p className="mt-3 text-muted-foreground text-sm">
                Escolha o plano ideal para alavancar suas vendas e organizar sua gestão.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
              {/* Plano Fundador */}
              <div className="rounded-2xl border-2 border-primary/40 bg-background p-6 shadow-[var(--shadow-soft-md)] relative flex flex-col justify-between">
                <div>
                  <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-gradient-brand px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-[var(--shadow-soft)]">
                    Vagas limitadas · {FUNDADOR_VAGAS_DISPONIVEIS} disponíveis
                  </span>
                  <div className="text-sm font-medium text-primary">
                    Plano Fundador
                  </div>
                  <div className="landing-price mt-2 text-3xl font-semibold text-foreground">
                    R$ 149<span className="text-base text-muted-foreground">/mês</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Preço especial de lançamento para os 10 primeiros laboratórios da rede.
                  </p>
                  <ul className="mt-6 space-y-2.5 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2 text-foreground font-medium">
                      <IconCheck size={16} className="text-primary" /> Subdomínio próprio (meulab.labconect.com.br)
                    </li>
                    <li className="flex items-center gap-2 text-foreground font-medium">
                      <IconCheck size={16} className="text-primary" /> Gestão de pedidos e controle de revisões
                    </li>
                    <li className="flex items-center gap-2 text-foreground font-medium">
                      <IconCheck size={16} className="text-primary" /> Split de pagamento Asaas e faturamento PIX
                    </li>
                  </ul>
                </div>
                <Link
                  to="/cadastro-laboratorio"
                  className="mt-8 inline-flex w-full items-center justify-center rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95 transition"
                >
                  Garantir vaga de fundador
                </Link>
              </div>

              {/* Plano Padrão */}
              <div className="rounded-2xl border border-border bg-background p-6 flex flex-col justify-between">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Plano Padrão
                  </div>
                  <div className="landing-price mt-2 text-3xl font-semibold text-foreground">
                    R$ 199<span className="text-base text-muted-foreground">/mês</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Solução completa sem limite de dentistas cadastrados.
                  </p>
                  <ul className="mt-6 space-y-2.5 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <IconCheck size={16} className="text-primary" /> Subdomínio próprio personalizado
                    </li>
                    <li className="flex items-center gap-2">
                      <IconCheck size={16} className="text-primary" /> Catálogo completo com preços por dentista
                    </li>
                    <li className="flex items-center gap-2">
                      <IconCheck size={16} className="text-primary" /> Painéis de gestão operacional e financeira
                    </li>
                  </ul>
                </div>
                <Link
                  to="/cadastro-laboratorio"
                  className="mt-8 inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:border-primary hover:text-primary transition"
                >
                  Cadastrar laboratório
                </Link>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              30 dias de teste grátis em qualquer plano. Sem fidelidade.
            </p>
          </div>
        </section>
      </div>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
          <ParcLabsLogo size="sm" variant="light" className="!h-8" />
          <div>© {new Date().getFullYear()} LabConect. Todos os direitos reservados.</div>
        </div>
      </footer>
    </div>
  );
}
