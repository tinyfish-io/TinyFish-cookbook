import { Shield } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/50 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <span>SafeDine - Pre-visit safety intelligence</span>
        </div>
        <p>
          Safety scores are estimates. Always communicate your allergens directly to restaurant staff.
        </p>
      </div>
    </footer>
  );
}
