import { motion } from 'framer-motion';
import { Calendar, Building2, FileText, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Tender } from '@/types/tender';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface TenderResultCardProps {
  tender: Tender;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export function TenderResultCard({ tender, isSelected, onToggleSelect }: TenderResultCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      onClick={onToggleSelect}
      className={cn(
        "relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200",
        "bg-white hover:shadow-lg",
        isSelected 
          ? "border-primary bg-primary/5 shadow-md" 
          : "border-border hover:border-primary/50"
      )}
    >
      {/* Selection Indicator */}
      <div className={cn(
        "absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
        isSelected 
          ? "bg-primary border-primary" 
          : "bg-white border-muted-foreground/30"
      )}>
        {isSelected && <CheckCircle2 className="w-4 h-4 text-primary-foreground" />}
      </div>

      {/* Header */}
      <div className="pr-8 mb-3">
        <h3 className="font-semibold text-foreground line-clamp-2 mb-1">
          {tender.tenderTitle}
        </h3>
        <p className="text-sm text-muted-foreground">
          ID: {tender.tenderId}
        </p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant="secondary" className="text-xs">
          {tender.industryCategory}
        </Badge>
        <Badge 
          variant={tender.tenderStatus === 'Open' ? 'default' : 'outline'}
          className="text-xs"
        >
          {tender.tenderStatus}
        </Badge>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{tender.issuingAuthority}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span>Deadline: {tender.submissionDeadline}</span>
        </div>
        <div className="flex items-start gap-2 text-muted-foreground">
          <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2">{tender.briefDescription}</span>
        </div>
      </div>

      {/* Link */}
      <a
        href={tender.officialTenderUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 mt-3 text-sm text-primary hover:underline"
      >
        View Official Tender <ExternalLink className="w-3 h-3" />
      </a>
    </motion.div>
  );
}
