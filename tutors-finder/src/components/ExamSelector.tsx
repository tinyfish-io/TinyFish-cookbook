import { 
  GraduationCap, 
  BookOpen, 
  Award, 
  Target, 
  Globe, 
  Microscope, 
  Trophy,
  Calculator
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExamType } from '@/types/tutor';

interface ExamSelectorProps {
  selectedExam: ExamType | null;
  onSelect: (exam: ExamType) => void;
}

const exams: { type: ExamType; label: string; icon: React.ElementType; description: string }[] = [
  { type: 'SAT', label: 'SAT', icon: GraduationCap, description: 'College admission' },
  { type: 'ACT', label: 'ACT', icon: BookOpen, description: 'College readiness' },
  { type: 'AP', label: 'AP', icon: Award, description: 'Advanced placement' },
  { type: 'GRE', label: 'GRE', icon: Target, description: 'Graduate school' },
  { type: 'GMAT', label: 'GMAT', icon: Calculator, description: 'Business school' },
  { type: 'TOEFL/IELTS', label: 'TOEFL / IELTS', icon: Globe, description: 'English proficiency' },
  { type: 'JEE/NEET', label: 'JEE / NEET', icon: Microscope, description: 'Indian entrance' },
  { type: 'Olympiads', label: 'Olympiads', icon: Trophy, description: 'Competitive exams' },
];

export function ExamSelector({ selectedExam, onSelect }: ExamSelectorProps) {
  return (
    <div className="w-full">
      <h2 className="text-lg font-medium text-muted-foreground mb-6 text-center">
        Select an exam to find expert tutors
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {exams.map(({ type, label, icon: Icon, description }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={cn(
              'group relative flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200',
              'hover:shadow-lg hover:scale-[1.02] hover:border-primary/50',
              selectedExam === type
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-border bg-card hover:bg-secondary/50'
            )}
          >
            <div
              className={cn(
                'w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-colors',
                selectedExam === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
              )}
            >
              <Icon className="w-7 h-7" />
            </div>
            <span
              className={cn(
                'font-semibold text-base transition-colors',
                selectedExam === type ? 'text-primary' : 'text-foreground'
              )}
            >
              {label}
            </span>
            <span className="text-xs text-muted-foreground mt-1">{description}</span>
            {selectedExam === type && (
              <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
