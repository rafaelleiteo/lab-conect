type Props = {
  className?: string;
  showWordmark?: boolean;
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
};

// Alturas calibradas em px para legibilidade e proporção sem distorção:
// - sm: barra superior logada (32 a 36 px -> 34px)
// - md: header da home / vitrine (36 a 40 px -> 38px)
// - lg: telas de login e cadastro (48 a 56 px -> 52px)
const HEIGHTS: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-[34px]",
  md: "h-[38px]",
  lg: "h-[52px]",
};

/**
 * LabConect brand logo v2.
 * Assets v2 recortados no limite real (912x246) com suporte a tela retina.
 */
export function ParcLabsLogo({
  className,
  showWordmark = true,
  variant = "light",
  size = "md",
}: Props) {
  const wordmark = variant === "dark" ? "/labconect-logo-v2-dark.png" : "/labconect-logo-v2-light.png";
  return (
    <img
      src={wordmark}
      alt="LabConect"
      width={912}
      height={246}
      data-variant={variant}
      style={{ aspectRatio: "912 / 246" }}
      className={`${HEIGHTS[size]} max-w-full w-auto object-contain shrink-0 ${className ?? ""}`}
    />
  );
}

export const ConnectLabsLogo = ParcLabsLogo;

