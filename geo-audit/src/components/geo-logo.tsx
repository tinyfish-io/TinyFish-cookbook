import { cn } from "@/lib/utils";

type GeoLogoIconProps = {
  size?: number;
  className?: string;
};

/**
 * GEO logo mark — two overlapping geometric rectangles forming a stylised "G".
 * The back rectangle sits upper-right; the front open rectangle (the G shape)
 * sits lower-left with a crossbar. A background-colored mask hides the overlap
 * so the front shape reads cleanly in front of the back one.
 */
export function GeoLogoIcon({ size = 36, className }: GeoLogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 68 68"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-primary", className)}
    >
      {/* Back rectangle (upper-right) */}
      <rect
        x="24"
        y="4"
        width="40"
        height="40"
        rx="5"
        stroke="currentColor"
        strokeWidth="5"
        fill="none"
      />

      {/* Overlap mask — uses the page background to cleanly layer the shapes */}
      <rect
        x="1"
        y="21"
        width="46"
        height="46"
        rx="7"
        style={{ fill: "var(--background)" }}
      />

      {/* Front G letterform (lower-left) */}
      <path
        d="M 44 24 H 9 Q 4 24 4 29 V 59 Q 4 64 9 64 H 39 Q 44 64 44 59 V 44 H 26"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

type GeoLogoProps = {
  size?: number;
  className?: string;
  showText?: boolean;
};

export function GeoLogo({
  size = 36,
  className,
  showText = true,
}: GeoLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <GeoLogoIcon size={size} />
      {showText ? (
        <span className="text-lg font-bold tracking-tight">GEO</span>
      ) : null}
    </span>
  );
}
