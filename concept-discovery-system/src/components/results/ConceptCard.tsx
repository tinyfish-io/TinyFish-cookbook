import { ExternalLink, Github, FileText, MessageSquare } from 'lucide-react';
import { PLATFORM_INFO } from '@/lib/constants';
import type { ConceptData } from '@/types';

interface ConceptCardProps {
  data: ConceptData;
  onClick: () => void;
}

const platformIcons = {
  github: Github,
  devto: FileText,
  stackoverflow: MessageSquare,
};

export function ConceptCard({ data, onClick }: ConceptCardProps) {
  // Defensive checks
  if (!data || !data.platform || !data.projectName) {
    console.error('Invalid ConceptCard data:', data);
    return null;
  }

  const PlatformIcon = platformIcons[data.platform] || MessageSquare;

  return (
    <div
      onClick={onClick}
      className="group p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-all cursor-pointer h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <PlatformIcon className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs text-primary font-medium">
            {PLATFORM_INFO[data.platform]?.name || data.platform}
          </span>
        </div>
        {data.projectUrl && (
          <a
            href={data.projectUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      {/* Project Name */}
      <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
        {data.projectName}
      </h3>

      {/* Alignment Explanation */}
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2 flex-1">
        {data.alignmentExplanation || 'No alignment explanation provided'}
      </p>

      {/* Tech Stack Tags */}
      {data.techStack && data.techStack.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-auto">
          {data.techStack.slice(0, 5).map((tech, index) => (
            <span
              key={index}
              className="px-2 py-0.5 text-xs bg-primary/10 text-primary border border-primary/20 rounded"
            >
              {tech}
            </span>
          ))}
          {data.techStack.length > 5 && (
            <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded">
              +{data.techStack.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Metadata */}
      {(data.stars || data.lastUpdated) && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
          {data.stars && (
            <span>⭐ {data.stars.toLocaleString()}</span>
          )}
          {data.lastUpdated && (
            <span>📅 {data.lastUpdated}</span>
          )}
        </div>
      )}
    </div>
  );
}
