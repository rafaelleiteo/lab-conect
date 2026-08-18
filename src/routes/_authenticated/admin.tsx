import { Link, Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { IconBuildingSkyscraper, IconSettings, IconLogout, IconClipboardCheck } from "@tabler/icons-react";
import { ParcLabsLogo } from "@/components/ParcLabsLogo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-[#0B0F1E] border-b border-[#0B0F1E] text-white">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <ParcLabsLogo variant="dark" />
            <span className="text-white/40">/</span>
            <span className="text-sm font-semibold text-white">Admin</span>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white"
          >
            <IconLogout size={16} /> Sair
          </button>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1200px] gap-6 px-6 py-6">
        <aside className="w-[220px] shrink-0">
          <nav className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-3 space-y-1">
            <NavLink to="/admin" icon={<IconBuildingSkyscraper size={18} />}>
              Laboratórios
            </NavLink>
            <NavLink to="/admin/revisoes" icon={<IconClipboardCheck size={18} />}>
              Revisões
            </NavLink>
            <NavLink to="/admin/connectlabs" icon={<IconSettings size={18} />}>
              Configuração LabConect
            </NavLink>
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavLink({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: to === "/admin" }}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-1 hover:text-foreground [&.active]:bg-primary-tint [&.active]:text-primary-tint-foreground"
    >
      {icon}
      <span className="truncate">{children}</span>
    </Link>
  );
}
