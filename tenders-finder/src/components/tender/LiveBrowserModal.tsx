import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Monitor, Maximize2, Minimize2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LiveBrowserModalProps {
  isOpen: boolean;
  streamingUrl: string;
  platformName: string;
  onClose: () => void;
}

export function LiveBrowserModal({ isOpen, streamingUrl, platformName, onClose }: LiveBrowserModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
  }, [streamingUrl]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col",
            isFullscreen ? 'fixed inset-4' : 'w-full max-w-5xl h-[85vh]'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/10 to-muted/50 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Monitor className="w-5 h-5 text-primary" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
              </div>
              <div>
                <span className="font-semibold text-foreground">Live Browser Preview</span>
                <span className="text-xs text-muted-foreground ml-2">• {platformName}</span>
              </div>
              <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-medium animate-pulse">
                LIVE
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-8 w-8"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Browser Content */}
          <div className="flex-1 bg-background relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/80 z-10">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Connecting to live browser...</p>
                </div>
              </div>
            )}
            <iframe
              src={streamingUrl}
              className="w-full h-full border-0"
              title={`Live browser preview for ${platformName}`}
              onLoad={() => setIsLoading(false)}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
