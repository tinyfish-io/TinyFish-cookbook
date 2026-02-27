"use client";

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2, Edit2, Play, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { Project, TestCase } from '@/types';
import { formatRelativeTime } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
  testCases?: TestCase[];
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRunTests?: () => void;
}

export function ProjectCard({
  project,
  testCases = [],
  onSelect,
  onEdit,
  onDelete,
  onRunTests,
}: ProjectCardProps) {
  // Calculate test stats from test cases
  const stats = testCases.reduce(
    (acc, tc) => {
      const status = tc.lastRunResult?.status;
      if (status === 'passed') acc.passed++;
      else if (status === 'failed' || status === 'error') acc.failed++;
      else acc.pending++;
      return acc;
    },
    { passed: 0, failed: 0, pending: 0 }
  );

  const totalTests = testCases.length;
  const hasRun = stats.passed > 0 || stats.failed > 0;

  return (
    <Card
      className="cursor-pointer transition-all hover:bg-accent/50 border-border/50"
      onClick={onSelect}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-foreground">{project.name}</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-1 text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {onRunTests && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRunTests(); }}>
                  <Play className="mr-2 h-4 w-4" />
                  Run Tests
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* URL */}
        <p className="text-sm text-muted-foreground truncate mb-2">
          {project.websiteUrl}
        </p>

        {/* Description */}
        {project.description && (
          <p className="text-sm text-muted-foreground/70 line-clamp-2 mb-4">
            {project.description}
          </p>
        )}

        {/* Footer Stats */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          {totalTests > 0 ? (
            <div className="flex items-center gap-3 text-sm">
              {hasRun ? (
                <>
                  <span className="flex items-center gap-1.5 text-green-500">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {stats.passed}
                  </span>
                  <span className="flex items-center gap-1.5 text-red-500">
                    <XCircle className="h-3.5 w-3.5" />
                    {stats.failed}
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {stats.pending}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground/60">
                  {totalTests} tests · No runs yet
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground/60">
              No tests
            </span>
          )}

          {project.lastRunAt && (
            <span className="text-xs text-muted-foreground/50">
              {formatRelativeTime(project.lastRunAt)}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
