import { X, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SummerSchool } from '@/types/summer-school';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: SummerSchool[];
}

const comparisonFields: { key: keyof SummerSchool; label: string }[] = [
  { key: 'institution', label: 'Institution' },
  { key: 'location', label: 'Location' },
  { key: 'dates', label: 'Dates' },
  { key: 'duration', label: 'Duration' },
  { key: 'targetAge', label: 'Target Age' },
  { key: 'programType', label: 'Program Type' },
  { key: 'tuitionFees', label: 'Tuition / Fees' },
  { key: 'applicationDeadline', label: 'Application Deadline' },
  { key: 'eligibilityCriteria', label: 'Eligibility' },
  { key: 'notes', label: 'Notes' },
  { key: 'officialUrl', label: 'Website' },
];

export function CompareModal({ isOpen, onClose, schools }: CompareModalProps) {
  if (schools.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Compare Programs ({schools.length})
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)]">
          <div className="p-6 overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr>
                  <th className="text-left p-3 bg-secondary rounded-tl-lg font-medium text-secondary-foreground sticky left-0 z-10 min-w-[150px]">
                    Criteria
                  </th>
                  {schools.map((school, idx) => (
                    <th
                      key={idx}
                      className="text-left p-3 bg-secondary font-medium text-secondary-foreground min-w-[200px] last:rounded-tr-lg"
                    >
                      <div className="line-clamp-2">{school.programName || `Program ${idx + 1}`}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonFields.map((field, rowIdx) => (
                  <tr key={field.key} className={rowIdx % 2 === 0 ? 'bg-muted/30' : ''}>
                    <td className="p-3 font-medium text-sm border-b border-border sticky left-0 bg-inherit z-10">
                      {field.label}
                    </td>
                    {schools.map((school, colIdx) => (
                      <td key={colIdx} className="p-3 text-sm border-b border-border">
                        {field.key === 'officialUrl' && school.officialUrl ? (
                          <a
                            href={school.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            Visit Website
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">
                            {school[field.key] || '-'}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
