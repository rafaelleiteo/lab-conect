import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "lab" | "dentist" | null;

export function useCurrentRole() {
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        if (!cancelled) {
          setRole(null);
          setLoading(false);
        }
        return;
      }
      setEmail(userData.user?.email ?? null);
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      if (cancelled) return;
      const roles = (data ?? []).map((r) => r.role as Role);
      if (roles.includes("admin")) setRole("admin");
      else if (roles.includes("lab")) setRole("lab");
      else if (roles.includes("dentist")) setRole("dentist");
      else setRole(null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { role, loading, email };
}
