import markAsset from "@/assets/labconect-mark.png.asset.json";

type Props = {
  className?: string;
  showWordmark?: boolean;
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
};

const FONT_SIZES: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-3xl",
};

const MARK_SIZES: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-11 w-11",
};

/**
 * .lab.conect. brand logo. `showWordmark=false` renders only the isotype (mark).
 * Uses styled text for `.lab.conect.` ensuring exact branding across light and dark headers.
 */
export function ParcLabsLogo({
  className,
  showWordmark = true,
  variant = "light",
  size = "md",
}: Props) {
  const isDark = variant === "dark";
  const mark = markAsset.url;

  if (!showWordmark) {
    return (
      <img
        src={mark}
        alt=".lab.conect."
        className={`${MARK_SIZES[size]} object-contain shrink-0 ${className ?? ""}`}
      />
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 font-sans select-none ${className ?? ""}`}
      title=".lab.conect."
    >
      <img
        src={mark}
        alt=""
        className={`${MARK_SIZES[size]} object-contain shrink-0`}
      />
      <span className={`flex items-center font-bold tracking-tight leading-none ${FONT_SIZES[size]}`}>
        <span className="text-primary font-black">.</span>
        <span className={isDark ? "text-white" : "text-slate-900"}>lab</span>
        <span className="text-primary font-black">.</span>
        <span className={isDark ? "text-white font-extrabold" : "text-slate-900 font-extrabold"}>conect</span>
        <span className="text-primary font-black">.</span>
      </span>
    </div>
  );
}

export const ConnectLabsLogo = ParcLabsLogo;

