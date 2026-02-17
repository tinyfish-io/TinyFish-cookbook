import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LoanType, LoanTypeOption } from '@/types/loan';
import { Home, GraduationCap, Briefcase, Wallet } from 'lucide-react';

const loanTypes: LoanTypeOption[] = [
  {
    id: 'personal',
    label: 'Personal Loan',
    icon: 'wallet',
    description: 'For personal expenses, emergencies, or debt consolidation'
  },
  {
    id: 'home',
    label: 'Home Loan',
    icon: 'home',
    description: 'For purchasing property or refinancing your mortgage'
  },
  {
    id: 'education',
    label: 'Education Loan',
    icon: 'graduation',
    description: 'For tuition fees, books, and educational expenses'
  },
  {
    id: 'business',
    label: 'Business Loan',
    icon: 'briefcase',
    description: 'For business expansion, equipment, or working capital'
  }
];

const IconComponent = ({ icon }: { icon: string }) => {
  const iconClass = "w-6 h-6";
  switch (icon) {
    case 'wallet':
      return <Wallet className={iconClass} />;
    case 'home':
      return <Home className={iconClass} />;
    case 'graduation':
      return <GraduationCap className={iconClass} />;
    case 'briefcase':
      return <Briefcase className={iconClass} />;
    default:
      return <Wallet className={iconClass} />;
  }
};

interface LoanTypeSelectorProps {
  selected: LoanType | null;
  onSelect: (type: LoanType) => void;
}

export function LoanTypeSelector({ selected, onSelect }: LoanTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {loanTypes.map((type, index) => (
        <motion.button
          key={type.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.4 }}
          onClick={() => onSelect(type.id)}
          className={cn(
            "group relative flex flex-col items-center p-6 rounded-xl border-2 transition-all duration-300",
            "hover:shadow-lg hover:-translate-y-1",
            selected === type.id
              ? "border-primary bg-primary/5 shadow-md"
              : "border-border bg-card hover:border-primary/50"
          )}
        >
          <div
            className={cn(
              "flex items-center justify-center w-14 h-14 rounded-xl mb-4 transition-colors duration-300",
              selected === type.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
            )}
          >
            <IconComponent icon={type.icon} />
          </div>
          <h3 className="font-semibold text-foreground text-center mb-1">
            {type.label}
          </h3>
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            {type.description}
          </p>
          {selected === type.id && (
            <motion.div
              layoutId="selectedIndicator"
              className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
          )}
        </motion.button>
      ))}
    </div>
  );
}
