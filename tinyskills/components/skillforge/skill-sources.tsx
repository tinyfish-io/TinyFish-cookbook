"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { IdentifiedSource, SourceType } from "@/types";
import { SOURCE_CONFIG } from "@/types";
import {
  FileText,
  Github,
  MessageSquare,
  BookOpen,
  ExternalLink,
} from "lucide-react";

const icons: Record<SourceType, React.ReactNode> = {
  docs: <FileText className="h-4 w-4" />,
  github: <Github className="h-4 w-4" />,
  stackoverflow: <MessageSquare className="h-4 w-4" />,
  blog: <BookOpen className="h-4 w-4" />,
};

interface SkillSourcesProps {
  sources: IdentifiedSource[];
}

export function SkillSources({ sources }: SkillSourcesProps) {
  if (sources.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p>No sources yet. Generate a skill guide to see the sources used.</p>
      </div>
    );
  }

  // Group by type
  const grouped = sources.reduce(
    (acc, source) => {
      if (!acc[source.type]) acc[source.type] = [];
      acc[source.type].push(source);
      return acc;
    },
    {} as Record<SourceType, IdentifiedSource[]>
  );

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {(Object.keys(grouped) as SourceType[]).map((type) => (
          <div key={type}>
            <div className="flex items-center gap-2 mb-3">
              {icons[type]}
              <h3 className="font-medium">{SOURCE_CONFIG[type].label}</h3>
              <Badge variant={type} className="ml-auto">
                {grouped[type].length}
              </Badge>
            </div>

            <div className="space-y-2">
              {grouped[type].map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg border border-border p-3 hover:bg-secondary/50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate group-hover:text-primary">
                        {source.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {source.url}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {source.reason}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
