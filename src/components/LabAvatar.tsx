import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type LabLike = {
  id: string;
  nome: string;
  logo_url?: string | null;
};

const PALETTE = [
  "bg-primary-tint text-primary-tint-foreground",
  "bg-success-tint text-success",
  "bg-warning-tint text-warning",
  "bg-info-tint text-info",
];

function initials(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function paletteFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function useResolvedLogoUrl(logo_url?: string | null) {
  const [url, setUrl] = useState<string | null>(() =>
    logo_url && /^https?:/i.test(logo_url) ? logo_url : null,
  );
  useEffect(() => {
    let cancelled = false;
    if (!logo_url) {
      setUrl(null);
      return;
    }
    if (/^https?:/i.test(logo_url)) {
      setUrl(logo_url);
      return;
    }
    // Treat as storage path in bucket `lab-logos`
    supabase.storage
      .from("lab-logos")
      .createSignedUrl(logo_url, 60 * 60 * 24 * 7)
      .then(({ data }) => {
        if (!cancelled) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [logo_url]);
  return url;
}

export function LabAvatar({
  lab,
  size = 40,
  className = "",
}: {
  lab: LabLike;
  size?: number;
  className?: string;
}) {
  const resolved = useResolvedLogoUrl(lab.logo_url);
  if (resolved) {
    return (
      <img
        src={resolved}
        alt={lab.nome}
        style={{ width: size, height: size }}
        className={`rounded-full object-contain bg-surface-1 border border-border ${className}`}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      className={`grid place-items-center rounded-full font-bold shrink-0 ${paletteFor(lab.id)} ${className}`}
    >
      {initials(lab.nome) || "?"}
    </div>
  );
}
