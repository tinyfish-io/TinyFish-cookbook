import { ExternalLink, CheckCircle2, XCircle, Loader2, Globe, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export type AgentStatus = "idle" | "searching" | "found" | "not_found" | "error";

interface AgentCardProps {
  siteName: string;
  siteUrl: string;
  status: AgentStatus;
  statusMessage?: string;
  streamingUrl?: string;
  mangaTitle: string;
}

const statusConfig: Record<AgentStatus, { icon: React.ReactNode; label: string; className: string }> = {
  idle: {
    icon: <Globe className="w-4 h-4" />,
    label: "Ready",
    className: "text-muted-foreground bg-muted/50",
  },
  searching: {
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    label: "Searching...",
    className: "status-searching",
  },
  found: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: "Found",
    className: "status-found",
  },
  not_found: {
    icon: <XCircle className="w-4 h-4" />,
    label: "Not Found",
    className: "status-not-found",
  },
  error: {
    icon: <XCircle className="w-4 h-4" />,
    label: "Error",
    className: "status-not-found",
  },
};

export function AgentCard({
  siteName,
  siteUrl,
  status,
  statusMessage,
  streamingUrl,
  mangaTitle,
}: AgentCardProps) {
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl bg-card border border-border transition-all duration-300 hover-lift",
        status === "searching" && "animate-pulse-border border-secondary/50",
        status === "found" && "border-success/50",
        status === "not_found" && "border-destructive/30"
      )}
    >
      {/* Scanning effect for searching state */}
      {status === "searching" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/5 to-transparent animate-[scanLine_2s_linear_infinite]" />
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-foreground truncate">
                {siteName}
              </h3>
              <p className="text-xs text-muted-foreground truncate">{new URL(siteUrl).hostname}</p>
            </div>
          </div>
          
          <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0", config.className)}>
            {config.icon}
            <span>{config.label}</span>
          </div>
        </div>
      </div>

      {/* Browser preview area */}
      <div className="relative aspect-video bg-muted/30">
        {streamingUrl && status === "searching" ? (
          <iframe
            src={streamingUrl}
            className="w-full h-full border-0"
            title={`${siteName} browser view`}
            sandbox="allow-same-origin"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            {status === "idle" && (
              <>
                <Eye className="w-8 h-8 opacity-50" />
                <span className="text-sm">Waiting to start...</span>
              </>
            )}
            {status === "searching" && !streamingUrl && (
              <>
                <Loader2 className="w-8 h-8 animate-spin text-secondary" />
                <span className="text-sm text-secondary">Connecting agent...</span>
              </>
            )}
            {status === "found" && (
              <div className="text-center p-4">
                <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-2" />
                <p className="font-display font-semibold text-success">Found!</p>
                <p className="text-sm mt-1">"{mangaTitle}" is available</p>
              </div>
            )}
            {status === "not_found" && (
              <div className="text-center p-4">
                <XCircle className="w-12 h-12 text-destructive/70 mx-auto mb-2" />
                <p className="font-display font-semibold text-destructive/70">Not Found</p>
                <p className="text-sm mt-1">Not available on this site</p>
              </div>
            )}
            {status === "error" && (
              <div className="text-center p-4">
                <XCircle className="w-12 h-12 text-destructive/70 mx-auto mb-2" />
                <p className="font-display font-semibold text-destructive/70">Error</p>
                <p className="text-sm mt-1">Failed to search</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status message */}
      {statusMessage && (
        <div className="px-4 py-2 border-t border-border/50 bg-muted/20">
          <p className="text-xs text-muted-foreground truncate">{statusMessage}</p>
        </div>
      )}

      {/* Footer with link */}
      <div className="p-3 border-t border-border/50">
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <span>Visit Site</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
