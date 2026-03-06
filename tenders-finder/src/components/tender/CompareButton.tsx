import { motion, AnimatePresence } from 'framer-motion';
import { Scale, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CompareButtonProps {
  selectedCount: number;
  onCompare: () => void;
}

export function CompareButton({ selectedCount, onCompare }: CompareButtonProps) {
  const handleClick = () => {
    if (selectedCount === 0) {
      toast.error('Please select tenders to compare', {
        description: 'Click on tender cards to select them',
        icon: <AlertCircle className="w-4 h-4" />,
      });
      return;
    }
    if (selectedCount === 1) {
      toast.error('Please select at least 2 tenders', {
        description: 'You need multiple tenders to compare',
        icon: <AlertCircle className="w-4 h-4" />,
      });
      return;
    }
    onCompare();
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <Button
        onClick={handleClick}
        size="lg"
        className="shadow-lg hover:shadow-xl transition-shadow bg-primary hover:bg-primary/90"
      >
        <Scale className="w-5 h-5 mr-2" />
        Compare
        <AnimatePresence mode="wait">
          {selectedCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="ml-2 bg-primary-foreground text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold"
            >
              {selectedCount}
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    </motion.div>
  );
}
