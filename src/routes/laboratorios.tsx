import { createFileRoute } from "@tanstack/react-router";
import {
  IconBuildingStore,
  IconChartBar,
  IconReceipt,
  IconArrowRight,
  IconCheck,
} from "@tabler/icons-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ActionButton } from "@/components/ActionButton";
import { INDEXAR_SITE, VAGAS_FUNDADOR } from "@/lib/marketing-config";

export const Route = createFileRoute("/laboratorios")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "LabConect - Planos e Gestão para Laboratórios de Prótese" },
      {
        name: "description",
        content:
          "Planos que acompanham o crescimento do seu laboratório. Loja online, gestão de pedidos e dentistas conectados.",
      },
      ...(!INDEXAR_SITE ? [{ name: "robots", content: "noindex, nofollow" }] : []),
    ],
  }),
  component: LaboratoriosPage,
});

function LaboratoriosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <div>
        {/* Cabeçalho Oficial Compartilhado */}
        <SiteHeader />

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
              Planos que acompanham o crescimento do seu laboratório.
            </h1>
            <p className="mt-4 text-base sm:text-lg text-white/70 max-w-2xl mx-auto">
              Loja online, gestão de pedidos e dentistas conectados. 30 dias grátis, sem cartão.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <a
                href="#planos"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-soft-md)] hover:opacity-95 transition"
              >
                Ver planos <IconArrowRight size={16} />
              </a>
            </div>
          </div>
        </section>

        {/* Pilares para o Laboratório */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Pilar 1 */}
            <div className="rounded-2xl border border-border bg-surface-2 p-6 shadow-[var(--shadow-soft)] flex flex-col justify-between">
              <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-[var(--shadow-soft)]">
                  <IconBuildingStore size={22} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  Loja com link próprio
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                  Vitrine pública do laboratório (/l/nome-do-laboratorio) para catalogar produtos e receber pedidos diretamente dos seus dentistas.
                </p>
              </div>
            </div>

            {/* Pilar 2 */}
            <div className="rounded-2xl border border-border bg-surface-2 p-6 shadow-[var(--shadow-soft)] flex flex-col justify-between">
              <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-[var(--shadow-soft)]">
                  <IconChartBar size={22} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  Gestão de pedidos e prazos
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                  Kanban de pedidos, envio de arquivos, status em tempo real e painel com pedidos em andamento, entregues no mês e atrasados.
                </p>
              </div>
            </div>

            {/* Pilar 3 */}
            <div className="rounded-2xl border border-border bg-surface-2 p-6 shadow-[var(--shadow-soft)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-[var(--shadow-soft)]">
                    <IconReceipt size={22} />
                  </div>
                  <span className="rounded-full bg-warning-tint px-2 py-0.5 text-[10px] font-bold text-warning">
                    Em breve
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  Recebimento pela plataforma
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                  O dentista paga online e o laboratório recebe por fatura em link.
                </p>
                <p className="mt-3 text-xs text-muted-foreground/80 leading-relaxed border-t border-border/50 pt-2.5">
                  Receber pela plataforma tem taxa de 2% sobre o valor de cada pedido. No modo gestão própria, em que você recebe por fora, não há taxa.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Tabela de Planos */}
        <section id="planos" className="bg-surface-1 border-y border-border">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Escolha seu plano
              </h2>
              <p className="mt-3 text-muted-foreground text-sm">
                Acompanhe o crescimento do seu laboratório com uma plataforma moderna e integrada.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
              {/* Plano Fundador */}
              <div className="rounded-2xl border-2 border-primary/40 bg-background p-6 shadow-[var(--shadow-soft-md)] relative flex flex-col justify-between">
                <div>
                  <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-gradient-brand px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-[var(--shadow-soft)]">
                    {VAGAS_FUNDADOR} vagas para os primeiros laboratórios
                  </span>
                  <div className="text-sm font-medium text-primary">
                    Plano Fundador
                  </div>
                  <div className="landing-price mt-2 text-3xl font-semibold text-foreground">
                    R$ 149<span className="text-base text-muted-foreground">/mês</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {VAGAS_FUNDADOR} vagas para os primeiros laboratórios.
                  </p>

                  {/* Recursos Ativos */}
                  <ul className="mt-6 space-y-2.5 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2 text-foreground font-medium">
                      <IconCheck size={16} className="text-primary shrink-0" />
                      <span>Loja com link próprio</span>
                    </li>
                    <li className="flex items-center gap-2 text-foreground font-medium">
                      <IconCheck size={16} className="text-primary shrink-0" />
                      <span>Pedido configurável com odontograma e envio de arquivos</span>
                    </li>
                    <li className="flex items-center gap-2 text-foreground font-medium">
                      <IconCheck size={16} className="text-primary shrink-0" />
                      <span>Kanban de pedidos</span>
                    </li>
                    <li className="flex items-center gap-2 text-foreground font-medium">
                      <IconCheck size={16} className="text-primary shrink-0" />
                      <span>Painel do laboratório</span>
                    </li>
                    <li className="flex items-center gap-2 text-foreground font-medium">
                      <IconCheck size={16} className="text-primary shrink-0" />
                      <span>Dentistas vinculados à sua loja</span>
                    </li>
                  </ul>

                  {/* Recursos Em breve */}
                  <div className="mt-6 pt-5 border-t border-border/60">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold text-foreground/80">Recursos em breve</span>
                      <span className="rounded-full bg-warning-tint px-2 py-0.5 text-[10px] font-bold text-warning">
                        Em breve
                      </span>
                    </div>
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-warning/60 shrink-0" />
                        <span>Fatura por link com baixa automática</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-warning/60 shrink-0" />
                        <span>Visualizador 3D de STL e PLY</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-warning/60 shrink-0" />
                        <span>Preço por dentista</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <ActionButton
                  label="Garantir vaga de fundador"
                  size="md"
                  className="mt-8 w-full text-center"
                />
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
                    Plano regular para laboratórios em crescimento.
                  </p>

                  {/* Recursos Ativos */}
                  <ul className="mt-6 space-y-2.5 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2 text-foreground font-medium">
                      <IconCheck size={16} className="text-primary shrink-0" />
                      <span>Loja com link próprio</span>
                    </li>
                    <li className="flex items-center gap-2 text-foreground font-medium">
                      <IconCheck size={16} className="text-primary shrink-0" />
                      <span>Pedido configurável com odontograma e envio de arquivos</span>
                    </li>
                    <li className="flex items-center gap-2 text-foreground font-medium">
                      <IconCheck size={16} className="text-primary shrink-0" />
                      <span>Kanban de pedidos</span>
                    </li>
                    <li className="flex items-center gap-2 text-foreground font-medium">
                      <IconCheck size={16} className="text-primary shrink-0" />
                      <span>Painel do laboratório</span>
                    </li>
                    <li className="flex items-center gap-2 text-foreground font-medium">
                      <IconCheck size={16} className="text-primary shrink-0" />
                      <span>Dentistas vinculados à sua loja</span>
                    </li>
                  </ul>

                  {/* Recursos Em breve */}
                  <div className="mt-6 pt-5 border-t border-border/60">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold text-foreground/80">Recursos em breve</span>
                      <span className="rounded-full bg-warning-tint px-2 py-0.5 text-[10px] font-bold text-warning">
                        Em breve
                      </span>
                    </div>
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-warning/60 shrink-0" />
                        <span>Fatura por link com baixa automática</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-warning/60 shrink-0" />
                        <span>Visualizador 3D de STL e PLY</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-warning/60 shrink-0" />
                        <span>Preço por dentista</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <ActionButton
                  label="Cadastrar laboratório"
                  size="md"
                  className="mt-8 w-full text-center"
                />
              </div>
            </div>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              30 dias de teste grátis em qualquer plano, sem cartão. Sem fidelidade.
            </p>
          </div>
        </section>
      </div>

      {/* Rodapé Oficial Compartilhado */}
      <SiteFooter />
    </div>
  );
}
