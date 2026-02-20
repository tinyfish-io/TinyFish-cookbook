import { 
  User, 
  MapPin, 
  Clock, 
  GraduationCap, 
  DollarSign, 
  TrendingUp, 
  ExternalLink,
  Check,
  Monitor,
  BookOpen
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Tutor } from '@/types/tutor';

interface TutorCardProps {
  tutor: Tutor;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export function TutorCard({ tutor, isSelected, onToggleSelect }: TutorCardProps) {
  return (
    <div
      onClick={onToggleSelect}
      className={cn(
        'relative rounded-xl border-2 p-5 cursor-pointer transition-all duration-200 bg-card',
        'hover:shadow-lg hover:border-primary/30',
        isSelected
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-border'
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          'absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
          isSelected
            ? 'bg-primary border-primary'
            : 'border-muted-foreground/30'
        )}
      >
        {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
      </div>

      {/* Tutor Name */}
      <div className="flex items-start gap-3 mb-4 pr-8">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <User className="w-6 h-6 text-primary" />
        </div>
        <div className="min-w-0">
          <h4 className="font-semibold text-lg text-foreground truncate">
            {tutor.tutorName}
          </h4>
          <p className="text-sm text-muted-foreground truncate">
            {tutor.sourceWebsite}
          </p>
        </div>
      </div>

      {/* Exams & Subjects */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {tutor.examsTaught.slice(0, 3).map((exam) => (
          <Badge key={exam} variant="default" className="text-xs">
            {exam}
          </Badge>
        ))}
        {tutor.examsTaught.length > 3 && (
          <Badge variant="secondary" className="text-xs">
            +{tutor.examsTaught.length - 3}
          </Badge>
        )}
      </div>
      
      {tutor.subjects.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {tutor.subjects.slice(0, 4).map((subject) => (
            <Badge key={subject} variant="outline" className="text-xs">
              {subject}
            </Badge>
          ))}
          {tutor.subjects.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{tutor.subjects.length - 4}
            </Badge>
          )}
        </div>
      )}

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {tutor.teachingMode && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Monitor className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{tutor.teachingMode}</span>
          </div>
        )}
        {tutor.location && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{tutor.location}</span>
          </div>
        )}
        {tutor.experience && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{tutor.experience}</span>
          </div>
        )}
        {tutor.qualifications && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <GraduationCap className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{tutor.qualifications}</span>
          </div>
        )}
        {tutor.pricing && (
          <div className="flex items-center gap-2 text-primary font-medium">
            <DollarSign className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{tutor.pricing}</span>
          </div>
        )}
        {tutor.pastResults && tutor.pastResults.toLowerCase() !== 'null' && (
          <div className="flex items-center gap-2 text-success">
            <TrendingUp className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{tutor.pastResults}</span>
          </div>
        )}
      </div>

      {/* Profile Link */}
      {tutor.profileLink && (
        <a
          href={tutor.profileLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ExternalLink className="w-4 h-4" />
          View Profile
        </a>
      )}
    </div>
  );
}
