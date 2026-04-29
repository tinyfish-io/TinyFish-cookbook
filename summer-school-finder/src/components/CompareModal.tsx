import { ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="text-lg font-semibold">
            Compare Programs ({schools.length})
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-64px)]">
          <div className="p-6 overflow-x-auto">
            <table className="w-full border-collapse min-w-[600px]">
              <thead>
                <tr>
                  <th className="text-left p-3 bg-secondary font-medium text-secondary-foreground sticky left-0 z-10 min-w-[130px] rounded-tl-lg">
                    Criteria
                  </th>
                  {schools.map((school, idx) => (
                    <th
                      key={idx}
                      className="text-left p-3 bg-secondary font-medium text-secondary-foreground min-w-[180px] last:rounded-tr-lg"
                    >
                      <div className="line-clamp-2 text-sm">{school.programName || `Program ${idx + 1}`}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonFields.map((field, rowIdx) => (
                  <tr key={field.key} className={rowIdx % 2 === 0 ? 'bg-muted/30' : ''}>
                    <td className="p-3 font-medium text-sm border-b border-border sticky left-0 bg-inherit z-10 whitespace-nowrap">
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
