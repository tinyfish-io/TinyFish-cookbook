"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Scale } from "lucide-react";

interface CompareButtonProps {
  selectedCount: number;
  onCompare: () => void;
}

export function CompareButton({ selectedCount, onCompare }: CompareButtonProps) {
  const handleClick = () => {
    if (selectedCount < 2) return;
    onCompare();
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl shadow-lg hover:bg-primary/90 hover:shadow-xl transition-all font-medium"
      >
        <Scale className="w-5 h-5" />
        Compare
        <AnimatePresence mode="wait">
          {selectedCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="ml-1 bg-primary-foreground text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold"
            >
              {selectedCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </motion.div>
  );
}
