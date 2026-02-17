import { MapPin, Calendar, DollarSign, Users, ExternalLink, GraduationCap, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { SummerSchool } from '@/types/summer-school';

interface ResultCardProps {
  school: SummerSchool;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
}

export function ResultCard({ school, isSelected, onSelect }: ResultCardProps) {
  return (
    <Card
      className={`transition-all duration-300 cursor-pointer hover:shadow-card group ${
        isSelected ? 'ring-2 ring-primary border-primary' : 'border-border hover:border-primary/30'
      }`}
      onClick={() => onSelect(!isSelected)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Checkbox
                checked={isSelected}
                onCheckedChange={onSelect}
                onClick={(e) => e.stopPropagation()}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                {school.programName || 'Unnamed Program'}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {school.institution}
            </p>
          </div>
          {school.officialUrl && (
            <a
              href={school.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0 p-2 rounded-lg bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {school.programType && (
            <Badge variant="secondary" className="bg-accent text-accent-foreground">
              <GraduationCap className="w-3 h-3 mr-1" />
              {school.programType}
            </Badge>
          )}
          {school.targetAge && (
            <Badge variant="outline">
              <Users className="w-3 h-3 mr-1" />
              {school.targetAge}
            </Badge>
          )}
        </div>

        {/* Description */}
        {school.briefDescription && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {school.briefDescription}
          </p>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {school.location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="truncate">{school.location}</span>
            </div>
          )}
          {school.dates && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="truncate">{school.dates}</span>
            </div>
          )}
          {school.duration && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="truncate">{school.duration}</span>
            </div>
          )}
          {school.tuitionFees && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="truncate">{school.tuitionFees}</span>
            </div>
          )}
        </div>

        {/* Deadline */}
        {school.applicationDeadline && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Deadline:</span>{' '}
              {school.applicationDeadline}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
