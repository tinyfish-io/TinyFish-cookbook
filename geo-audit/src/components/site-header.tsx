"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Why GEO", href: "/#why-geo" },
  { label: "Audit", href: "/audit" },
];

type SiteHeaderProps = {
  primaryAction?: { label: string; href: string };
  showNav?: boolean;
  className?: string;
};

export function SiteHeader({
  primaryAction,
  showNav = true,
  className,
}: SiteHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className={cn(
        "relative flex items-center justify-between",
        className
      )}
    >
      <Link href="/" className="transition-opacity hover:opacity-80">
        <span
          className="text-xl font-black tracking-tight"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
        >
          GEO
        </span>
      </Link>

      {showNav ? (
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors duration-200 hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
      ) : null}

      <div className="flex items-center gap-3">
        {primaryAction ? (
          <Link
            href={primaryAction.href}
            className="hidden md:inline-flex px-5 py-2 bg-foreground text-background text-sm font-semibold tracking-wider uppercase transition-colors hover:bg-foreground/90"
          >
            {primaryAction.label}
          </Link>
        ) : null}
        {showNav ? (
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        ) : null}
      </div>

      {showNav && mobileOpen ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 border-2 border-foreground/10 bg-card p-4 shadow-lg md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            {primaryAction ? (
              <Link
                href={primaryAction.href}
                className="mt-2 w-full px-5 py-2 bg-foreground text-background text-center text-sm font-semibold tracking-wider uppercase"
                onClick={() => setMobileOpen(false)}
              >
                {primaryAction.label}
              </Link>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
