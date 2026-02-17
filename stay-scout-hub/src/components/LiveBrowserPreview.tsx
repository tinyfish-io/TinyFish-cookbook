import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Monitor, X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LiveBrowserPreviewProps {
  streamingUrl: string;
  platformName: string;
  onClose: () => void;
}

export function LiveBrowserPreview({ streamingUrl, platformName, onClose }: LiveBrowserPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Reset loading state when URL changes
    setIsLoading(true);
  }, [streamingUrl]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "fixed z-50 bg-card border-2 border-primary/30 rounded-xl shadow-2xl overflow-hidden",
        isExpanded 
          ? "inset-4 md:inset-8" 
          : "bottom-4 right-4 w-[400px] h-[300px] md:w-[500px] md:h-[350px]"
      )}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            Live: {platformName}
          </span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Browser Content */}
      <div className="relative w-full h-[calc(100%-40px)] bg-background">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Connecting to browser...</span>
            </div>
          </div>
        )}
        <iframe
          src={streamingUrl}
          className="w-full h-full border-0"
          onLoad={() => setIsLoading(false)}
          title={`Live browser preview for ${platformName}`}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </motion.div>
  );
}

// Mini preview component for embedding in cards
interface MiniPreviewProps {
  streamingUrl: string;
  onClick: () => void;
}

export function MiniPreview({ streamingUrl, onClick }: MiniPreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 120 }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-3 rounded-lg overflow-hidden border border-primary/30 cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between px-2 py-1 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-1.5">
          <Monitor className="w-3 h-3 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Live Preview</span>
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
          </span>
        </div>
        <Maximize2 className="w-3 h-3 text-muted-foreground" />
      </div>
      <div className="h-[95px] bg-muted/30 flex items-center justify-center">
        <iframe
          src={streamingUrl}
          className="w-full h-full border-0 pointer-events-none"
          title="Mini browser preview"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </motion.div>
  );
}
