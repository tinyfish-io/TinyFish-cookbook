import { motion, AnimatePresence } from 'framer-motion';
import { X, Fish, ExternalLink } from 'lucide-react';
import { Tender } from '@/types/tender';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenders: Tender[];
}

const COMPARE_FIELDS: { key: keyof Tender; label: string }[] = [
  { key: 'tenderTitle', label: 'Tender Title' },
  { key: 'tenderId', label: 'Tender ID' },
  { key: 'issuingAuthority', label: 'Issuing Authority' },
  { key: 'countryRegion', label: 'Country / Region' },
  { key: 'tenderType', label: 'Tender Type' },
  { key: 'publicationDate', label: 'Publication Date' },
  { key: 'submissionDeadline', label: 'Submission Deadline' },
  { key: 'tenderStatus', label: 'Status' },
  { key: 'briefDescription', label: 'Description' },
  { key: 'eligibilityCriteria', label: 'Eligibility' },
  { key: 'industryCategory', label: 'Industry / Category' },
];

export function CompareModal({ isOpen, onClose, tenders }: CompareModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
            <div>
              <h2 className="text-xl font-bold text-foreground">Compare Tenders</h2>
              <p className="text-sm text-muted-foreground">
                Comparing {tenders.length} selected tenders
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Comparison Table */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-3 bg-muted/50 font-semibold text-foreground border border-border rounded-tl-lg sticky left-0 min-w-[150px]">
                        Field
                      </th>
                      {tenders.map((tender, index) => (
                        <th
                          key={tender.id}
                          className="text-left p-3 bg-muted/50 font-semibold text-foreground border border-border min-w-[250px]"
                        >
                          Tender {index + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARE_FIELDS.map((field, rowIndex) => (
                      <tr key={field.key}>
                        <td className="p-3 font-medium text-muted-foreground border border-border bg-muted/20 sticky left-0">
                          {field.label}
                        </td>
                        {tenders.map((tender) => (
                          <td
                            key={`${tender.id}-${field.key}`}
                            className="p-3 text-foreground border border-border"
                          >
                            {field.key === 'officialTenderUrl' ? (
                              <a
                                href={tender[field.key]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1"
                              >
                                View <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="line-clamp-3">
                                {tender[field.key] || 'N/A'}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {/* Official URL row */}
                    <tr>
                      <td className="p-3 font-medium text-muted-foreground border border-border bg-muted/20 sticky left-0">
                        Official Link
                      </td>
                      {tenders.map((tender) => (
                        <td
                          key={`${tender.id}-url`}
                          className="p-3 text-foreground border border-border"
                        >
                          <a
                            href={tender.officialTenderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            View Tender <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-center gap-2">
            <Fish className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">
              Powered by <span className="font-semibold text-primary">Tiny Fish Web Agent</span>
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
