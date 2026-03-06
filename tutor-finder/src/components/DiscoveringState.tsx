import { Sparkles, Loader2 } from 'lucide-react';
import type { ExamType } from '@/types/tutor';

interface DiscoveringStateProps {
  exam: ExamType;
  location: string;
}

export function DiscoveringState({ exam, location }: DiscoveringStateProps) {
  return (
    <div className="w-full max-w-md mx-auto text-center animate-fade-in">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
        <Sparkles className="w-10 h-10 text-primary animate-pulse" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        Finding tutoring websites
      </h3>
      <p className="text-muted-foreground mb-4">
        Searching for the best {exam} tutors near <span className="font-medium">{location}</span>
      </p>
      <div className="flex items-center justify-center gap-2 text-primary">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm font-medium">AI is discovering websites...</span>
      </div>
    </div>
  );
}
