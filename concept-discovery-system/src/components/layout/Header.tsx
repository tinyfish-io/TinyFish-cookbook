import { Terminal } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

export function Header() {
  return (
    <header className="border-b border-primary/30 bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <Terminal className="h-8 w-8 text-primary glow-primary" />
          <div>
            <h1 className="text-2xl font-bold text-primary glow-primary">
              {APP_NAME}
            </h1>
            <p className="text-xs text-muted-foreground">
              Discover similar projects across multiple platforms
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
