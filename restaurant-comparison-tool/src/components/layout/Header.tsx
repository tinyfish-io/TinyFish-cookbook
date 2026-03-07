import { Shield } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

export function Header() {
  return (
    <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="w-4.5 h-4.5 text-primary" />
          </div>
          <span className="font-bold text-foreground">{APP_NAME}</span>
        </div>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          Restaurant Safety Intelligence
        </span>
      </div>
    </header>
  );
}
