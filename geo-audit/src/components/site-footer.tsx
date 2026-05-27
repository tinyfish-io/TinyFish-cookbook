import Link from "next/link";
import { cn } from "@/lib/utils";

const FOOTER_LINKS = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Why GEO", href: "/#why-geo" },
  { label: "Audit", href: "/audit" },
];

type SiteFooterProps = {
  className?: string;
};

export function SiteFooter({ className }: SiteFooterProps) {
  return (
    <footer
      className={cn(
        "flex flex-col items-center justify-between gap-4 border-t-2 border-foreground/10 pt-8 pb-2 text-sm text-muted-foreground md:flex-row",
        className
      )}
    >
      <Link href="/" className="transition-opacity hover:opacity-80">
        <span
          className="text-lg font-black tracking-tight"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
        >
          GEO
        </span>
      </Link>
      <div className="flex flex-wrap items-center gap-5">
        {FOOTER_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="transition-colors duration-200 hover:text-foreground"
          >
            {link.label}
          </a>
        ))}
      </div>
      <span>&copy; {new Date().getFullYear()} GEO. Powered by TinyFish.</span>
    </footer>
  );
}
