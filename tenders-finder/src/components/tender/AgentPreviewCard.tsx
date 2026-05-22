"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Globe, CheckCircle2, XCircle, Loader2, Maximize2, Eye, Monitor } from "lucide-react";
import type { AgentState } from "@/types/tender";
import { cn } from "@/lib/utils";

interface AgentPreviewCardProps {
  agent: AgentState;
  onExpandPreview?: (url: string, name: string) => void;
}

export function AgentPreviewCard({ agent, onExpandPreview }: AgentPreviewCardProps) {
  const [shouldHide, setShouldHide] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    if (agent.status === "complete" || agent.status === "error") {
      const timer = setTimeout(() => setShouldHide(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [agent.status]);

  useEffect(() => {
    if (agent.streamingUrl) setIframeLoaded(false);
  }, [agent.streamingUrl]);

  if (shouldHide) return null;

  const getStatusIcon = () => {
    switch (agent.status) {
      case "complete": return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "error": return <XCircle className="w-4 h-4 text-destructive" />;
      case "connecting":
      case "searching": return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      default: return <Globe className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (agent.status) {
      case "complete": return "border-success bg-success/5";
      case "error": return "border-destructive/50 bg-destructive/5";
      case "connecting":
      case "searching": return "border-primary bg-primary/5";
      default: return "border-border bg-muted/20";
    }
  };

  const getStatusBadge = () => {
    switch (agent.status) {
      case "complete": return { text: "Done", color: "bg-success text-white" };
      case "error": return { text: "Error", color: "bg-destructive text-white" };
      case "connecting": return { text: "Connecting", color: "bg-primary text-white" };
      case "searching": return { text: "Live", color: "bg-primary text-white animate-pulse" };
      default: return { text: "Pending", color: "bg-muted text-muted-foreground" };
    }
  };

  const statusBadge = getStatusBadge();
  const hasLivePreview = agent.streamingUrl && (agent.status === "searching" || agent.status === "connecting");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -20 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      className={cn("rounded-xl border-2 overflow-hidden shadow-lg hover:shadow-xl transition-all", getStatusColor())}
    >
      <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-muted/50 to-muted/30 border-b border-border">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {getStatusIcon()}
          <span className="text-sm font-semibold text-foreground truncate">{agent.name}</span>
        </div>
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1", statusBadge.color)}>
          {agent.status === "searching" && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
            </span>
          )}
          {statusBadge.text}
        </span>
      </div>

      <div className="h-44 bg-gradient-to-br from-muted/30 to-muted/10 relative overflow-hidden">
        {hasLivePreview ? (
          <>
            {!iframeLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/80 z-10">
                <div className="text-center">
                  <div className="relative mx-auto mb-2">
                    <Monitor className="w-8 h-8 text-primary/30" />
                    <Loader2 className="w-5 h-5 text-primary animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-xs text-muted-foreground">Loading live view...</p>
                </div>
              </div>
            )}
            <iframe
              src={agent.streamingUrl}
              className="w-full h-full border-0"
              title={`Live preview for ${agent.name}`}
              onLoad={() => setIframeLoaded(true)}
            />
            {onExpandPreview && iframeLoaded && (
              <button
                onClick={() => onExpandPreview(agent.streamingUrl!, agent.name)}
                className="absolute top-2 right-2 p-1.5 bg-primary/90 hover:bg-primary rounded-lg text-white shadow-lg transition-colors z-20"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 text-white px-2 py-1 rounded-full text-xs z-20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              LIVE
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center px-4">
              {agent.status === "pending" ? (
                <><Globe className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" /><p className="text-sm text-muted-foreground">{agent.message}</p></>
              ) : agent.status === "connecting" ? (
                <>
                  <div className="relative mx-auto mb-3">
                    <Globe className="w-12 h-12 text-primary/30" />
                    <Loader2 className="w-6 h-6 text-primary animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-sm font-medium text-primary">{agent.message}</p>
                </>
              ) : agent.status === "searching" && !agent.streamingUrl ? (
                <><Eye className="w-12 h-12 text-primary animate-pulse mx-auto mb-3" /><p className="text-sm font-medium text-primary">{agent.message}</p></>
              ) : agent.status === "complete" ? (
                <><CheckCircle2 className="w-10 h-10 text-success mx-auto mb-3" /><p className="text-sm font-medium text-success">{agent.message}</p></>
              ) : agent.status === "error" ? (
                <><XCircle className="w-10 h-10 text-destructive mx-auto mb-3" /><p className="text-sm font-medium text-destructive">{agent.message}</p></>
              ) : (
                <><Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" /><p className="text-xs text-muted-foreground">{agent.message}</p></>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-3 py-2 bg-gradient-to-r from-muted/30 to-muted/20 border-t border-border">
        <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
          <Globe className="w-3 h-3 flex-shrink-0" />
          {(() => { try { return new URL(agent.url).hostname; } catch { return agent.url; } })()}
        </p>
      </div>
    </motion.div>
  );
}
