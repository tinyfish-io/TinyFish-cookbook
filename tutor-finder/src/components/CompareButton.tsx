import { Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

interface CompareButtonProps {
  selectedCount: number;
  onCompare: () => void;
}

export function CompareButton({ selectedCount, onCompare }: CompareButtonProps) {
  const handleClick = () => {
    if (selectedCount < 2) {
      toast({
        title: 'Select tutors to compare',
        description: 'Please select at least 2 tutors to compare.',
        variant: 'destructive',
      });
      return;
    }
    onCompare();
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <Button
        size="lg"
        onClick={handleClick}
        className="h-14 px-8 text-base shadow-2xl gap-3 bg-primary hover:bg-primary/90"
      >
        <Scale className="w-5 h-5" />
        Compare {selectedCount > 0 ? `(${selectedCount} selected)` : ''}
      </Button>
    </div>
  );
}
