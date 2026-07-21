import { useEffect, useState } from "react";
import { brandColors } from "@/data/mock";
import { LabAvatar } from "@/components/LabAvatar";
import { useCurrentLab } from "@/hooks/useCurrentLab";

function BrowserFrame({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-[var(--shadow-soft-md)] bg-surface-2">
      <div className="flex items-center gap-2 bg-surface-1 border-b border-border px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <div className="ml-3 flex-1 rounded-md bg-surface-2 border border-border px-3 py-1 font-mono text-xs text-muted-foreground truncate">
          {url}
        </div>
      </div>
      <div className="min-h-[420px]">{children}</div>
    </div>
  );
}

function LoginPreview({
  name,
  color,
  welcome,
  lab,
}: {
  name: string;
  color: string;
  welcome: string;
  lab: { id: string; nome: string; logo_url?: string | null } | null;
}) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "ML";
  return (
    <div className="min-h-[420px] bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-sm bg-surface-2 rounded-2xl border border-border shadow-[var(--shadow-soft-md)] p-6">
        <div className="flex flex-col items-center text-center">
          {lab?.logo_url ? (
            <LabAvatar lab={lab} size={56} />
          ) : (
            <div className="h-14 w-14 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: color }}>
              {initials}
            </div>
          )}
          <div className="mt-4 text-lg font-semibold text-foreground">{name}</div>
          <p className="mt-1 text-sm text-muted-foreground">{welcome}</p>
        </div>
        <div className="mt-6 space-y-3">
          <input placeholder="E-mail" className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:ring-2" style={{ boxShadow: "none" }} readOnly />
          <input placeholder="Senha" type="password" className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none" readOnly />
          <button className="w-full rounded-lg py-2 text-sm font-medium text-white" style={{ backgroundColor: color }}>Entrar</button>
        </div>
        <div className="mt-5 text-center text-[11px] text-subtle-foreground">
          Via LabConect · conta única em todos os seus laboratórios
        </div>
      </div>
    </div>
  );
}

function StorePreview({
  name,
  color,
  welcome,
  lab,
}: {
  name: string;
  color: string;
  welcome: string;
  lab: { id: string; nome: string; logo_url?: string | null } | null;
}) {
  const products = [
    { name: "Coroa em zircônia", price: "R$ 380" },
    { name: "Guia cirúrgico", price: "R$ 620" },
    { name: "Faceta de porcelana", price: "R$ 450" },
  ];
  return (
    <div className="min-h-[420px] bg-background">
      <div className="p-6 text-white flex items-center gap-4" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
        {lab?.logo_url && <LabAvatar lab={lab} size={48} className="border-white/40" />}
        <div className="min-w-0">
          <div className="text-xl font-bold">{name}</div>
          <p className="mt-1 text-sm opacity-90">{welcome}</p>
        </div>
      </div>
      <nav className="flex gap-5 border-b border-border bg-surface-2 px-6 py-3 text-sm">
        <span className="font-medium" style={{ color }}>Catálogo</span>
        <span className="text-muted-foreground">Meus pedidos</span>
        <span className="text-muted-foreground">Financeiro</span>
        <span className="text-muted-foreground">Mensagens</span>
      </nav>
      <div className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-3">
        {products.map((p) => (
          <div key={p.name} className="rounded-xl bg-surface-2 border border-border p-4">
            <div className="h-20 rounded-lg bg-surface-1" />
            <div className="mt-3 text-sm font-medium text-foreground">{p.name}</div>
            <div className="mt-1 font-mono text-sm" style={{ color }}>{p.price}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MyParcLab() {
  const { lab } = useCurrentLab();
  const [name, setName] = useState("UP Digital");
  const [subdomain, setSubdomain] = useState("updigital");
  const [color, setColor] = useState("#4C5FF5");
  const [welcome, setWelcome] = useState("Acesse seus pedidos e acompanhe cada etapa");
  const [view, setView] = useState<"login" | "store">("login");

  useEffect(() => {
    if (lab) {
      setName(lab.nome);
      setSubdomain(lab.subdominio);
    }
  }, [lab?.id, lab?.nome, lab?.subdominio]);

  const displayName = name.trim() || "Meu laboratório";
  const url = `${subdomain || "meulab"}.labconect.com.br/${view === "login" ? "login" : "loja"}`;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">My ConnectLab</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure a identidade que seus dentistas veem</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-5 space-y-5 h-fit">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nome do laboratório</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Subdomínio</label>
            <div className="mt-1.5 flex items-stretch overflow-hidden rounded-lg border border-border">
              <input value={subdomain} onChange={(e) => setSubdomain(e.target.value)} className="flex-1 min-w-0 bg-surface-2 px-3 py-2 text-sm outline-none" />
              <span className="flex items-center bg-surface-1 px-3 text-xs text-muted-foreground border-l border-border font-mono">.labconect.com.br</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Cor de destaque</label>
            <div className="mt-2 flex gap-2.5">
              {brandColors.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setColor(c.hex)}
                  className={`h-8 w-8 rounded-full transition ${color === c.hex ? "ring-2 ring-offset-2 ring-offset-surface-2" : ""}`}
                  style={{ backgroundColor: c.hex, ...(color === c.hex ? { boxShadow: `0 0 0 2px ${c.hex}` } : {}) }}
                  aria-label={c.name}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Mensagem de boas-vindas</label>
            <textarea value={welcome} onChange={(e) => setWelcome(e.target.value)} rows={3} className="mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary resize-none" />
          </div>
        </div>

        <div className="space-y-3 min-w-0">
          <div className="inline-flex rounded-lg border border-border bg-surface-2 p-1">
            <button
              onClick={() => setView("login")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${view === "login" ? "bg-primary-tint text-primary-tint-foreground" : "text-muted-foreground"}`}
            >
              Tela de login
            </button>
            <button
              onClick={() => setView("store")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${view === "store" ? "bg-primary-tint text-primary-tint-foreground" : "text-muted-foreground"}`}
            >
              Página inicial da loja
            </button>
          </div>
          <BrowserFrame url={url}>
            {view === "login" ? (
              <LoginPreview name={displayName} color={color} welcome={welcome} lab={lab} />
            ) : (
              <StorePreview name={displayName} color={color} welcome={welcome} lab={lab} />
            )}
          </BrowserFrame>
        </div>
      </div>
    </div>
  );
}
