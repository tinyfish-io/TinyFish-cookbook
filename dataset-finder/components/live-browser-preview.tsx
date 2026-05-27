'use client';

import { useState, useEffect } from 'react';
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
    setIsLoading(true);
  }, [streamingUrl]);

  return (
    <div
      className={cn(
        'fixed z-50 bg-card border-2 border-primary/30 rounded-xl shadow-2xl overflow-hidden transition-all duration-300',
        isExpanded ? 'inset-4 md:inset-8' : 'bottom-4 right-4 w-[400px] h-[300px] md:w-[500px] md:h-[350px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Live: {platformName}</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
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
        />
      </div>
    </div>
  );
}
