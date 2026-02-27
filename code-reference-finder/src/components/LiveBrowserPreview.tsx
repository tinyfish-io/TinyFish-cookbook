'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Monitor, X, Maximize2, Minimize2 } from 'lucide-react';

interface LiveBrowserPreviewProps {
  streamingUrl: string;
  title: string;
  onClose: () => void;
}

export function LiveBrowserPreview({
  streamingUrl,
  title,
  onClose,
}: LiveBrowserPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
  }, [streamingUrl]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`fixed z-50 bg-zinc-900 border-2 border-blue-500/30 rounded-xl shadow-2xl overflow-hidden ${
        isExpanded
          ? 'inset-4 md:inset-8'
          : 'bottom-4 right-4 w-[420px] h-[320px] md:w-[520px] md:h-[380px]'
      }`}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/80 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-zinc-200 truncate max-w-[200px]">
            Live: {title}
          </span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded transition-colors"
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Browser iframe */}
      <div className="relative w-full h-[calc(100%-40px)] bg-zinc-950">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-zinc-400">
                Connecting to browser...
              </span>
            </div>
          </div>
        )}
        <iframe
          src={streamingUrl}
          className="w-full h-full border-0"
          onLoad={() => setIsLoading(false)}
          title={`Live browser preview for ${title}`}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </motion.div>
  );
}

// Mini preview for embedding in agent cards
interface MiniPreviewProps {
  streamingUrl: string;
  onClick: () => void;
}

export function MiniPreview({ streamingUrl, onClick }: MiniPreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 240 }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-3 rounded-lg overflow-hidden border border-blue-500/30 cursor-pointer hover:border-blue-500/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between px-2 py-1 bg-zinc-800/50 border-b border-zinc-700">
        <div className="flex items-center gap-1.5">
          <Monitor className="w-3 h-3 text-blue-400" />
          <span className="text-[10px] font-medium text-zinc-400">
            Live Preview
          </span>
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
          </span>
        </div>
        <Maximize2 className="w-3 h-3 text-zinc-500" />
      </div>
      <div className="h-[215px] bg-zinc-950 flex items-center justify-center">
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
