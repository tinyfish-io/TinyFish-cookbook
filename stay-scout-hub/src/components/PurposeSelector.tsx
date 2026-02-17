import { motion } from 'framer-motion';
import { TripPurpose, TRIP_PURPOSES } from '@/types/hotel';
import { cn } from '@/lib/utils';

interface PurposeSelectorProps {
  selected: TripPurpose | null;
  onSelect: (purpose: TripPurpose) => void;
  disabled?: boolean;
}

export function PurposeSelector({ selected, onSelect, disabled }: PurposeSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {TRIP_PURPOSES.map((purpose, index) => (
        <motion.button
          key={purpose.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(purpose.id)}
          className={cn(
            "relative p-4 rounded-xl border-2 transition-all duration-200 text-left",
            "hover:shadow-md hover:border-primary/50",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            selected === purpose.id
              ? "border-primary bg-primary/10 shadow-md"
              : "border-border bg-card hover:bg-card/80"
          )}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: disabled ? 1 : 1.02 }}
          whileTap={{ scale: disabled ? 1 : 0.98 }}
        >
          <span className="text-2xl mb-2 block">{purpose.icon}</span>
          <span className="font-medium text-sm block text-foreground">{purpose.label}</span>
          <span className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {purpose.description}
          </span>
          
          {selected === purpose.id && (
            <motion.div
              className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary"
              layoutId="purpose-indicator"
            />
          )}
        </motion.button>
      ))}
    </div>
  );
}
