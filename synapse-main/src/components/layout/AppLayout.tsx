import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Zap, Play, Library, Activity, Settings } from "lucide-react";

const NAV_ITEMS = [
  { path: "/playground", label: "Playground", icon: Play },
  { path: "/library", label: "Library", icon: Library },
  { path: "/monitor", label: "Monitor", icon: Activity },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex h-14 items-center px-6">
          <Link to="/" className="flex items-center gap-2 mr-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 glow-cyan-sm">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Synapse</span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  location.pathname === path
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-mono text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" />
              API Online
            </div>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
