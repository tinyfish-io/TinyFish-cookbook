import { useState } from 'react';
import { PlatformResult } from '@/types/hotel';
import { Loader2, CheckCircle2, XCircle, Globe, ExternalLink, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AnimatePresence } from 'framer-motion';
import { MiniPreview, LiveBrowserPreview } from './LiveBrowserPreview';

interface PlatformCardProps {
  result: PlatformResult;
}

const platformIcons: Record<string, string> = {
  booking: '🏨',
  agoda: '🌏',
  makemytrip: '✈️',
  goibibo: '🛫',
  expedia: '🗺️',
  hotels: '🏩',
  airbnb: '🏠',
  oyo: '🛏️',
  kayak: '🌐',
  trivago: '🌐',
  'trip.com': '🌐',
  priceline: '🌐',
};

export function PlatformCard({ result }: PlatformCardProps) {
  const [showFullPreview, setShowFullPreview] = useState(false);
  const icon = platformIcons[result.platformId] || '🌐';
  
  const statusColors = {
    pending: 'border-muted bg-muted/30',
    searching: 'border-primary/50 bg-primary/5 shadow-lg shadow-primary/10',
    complete: result.available ? 'border-success/50 bg-success/5' : 'border-warning/50 bg-warning/5',
    error: 'border-destructive/50 bg-destructive/5',
  };

  return (
    <>
      <div
        className={cn(
          "rounded-xl border-2 p-5 transition-all duration-300 animate-fade-in-up flex flex-col min-h-[200px]",
          statusColors[result.status]
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{icon}</span>
            <div>
              <h3 className="font-semibold text-lg text-foreground">{result.platformName}</h3>
              <StatusBadge status={result.status} available={result.available} hasPreview={!!result.streamingUrl} />
            </div>
          </div>
          
          <StatusIcon status={result.status} available={result.available} />
        </div>

        {/* Live Status Message */}
        {result.status === 'searching' && result.statusMessage && (
          <div className="mt-3 p-2 bg-primary/10 rounded-lg">
            <p className="text-xs text-primary font-medium animate-pulse">
              {result.statusMessage}
            </p>
          </div>
        )}

        {/* Live Browser Mini Preview */}
        <AnimatePresence>
          {result.status === 'searching' && result.streamingUrl && (
            <MiniPreview 
              streamingUrl={result.streamingUrl} 
              onClick={() => setShowFullPreview(true)} 
            />
          )}
        </AnimatePresence>
        
        {result.status === 'complete' && result.available && (
          <div className="mt-4 space-y-3 flex-1 flex flex-col">
            <p className="text-sm text-muted-foreground">
              Hotels available for your search
            </p>
            <div className="mt-auto">
              <Button
                variant="hero"
                size="default"
                className="w-full"
                asChild
              >
                <a href={result.searchUrl} target="_blank" rel="noopener noreferrer">
                  Visit Website
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>
          </div>
        )}
        
        {result.status === 'complete' && !result.available && (
          <p className="mt-3 text-sm text-muted-foreground flex-1">{result.message || 'No results found'}</p>
        )}
        
        {result.error && (
          <p className="mt-3 text-sm text-destructive flex-1">{result.error}</p>
        )}
      </div>

      {/* Full Screen Preview Modal */}
      <AnimatePresence>
        {showFullPreview && result.streamingUrl && (
          <LiveBrowserPreview
            streamingUrl={result.streamingUrl}
            platformName={result.platformName}
            onClose={() => setShowFullPreview(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function StatusBadge({ status, available, hasPreview }: { status: PlatformResult['status']; available: boolean; hasPreview?: boolean }) {
  const badges = {
    pending: { text: 'Waiting...', className: 'text-muted-foreground' },
    searching: { text: hasPreview ? 'Agent browsing • Live' : 'Agent browsing...', className: 'text-primary' },
    complete: available 
      ? { text: 'Hotels Available', className: 'text-success' }
      : { text: 'No Results', className: 'text-warning' },
    error: { text: 'Failed', className: 'text-destructive' },
  };
  
  const badge = badges[status];
  
  return (
    <span className={cn("text-xs font-medium flex items-center gap-1.5", badge.className)}>
      {badge.text}
      {status === 'searching' && hasPreview && (
        <Monitor className="w-3 h-3" />
      )}
    </span>
  );
}

function StatusIcon({ status, available }: { status: PlatformResult['status']; available: boolean }) {
  if (status === 'pending') {
    return <Globe className="w-5 h-5 text-muted-foreground" />;
  }
  
  if (status === 'searching') {
    return (
      <div className="relative">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
        <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse" />
      </div>
    );
  }
  
  if (status === 'complete') {
    return available 
      ? <CheckCircle2 className="w-5 h-5 text-success" />
      : <XCircle className="w-5 h-5 text-warning" />;
  }
  
  return <XCircle className="w-5 h-5 text-destructive" />;
}
