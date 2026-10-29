import { Link } from "@tanstack/react-router";
import { IconBrandWhatsapp } from "@tabler/icons-react";
import { CADASTRO_LAB_ATIVO, getWhatsappUrl } from "@/lib/marketing-config";

interface ActionButtonProps {
  label: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ActionButton({ label, className = "", size = "md" }: ActionButtonProps) {
  const whatsappUrl = getWhatsappUrl("Olá! Gostaria de testar a LabConect por 30 dias grátis.");

  const sizeClasses =
    size === "sm"
      ? "px-3.5 py-1.5 text-xs"
      : size === "lg"
      ? "px-6 py-3.5 text-base"
      : "px-5 py-2.5 text-sm";

  if (CADASTRO_LAB_ATIVO) {
    return (
      <Link
        to="/cadastro-laboratorio"
        className={`inline-flex items-center justify-center font-semibold rounded-lg bg-gradient-brand text-white shadow-[var(--shadow-soft)] hover:opacity-95 transition ${sizeClasses} ${className}`}
      >
        {label}
      </Link>
    );
  }

  if (whatsappUrl) {
    return (
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center justify-center gap-2 font-semibold rounded-lg bg-gradient-brand text-white shadow-[var(--shadow-soft)] hover:opacity-95 transition ${sizeClasses} ${className}`}
      >
        <IconBrandWhatsapp size={16} />
        <span>{label}</span>
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled
      className={`inline-flex items-center justify-center font-semibold rounded-lg bg-surface-2 text-muted-foreground border border-border cursor-not-allowed opacity-60 ${sizeClasses} ${className}`}
    >
      Em breve
    </button>
  );
}
