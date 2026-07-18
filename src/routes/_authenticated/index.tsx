import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCurrentRole } from "@/hooks/useCurrentRole";

export const Route = createFileRoute("/_authenticated/")({
  component: Dispatcher,
});

function Dispatcher() {
  const { role, loading } = useCurrentRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (role === "admin") navigate({ to: "/admin", replace: true });
    else if (role === "lab") navigate({ to: "/lab", replace: true });
    else if (role === "dentist") navigate({ to: "/dentista", replace: true });
  }, [role, loading, navigate]);

  return (
    <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
      {loading ? "Carregando…" : role ? "Redirecionando…" : "Sem papel atribuído para este usuário."}
    </div>
  );
}
