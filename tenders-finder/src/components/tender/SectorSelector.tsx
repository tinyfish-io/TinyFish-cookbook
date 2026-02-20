import { motion } from 'framer-motion';
import { 
  Monitor, 
  HardHat, 
  Heart, 
  Briefcase, 
  Truck, 
  GraduationCap,
  Search,
  Sparkles
} from 'lucide-react';
import { SectorIcon } from './SectorIcon';
import { Sector } from '@/types/tender';

interface SectorSelectorProps {
  onSelectSector: (sector: Sector) => void;
  disabled?: boolean;
}

const SECTORS: { sector: Sector; icon: typeof Monitor; label: string; description: string }[] = [
  { sector: 'IT / Software', icon: Monitor, label: 'IT / Software', description: 'Tech & digital services' },
  { sector: 'Construction', icon: HardHat, label: 'Construction', description: 'Building & infrastructure' },
  { sector: 'Healthcare', icon: Heart, label: 'Healthcare', description: 'Medical & pharma' },
  { sector: 'Consulting', icon: Briefcase, label: 'Consulting', description: 'Advisory services' },
  { sector: 'Logistics', icon: Truck, label: 'Logistics', description: 'Transport & supply chain' },
  { sector: 'Education', icon: GraduationCap, label: 'Education', description: 'Training & schools' },
];

export function SectorSelector({ onSelectSector, disabled }: SectorSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto px-4"
    >
      {/* Hero Section */}
      <div className="text-center mb-10">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">AI-Powered Tender Search</span>
        </motion.div>
        
        <motion.h2 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-3xl md:text-4xl font-bold text-foreground mb-3"
        >
          Find Singapore Government Tenders
        </motion.h2>
        
        <motion.p 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-lg text-muted-foreground max-w-2xl mx-auto"
        >
          Select your industry sector and our AI agents will search across 
          <span className="text-primary font-semibold"> 7 major tender platforms </span>
          simultaneously
        </motion.p>
      </div>

      {/* Sector Grid */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6"
      >
        {SECTORS.map(({ sector, icon, label, description }, index) => (
          <motion.div
            key={sector}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + index * 0.08 }}
          >
            <SectorIcon
              icon={icon}
              label={label}
              description={description}
              onClick={() => onSelectSector(sector)}
              disabled={disabled}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Bottom Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-10 text-center"
      >
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
          <Search className="w-4 h-4" />
          <span>Searches GeBIZ, TendersOnTime, BidDetail, and more</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
