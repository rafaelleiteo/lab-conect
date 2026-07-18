import logoAsset from "@/assets/connectlabs-logo.png.asset.json";
import markAsset from "@/assets/connectlabs-mark.png.asset.json";

type Props = {
  className?: string;
  showWordmark?: boolean;
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
};

const HEIGHTS: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-6",
  md: "h-8",
  lg: "h-12",
};

/**
 * ConnectLabs brand logo. `showWordmark=false` renders only the isotype (mark).
 * Both assets are tightly cropped (no whitespace / no tagline) so scale honestly
 * at small header sizes.
 */
export function ParcLabsLogo({
  className,
  showWordmark = true,
  variant = "light",
  size = "md",
}: Props) {
  const src = showWordmark ? logoAsset.url : markAsset.url;
  return (
    <img
      src={src}
      alt="ConnectLabs"
      data-variant={variant}
      className={`${HEIGHTS[size]} w-auto object-contain shrink-0 ${className ?? ""}`}
    />
  );
}

export const ConnectLabsLogo = ParcLabsLogo;
