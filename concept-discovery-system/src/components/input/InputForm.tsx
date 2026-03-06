import { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { useConceptDiscovery } from '@/hooks/useConceptDiscovery';
import { MIN_INPUT_LENGTH } from '@/lib/constants';

export function InputForm() {
  const [input, setInput] = useState('');
  const { discover } = useConceptDiscovery();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (input.trim().length < MIN_INPUT_LENGTH) {
      return;
    }

    setIsSubmitting(true);
    await discover(input.trim());
    setIsSubmitting(false);
  };

  const isValid = input.trim().length >= MIN_INPUT_LENGTH;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <Sparkles className="h-16 w-16 text-primary mx-auto mb-4 glow-primary" />
          <h2 className="text-3xl font-bold mb-2">
            Discover Similar Projects
          </h2>
          <p className="text-muted-foreground mb-2">
            Enter a domain name or describe your project idea in one line
          </p>
          <p className="text-sm text-muted-foreground/80">
            Get implementation ideas and explore how different tech stacks solve similar problems
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., developer productivity tool for visualizing git history"
              className="w-full min-h-[120px] p-4 bg-card border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground transition-all"
              disabled={isSubmitting}
            />
            <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
              {input.length} / {MIN_INPUT_LENGTH} min
            </div>
          </div>

          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="w-full py-4 px-6 bg-primary text-primary-foreground rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-all flex items-center justify-center gap-2 glow-primary"
          >
            {isSubmitting ? (
              <>
                <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Starting Discovery...
              </>
            ) : (
              <>
                <Search className="h-5 w-5" />
                Start Discovery
              </>
            )}
          </button>

          {!isValid && input.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Enter at least {MIN_INPUT_LENGTH} characters to start discovery
            </p>
          )}
        </form>

        <div className="mt-8 p-4 bg-card/50 border border-border/50 rounded-lg">
          <h3 className="text-sm font-semibold mb-2 text-primary">
            💡 Example Ideas:
          </h3>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>• "Personal finance tracking app with AI insights"</p>
            <p>• "Real-time collaborative code editor"</p>
            <p>• "Chrome extension for productivity tracking"</p>
            <p>• "API testing tool with visual workflow builder"</p>
          </div>
        </div>
      </div>
    </div>
  );
}
