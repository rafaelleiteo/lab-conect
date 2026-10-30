import { useEffect, useState, type ComponentType } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  IconLogout,
  IconLayoutDashboard,
  IconDeviceDesktop,
  IconClipboardList,
  IconPackage,
  IconUsers,
  IconReportMoney,
  IconSettings,
  IconMenu2,
  IconX,
  IconUserCircle,
  IconExternalLink,
} from "@tabler/icons-react";
import { CUSTOM_DOMAIN_ACTIVE, getLabPublicUrl } from "@/lib/domain-context";
import { ParcLabsLogo } from "@/components/ParcLabsLogo";
import { LabAvatar } from "@/components/LabAvatar";
import { useCurrentLab } from "@/hooks/useCurrentLab";
import { Painel } from "@/screens/Painel";
import { MyParcLab } from "@/screens/MyParcLab";
import { Pedidos } from "@/screens/Pedidos";
import { Produtos } from "@/screens/Produtos";
import { Clientes } from "@/screens/Clientes";
import { Financeiro } from "@/screens/Financeiro";
import { Configuracoes } from "@/screens/Configuracoes";
import { MeuPerfil } from "@/screens/MeuPerfil";

type ScreenKey =
  | "painel"
  | "myparclab"
  | "pedidos"
  | "produtos"
  | "clientes"
  | "financeiro"
  | "meuperfil"
  | "configuracoes";

const navItems: { key: ScreenKey; label: string; Icon: typeof IconLayoutDashboard }[] = [
  { key: "myparclab", label: "My LabConect", Icon: IconDeviceDesktop },
  { key: "painel", label: "Painel", Icon: IconLayoutDashboard },
  { key: "pedidos", label: "Pedidos", Icon: IconClipboardList },
  { key: "produtos", label: "Produtos e fluxos", Icon: IconPackage },
  { key: "clientes", label: "Clientes", Icon: IconUsers },
  { key: "financeiro", label: "Financeiro", Icon: IconReportMoney },
  { key: "meuperfil", label: "Meu perfil", Icon: IconUserCircle },
  { key: "configuracoes", label: "Configurações", Icon: IconSettings },
];

const screens: Record<ScreenKey, ComponentType> = {
  painel: Painel,
  myparclab: MyParcLab,
  pedidos: Pedidos,
  produtos: Produtos,
  clientes: Clientes,
  financeiro: Financeiro,
  meuperfil: MeuPerfil,
  configuracoes: Configuracoes,
};

interface ToastItem {
  id: string;
  message: string;
}

export function AppShell() {
  const navigate = useNavigate();
  const { lab } = useCurrentLab();
  const [screen, setScreen] = useState<ScreenKey>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("pedido") || sp.get("tela") === "pedidos") return "pedidos";
      const t = sp.get("tela") as ScreenKey;
      if (t && screens[t]) return t;
    }
    return "myparclab";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [recebidosCount, setRecebidosCount] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function loadRecebidosCount() {
    if (!lab) return;
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("lab_id", lab.id)
      .eq("status", "recebido");

    setRecebidosCount(count ?? 0);
  }

  useEffect(() => {
    if (!lab) return;
    loadRecebidosCount();

    const channel = supabase
      .channel(`orders-lab-${lab.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `lab_id=eq.${lab.id}`,
        },
        async (payload) => {
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;

          const isNewRecebido =
            payload.eventType === "INSERT" && newRecord?.status === "recebido";
          const isUpdatedToRecebido =
            payload.eventType === "UPDATE" &&
            newRecord?.status === "recebido" &&
            oldRecord?.status !== "recebido";
          const isLeftRecebido =
            payload.eventType === "UPDATE" &&
            oldRecord?.status === "recebido" &&
            newRecord?.status !== "recebido";
          const isDeletedRecebido =
            payload.eventType === "DELETE" && oldRecord?.status === "recebido";

          if (isNewRecebido || isUpdatedToRecebido || isLeftRecebido || isDeletedRecebido) {
            loadRecebidosCount();
          }

          if (isNewRecebido || isUpdatedToRecebido) {
            let dentistName = newRecord?.nome_dentista_pendente || "Dentista";
            if (newRecord?.dentist_id) {
              const { data: d } = await supabase
                .from("dentists")
                .select("nome")
                .eq("id", newRecord.dentist_id)
                .maybeSingle();
              if (d?.nome) {
                dentistName = d.nome;
              }
            }

            const toastId = `${Date.now()}-${Math.random()}`;
            setToasts((prev) => [
              ...prev,
              { id: toastId, message: `Novo pedido de ${dentistName}` },
            ]);

            setTimeout(() => {
              setToasts((prev) => prev.filter((t) => t.id !== toastId));
            }, 8000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lab?.id]);

  const ActiveScreen = screens[screen];

  const Nav = (
    <nav className="p-3 space-y-1">
      {navItems.map(({ key, label, Icon }) => {
        const isActive = key === screen;
        return (
          <button
            key={key}
            onClick={() => {
              setScreen(key);
              setMobileOpen(false);
            }}
            className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-primary-tint text-primary-tint-foreground"
                : "text-muted-foreground hover:bg-surface-1 hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Icon size={18} stroke={1.75} />
              <span className="truncate">{label}</span>
            </div>
            {key === "pedidos" && recebidosCount > 0 && (
              <span
                data-testid="pedidos-badge"
                className="ml-2 inline-flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground leading-none"
              >
                {recebidosCount}
              </span>
            )}
          </button>
        );
      })}
      {lab && (
        <div className="pt-2 mt-2 border-t border-border">
          <a
            href={getLabPublicUrl(lab.subdominio, "preview")}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-mono text-muted-foreground hover:bg-surface-1 hover:text-foreground transition"
            title="Ver vitrine pública"
          >
            <span className="truncate">
              {CUSTOM_DOMAIN_ACTIVE ? `${lab.subdominio}.labconect.com.br` : `/l/${lab.subdominio}`}
            </span>
            <IconExternalLink size={14} className="opacity-70 shrink-0 ml-1" />
          </a>
        </div>
      )}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Toast container discreto */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              data-testid="realtime-toast"
              className="pointer-events-auto flex items-center justify-between gap-3 rounded-xl bg-surface-2 border border-border shadow-[var(--shadow-soft-lg)] px-4 py-3 text-sm text-foreground animate-in fade-in slide-in-from-top-2"
            >
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="font-medium text-foreground">{t.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="text-muted-foreground hover:text-foreground p-1 text-xs"
                aria-label="Fechar aviso"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Topbar */}
      <header className="sticky top-0 z-40 bg-[#0B0F1E] border-b border-[#0B0F1E] text-white">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden rounded-lg p-2 hover:bg-white/10 text-white/70"
              aria-label="Abrir menu"
            >
              {mobileOpen ? <IconX size={20} /> : <IconMenu2 size={20} />}
            </button>
            {lab ? (
              <div className="flex items-center gap-2">
                <LabAvatar lab={lab} size={28} />
                <span className="truncate text-sm font-bold text-white tracking-wide">{lab.nome}</span>
              </div>
            ) : (
              <span className="text-sm font-semibold text-white">Portal do Laboratório</span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-4">
            {lab && (
              <a
                href={getLabPublicUrl(lab.subdominio, "preview")}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1 font-mono text-xs text-white transition"
                title="Ver vitrine pública do laboratório"
              >
                <span>{CUSTOM_DOMAIN_ACTIVE ? `${lab.subdominio}.labconect.com.br` : `/l/${lab.subdominio}`}</span>
                <IconExternalLink size={13} className="opacity-80" />
              </a>
            )}
            <ParcLabsLogo variant="dark" size="sm" />
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white text-xs"
              aria-label="Sair"
              title="Sair"
            >
              <IconLogout size={16} /> Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 py-6 sm:px-6">
        {/* Sidebar desktop */}
        <aside className="hidden lg:block w-[210px] shrink-0">
          <div className="sticky top-[76px] rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)]">
            {Nav}
          </div>
        </aside>

        {/* Sidebar mobile */}
        {mobileOpen && (
          <div className="fixed inset-0 z-30 lg:hidden" onClick={() => setMobileOpen(false)}>
            <div className="absolute inset-0 bg-foreground/20" />
            <aside
              className="absolute left-0 top-[57px] w-[240px] h-[calc(100vh-57px)] bg-surface-2 border-r border-border shadow-[var(--shadow-soft-lg)]"
              onClick={(e) => e.stopPropagation()}
            >
              {Nav}
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1">
          {screen === "painel" ? (
            <Painel onNavigateToMyParcLab={() => setScreen("myparclab")} />
          ) : (
            <ActiveScreen />
          )}
        </main>
      </div>
    </div>
  );
}
