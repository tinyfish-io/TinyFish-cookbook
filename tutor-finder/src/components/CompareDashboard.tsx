import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import type { Tutor } from '@/types/tutor';

interface CompareDashboardProps {
  tutors: Tutor[];
  onClose: () => void;
}

const comparisonFields: { key: keyof Tutor; label: string }[] = [
  { key: 'examsTaught', label: 'Exams Taught' },
  { key: 'subjects', label: 'Subjects' },
  { key: 'teachingMode', label: 'Teaching Mode' },
  { key: 'location', label: 'Location' },
  { key: 'experience', label: 'Experience' },
  { key: 'qualifications', label: 'Qualifications' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'pastResults', label: 'Past Results' },
  { key: 'contactMethod', label: 'Contact' },
  { key: 'sourceWebsite', label: 'Source' },
];

export function CompareDashboard({ tutors, onClose }: CompareDashboardProps) {
  const renderValue = (tutor: Tutor, key: keyof Tutor) => {
    const value = tutor[key];
    
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">—</span>;
    }
    
    if (Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((item, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {item}
            </Badge>
          ))}
        </div>
      );
    }
    
    return <span className="text-foreground">{value}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Compare Tutors</h2>
            <p className="text-sm text-muted-foreground">
              Comparing {tutors.length} tutors side by side
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Comparison Table */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            <div className="min-w-max">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-4 bg-muted font-semibold text-foreground sticky left-0 z-20 min-w-[150px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                      Attribute
                    </th>
                    {tutors.map((tutor) => (
                      <th
                        key={tutor.id}
                        className="text-left p-4 bg-primary/10 font-semibold text-foreground min-w-[250px]"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-lg">{tutor.tutorName}</span>
                          <span className="text-xs font-normal text-muted-foreground">
                            {tutor.sourceWebsite}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonFields.map(({ key, label }, index) => (
                    <tr key={key}>
                      <td className={`p-4 font-medium text-muted-foreground sticky left-0 z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] ${index % 2 === 0 ? 'bg-card' : 'bg-muted'}`}>
                        {label}
                      </td>
                      {tutors.map((tutor) => (
                        <td key={tutor.id} className="p-4">
                          {renderValue(tutor, key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Profile links row */}
                  <tr>
                    <td className="p-4 font-medium text-muted-foreground sticky left-0 z-20 bg-card shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                      Profile
                    </td>
                    {tutors.map((tutor) => (
                      <td key={tutor.id} className="p-4">
                        {tutor.profileLink ? (
                          <a
                            href={tutor.profileLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            View Profile →
                          </a>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-card text-center">
          <span className="text-sm text-muted-foreground">
            Powered by <span className="text-primary font-semibold">TinyFish Web Agent</span>
          </span>
        </div>
      </div>
    </div>
  );
}
