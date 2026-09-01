import { useEffect, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { IconBuildingStore, IconClock, IconPhone, IconMapPin, IconArrowRight, IconShieldCheck } from "@tabler/icons-react";
import { supabase } from "@/integrations/supabase/client";
import { LabAvatar } from "@/components/LabAvatar";
import { ParcLabsLogo } from "@/components/ParcLabsLogo";

export const Route = createFileRoute("/l/$subdominio")({
  component: PublicLabShowcase,
});

type Lab = {
  id: string;
  nome: string;
  subdominio: string;
  logo_url: string | null;
  cor_destaque: string;
  telefone: string | null;
  email_contato: string | null;
  endereco: string | null;
  endereco_numero: string | null;
  cep: string | null;
  visivel_diretorio: boolean;
};

type Product = {
  id: string;
  nome: string;
  preco: number;
  prazo_dias: number;
  ativo: boolean;
};

function PublicLabShowcase() {
  const { subdominio } = useParams({ from: "/l/$subdominio" });
  const [lab, setLab] = useState<Lab | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setNotFound(false);
      const { data: labData, error: labErr } = await supabase
        .from("labs")
        .select("*")
        .eq("subdominio", subdominio)
        .maybeSingle();

      if (!mounted) return;

      if (labErr || !labData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLab(labData as Lab);

      const { data: prodsData } = await supabase
        .from("products")
        .select("id, nome, preco, prazo_dias, ativo")
        .eq("lab_id", labData.id)
        .eq("ativo", true);

      if (mounted) {
        setProducts((prodsData ?? []) as Product[]);
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [subdominio]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-sm text-muted-foreground">
        Carregando laboratório…
      </div>
    );
  }

  if (notFound || !lab) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="rounded-2xl border border-border bg-surface-2 p-8 max-w-md w-full shadow-[var(--shadow-soft-lg)]">
          <ParcLabsLogo size="md" variant="light" className="mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground">Laboratório não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            O endereço <code className="font-mono text-primary">/l/{subdominio}</code> não corresponde a nenhum laboratório ativo na LabConect.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95"
            >
              Ir para a página inicial
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const brandColor = lab.cor_destaque || "#3B82F6";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Topbar pública */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <ParcLabsLogo size="sm" variant="light" />
            <span className="text-muted-foreground/40">/</span>
            <span className="text-sm font-semibold text-foreground truncate max-w-[200px] sm:max-w-none">
              {lab.nome}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/auth"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-1 transition"
            >
              Login Dentista
            </Link>
            <Link
              to="/cadastro-dentista"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition"
              style={{ backgroundColor: brandColor }}
            >
              Cadastrar para pedir
            </Link>
          </div>
        </div>
      </header>

      {/* Hero / Banner do Laboratório */}
      <section
        className="relative overflow-hidden text-white py-12 px-6"
        style={{
          background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd, #0B0F1E)`,
        }}
      >
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {lab.logo_url ? (
              <LabAvatar lab={lab} size={72} className="border-2 border-white/30 shadow-lg shrink-0" />
            ) : (
              <div className="h-18 w-18 rounded-2xl bg-white/10 border border-white/20 grid place-items-center text-white font-bold text-2xl shrink-0">
                {lab.nome.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-0.5 text-xs font-medium backdrop-blur mb-2">
                <IconShieldCheck size={14} /> Laboratório Verificado
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{lab.nome}</h1>
              <p className="mt-1 text-sm text-white/80 max-w-xl">
                Catálogo oficial de serviços prostéticos digitais. Faça seus pedidos online com entregas rastreadas.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Link
              to="/auth"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-slate-900 px-5 py-3 text-sm font-semibold shadow-md hover:bg-slate-100 transition"
            >
              Fazer Pedido <IconArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Conteúdo Principal: Catálogo de Produtos e Informações */}
      <main className="mx-auto max-w-6xl px-6 py-10 flex-1 w-full space-y-10">
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Catálogo de Serviços</h2>
              <p className="text-sm text-muted-foreground">
                Tabela de produtos oferecidos por {lab.nome}
              </p>
            </div>
            <span className="text-xs font-medium text-muted-foreground bg-surface-2 border border-border px-3 py-1 rounded-full">
              {products.length} {products.length === 1 ? "produto" : "produtos"}
            </span>
          </div>

          {products.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface-2 p-8 text-center text-muted-foreground text-sm">
              Nenhum produto cadastrado no catálogo deste laboratório.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((prod) => (
                <div
                  key={prod.id}
                  className="rounded-2xl border border-border bg-surface-2 p-5 flex flex-col justify-between hover:border-primary/40 transition shadow-[var(--shadow-soft)]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-foreground text-base leading-snug">
                        {prod.nome}
                      </h3>
                      <span
                        className="font-mono font-bold text-base shrink-0"
                        style={{ color: brandColor }}
                      >
                        R$ {Number(prod.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <IconClock size={15} />
                      <span>Prazo estimado: <strong>{prod.prazo_dias} {prod.prazo_dias === 1 ? "dia útil" : "dias úteis"}</strong></span>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Via portal LabConect</span>
                    <Link
                      to="/auth"
                      className="text-xs font-semibold hover:underline flex items-center gap-1"
                      style={{ color: brandColor }}
                    >
                      Solicitar <IconArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Informações do Laboratório */}
        {(lab.telefone || lab.email_contato || lab.endereco) && (
          <div className="rounded-2xl border border-border bg-surface-2 p-6 space-y-4">
            <h3 className="text-base font-semibold text-foreground">Informações de Contato</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              {lab.telefone && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <IconPhone size={18} className="text-primary shrink-0" />
                  <span>{lab.telefone}</span>
                </div>
              )}
              {lab.email_contato && (
                <div className="flex items-center gap-3 text-muted-foreground truncate">
                  <IconBuildingStore size={18} className="text-primary shrink-0" />
                  <span className="truncate">{lab.email_contato}</span>
                </div>
              )}
              {lab.endereco && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <IconMapPin size={18} className="text-primary shrink-0" />
                  <span>{lab.endereco}{lab.endereco_numero ? `, ${lab.endereco_numero}` : ""}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface-1 py-6 px-6 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} {lab.nome} · Powered by LabConect</p>
      </footer>
    </div>
  );
}
