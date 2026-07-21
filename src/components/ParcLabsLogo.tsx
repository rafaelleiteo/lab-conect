import logoDarkAsset from "@/assets/labconect-logo-dark.png.asset.json";
import logoLightAsset from "@/assets/labconect-logo-light.png.asset.json";
import markAsset from "@/assets/labconect-mark.png.asset.json";

type Props = {
  className?: string;
  showWordmark?: boolean;
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
};

const HEIGHTS: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-10",
  md: "h-14",
  lg: "h-24",
};

/**
 * LabConect brand logo. `showWordmark=false` renders only the isotype (mark).
 * Both assets are tightly cropped (no whitespace / no tagline) so scale honestly
 * at small header sizes.
 */
export function ParcLabsLogo({
  className,
  showWordmark = true,
  variant = "light",
  size = "md",
}: Props) {
  // `variant="dark"` = placed on a dark surface (use the white wordmark).
  // `variant="light"` = placed on a light surface (use the dark wordmark).
  const wordmark = variant === "dark" ? logoDarkAsset.url : logoLightAsset.url;
  const src = showWordmark ? wordmark : markAsset.url;
  return (
    <img
      src={src}
      alt="LabConect"
      data-variant={variant}
      className={`${HEIGHTS[size]} max-w-full w-auto object-contain shrink-0 ${className ?? ""}`}
    />
  );
}

export const ConnectLabsLogo = ParcLabsLogo;
