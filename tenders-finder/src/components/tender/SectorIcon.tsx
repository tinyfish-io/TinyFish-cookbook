import { motion } from 'framer-motion';
import { LucideIcon, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectorIconProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  onClick: () => void;
  disabled?: boolean;
}

export function SectorIcon({ icon: Icon, label, description, onClick, disabled }: SectorIconProps) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.03, y: disabled ? 0 : -4 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative w-full flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300",
        "bg-gradient-to-br from-white to-muted/30 hover:from-primary/5 hover:to-primary/10",
        "hover:border-primary hover:shadow-xl hover:shadow-primary/10",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        "group",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {/* Icon Container */}
      <div className="relative">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:from-primary group-hover:to-primary/80 transition-all duration-300">
          <Icon className="w-8 h-8 md:w-10 md:h-10 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
        </div>
        {/* Glow effect on hover */}
        <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
      </div>
      
      {/* Text */}
      <div className="text-center">
        <span className="text-base md:text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
          {label}
        </span>
        {description && (
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </div>

      {/* Arrow indicator */}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="w-5 h-5 text-primary" />
      </div>
    </motion.button>
  );
}
