import { useState, type ComponentType } from "react";
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
} from "@tabler/icons-react";
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

type ScreenKey =
  | "painel"
  | "myparclab"
  | "pedidos"
  | "produtos"
  | "clientes"
  | "financeiro"
  | "configuracoes";

const navItems: { key: ScreenKey; label: string; Icon: typeof IconLayoutDashboard }[] = [
  { key: "myparclab", label: "My ConnectLab", Icon: IconDeviceDesktop },
  { key: "painel", label: "Painel", Icon: IconLayoutDashboard },
  { key: "pedidos", label: "Pedidos", Icon: IconClipboardList },
  { key: "produtos", label: "Produtos e fluxos", Icon: IconPackage },
  { key: "clientes", label: "Clientes", Icon: IconUsers },
  { key: "financeiro", label: "Financeiro", Icon: IconReportMoney },
  { key: "configuracoes", label: "Configurações", Icon: IconSettings },
];

const screens: Record<ScreenKey, ComponentType> = {
  painel: Painel,
  myparclab: MyParcLab,
  pedidos: Pedidos,
  produtos: Produtos,
  clientes: Clientes,
  financeiro: Financeiro,
  configuracoes: Configuracoes,
};

export function AppShell() {
  const [active, setActive] = useState<ScreenKey>("myparclab");
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { lab } = useCurrentLab();
  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const Current = screens[active];

  const Nav = (
    <nav className="p-3 space-y-1">
      {navItems.map(({ key, label, Icon }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            onClick={() => {
              setActive(key);
              setMobileOpen(false);
            }}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-primary-tint text-primary-tint-foreground"
                : "text-muted-foreground hover:bg-surface-1 hover:text-foreground"
            }`}
          >
            <Icon size={18} stroke={1.75} />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Topbar */}
      <header className="sticky top-0 z-40 bg-surface-2 border-b border-border">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden rounded-lg p-2 hover:bg-surface-1 text-muted-foreground"
              aria-label="Abrir menu"
            >
              {mobileOpen ? <IconX size={20} /> : <IconMenu2 size={20} />}
            </button>
            <ParcLabsLogo />
            <span className="hidden sm:inline text-muted-foreground">/</span>
            {lab && <LabAvatar lab={lab} size={24} className="hidden sm:block" />}
            <span className="hidden sm:inline truncate text-sm font-semibold text-foreground">
              {lab?.nome ?? "—"}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {lab && (
              <span className="hidden md:inline-flex items-center rounded-full bg-surface-1 border border-border px-3 py-1 font-mono text-xs text-muted-foreground">
                {lab.subdominio}.labconect.com.br
              </span>
            )}
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-lg p-2 text-muted-foreground hover:bg-surface-1"
              aria-label="Sair"
              title="Sair"
            >
              <IconLogout size={18} />
            </button>
            {lab ? (
              <LabAvatar lab={lab} size={36} />
            ) : (
              <div className="h-9 w-9 shrink-0 rounded-full bg-primary text-primary-foreground grid place-items-center text-sm font-semibold">
                RA
              </div>
            )}
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
          <Current />
        </main>
      </div>
    </div>
  );
}
