import logoAsset from "@/assets/connectlabs-logo.png.asset.json";

type Props = {
  className?: string;
  showWordmark?: boolean;
  variant?: "light" | "dark";
};

/**
 * ConnectLabs brand logo. Renders the full brand image (mark + wordmark).
 * `showWordmark` is kept for API compatibility; when false, only the mark is shown
 * via CSS clipping. Both variants render the same asset since the source logo
 * uses a dark wordmark that reads well on light backgrounds. On dark surfaces,
 * wrap the logo in a container with sufficient contrast.
 */
export function ParcLabsLogo({ className, showWordmark = true, variant = "light" }: Props) {
  return (
    <div className={`inline-flex items-center ${className ?? ""}`} data-variant={variant}>
      <img
        src={logoAsset.url}
        alt="ConnectLabs"
        className={showWordmark ? "h-8 w-auto object-contain" : "h-8 w-8 object-contain object-left"}
        style={showWordmark ? undefined : { objectPosition: "left center", width: "2rem" }}
      />
    </div>
  );
}

export const ConnectLabsLogo = ParcLabsLogo;
