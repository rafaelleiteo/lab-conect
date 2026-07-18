type Props = {
  className?: string;
  showWordmark?: boolean;
};

export function ParcLabsLogo({ className, showWordmark = true }: Props) {
  return (
    <div className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pl-bar" x1="0" y1="28" x2="28" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4C5FF5" />
            <stop offset="100%" stopColor="#7B8BFF" />
          </linearGradient>
        </defs>
        <rect x="2" y="16" width="6" height="10" rx="2" fill="url(#pl-bar)" />
        <rect x="11" y="10" width="6" height="16" rx="2" fill="url(#pl-bar)" />
        <rect x="20" y="2" width="6" height="24" rx="2" fill="url(#pl-bar)" />
      </svg>
      {showWordmark && (
        <span className="text-[17px] font-bold tracking-tight text-foreground">
          parclabs
        </span>
      )}
    </div>
  );
}
