import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type LabRow = Database["public"]["Tables"]["labs"]["Row"];

export function useCurrentLab() {
  const [lab, setLab] = useState<LabRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | null = null;
    async function load() {
      setLoading(true);
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) {
        if (!cancelled) {
          setLab(null);
          setLoading(false);
          retryTimer = window.setTimeout(() => setReloadKey((k) => k + 1), 350);
        }
        return;
      }
      const { data: member } = await supabase
        .from("lab_members")
        .select("lab_id")
        .eq("user_id", uid)
        .maybeSingle();
      if (!member?.lab_id) {
        if (!cancelled) {
          setLab(null);
          setLoading(false);
        }
        return;
      }
      const { data: labRow } = await supabase
        .from("labs")
        .select("*")
        .eq("id", member.lab_id)
        .maybeSingle();
      if (!cancelled) {
        setLab(labRow ?? null);
        setLoading(false);
      }
    }
    load();
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        window.setTimeout(() => setReloadKey((k) => k + 1), 0);
      }
    });
    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      authListener.subscription.unsubscribe();
    };
  }, [reloadKey]);

  return { lab, loading, reload: () => setReloadKey((k) => k + 1) };
}
