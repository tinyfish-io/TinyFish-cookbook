"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Edit2,
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Sparkles,
  ChevronRight,
  SkipForward,
} from 'lucide-react';
import type { TestCase } from '@/types';
import { cn, formatRelativeTime } from '@/lib/utils';

interface TestCaseListProps {
  testCases: TestCase[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onSelect: (testCase: TestCase) => void;
  onEdit: (testCase: TestCase) => void;
  onDelete: (testCase: TestCase) => void;
  onRun: (testCase: TestCase) => void;
  onCreateNew: () => void;
}

export function TestCaseList({
  testCases,
  selectedIds,
  onSelectionChange,
  onSelect,
  onEdit,
  onDelete,
  onRun,
  onCreateNew,
}: TestCaseListProps) {
  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    onSelectionChange(newSelection);
  };

  const selectAll = () => {
    onSelectionChange(new Set(testCases.map((tc) => tc.id)));
  };

  const selectNone = () => {
    onSelectionChange(new Set());
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'skipped':
        return <SkipForward className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Passed</Badge>;
      case 'failed':
      case 'error':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Failed</Badge>;
      case 'running':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Running</Badge>;
      case 'skipped':
        return <Badge variant="secondary">Skipped</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (testCases.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Sparkles className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-4">
            No test cases yet. Use the AI Generator tab to create tests from your requirements,
            or create a test manually.
          </p>
          <Button onClick={onCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            Create Test Case
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selection controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={selectNone}>
            Select None
          </Button>
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} of {testCases.length} selected
          </span>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          New Test
        </Button>
      </div>

      {/* Test cases list */}
      <div className="space-y-2">
        {testCases.map((testCase) => {
          const lastResult = testCase.lastRunResult;

          return (
            <div
              key={testCase.id}
              className={cn(
                'flex items-start gap-3 p-4 rounded-lg border transition-colors cursor-pointer group',
                selectedIds.has(testCase.id)
                  ? 'bg-primary/5 border-primary/20'
                  : 'bg-card border-border hover:bg-muted/50'
              )}
              onClick={() => onSelect(testCase)}
            >
              <Checkbox
                checked={selectedIds.has(testCase.id)}
                onCheckedChange={() => toggleSelection(testCase.id)}
                className="mt-1"
                onClick={(e) => e.stopPropagation()}
              />

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  {getStatusIcon(lastResult?.status || testCase.status)}
                  <span className="font-medium">{testCase.title}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {testCase.description}
                </p>
                {testCase.expectedOutcome && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Expected: </span>
                    <span className="text-green-500 line-clamp-1">{testCase.expectedOutcome}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {getStatusBadge(lastResult?.status || testCase.status)}
                {lastResult?.completedAt && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatRelativeTime(lastResult.completedAt)}
                  </span>
                )}
              </div>

              <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onEdit(testCase);
                  }}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onRun(testCase);
                  }}>
                    <Play className="mr-2 h-4 w-4" />
                    Run
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(testCase);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>
    </div>
  );
}
