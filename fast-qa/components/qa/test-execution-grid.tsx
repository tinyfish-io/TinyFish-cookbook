"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, Loader2, Clock, ExternalLink, SkipForward } from 'lucide-react';
import type { TestCase, TestResult } from '@/types';
import { cn, formatDuration } from '@/lib/utils';
import { useElapsedTime } from '@/lib/hooks';

interface TestExecutionCardProps {
  testCase: TestCase;
  result?: TestResult;
  onSkip?: () => void;
}

function TestExecutionCard({ testCase, result, onSkip }: TestExecutionCardProps) {
  const isRunning = result?.status === 'running' || (!result && testCase.status === 'running');
  const elapsed = useElapsedTime(result?.startedAt || null, isRunning);

  const getStatusIcon = () => {
    if (!result) {
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
    switch (result.status) {
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />;
      case 'skipped':
        return <SkipForward className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBorderClass = () => {
    if (!result) return '';
    switch (result.status) {
      case 'passed':
        return 'border-green-500/50 animate-pulse-success';
      case 'failed':
      case 'error':
        return 'border-red-500/50 animate-pulse-error';
      case 'running':
        return 'border-amber-500/50 animate-pulse-running';
      default:
        return '';
    }
  };

  const progress = result?.currentStep && result?.totalSteps
    ? (result.currentStep / result.totalSteps) * 100
    : 0;

  return (
    <Card className={cn('relative overflow-hidden', getStatusBorderClass())}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <CardTitle className="text-sm font-medium truncate">
            {testCase.title}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Browser Preview */}
        <div className="browser-preview aspect-video bg-black rounded-md overflow-hidden relative">
          {result?.streamingUrl ? (
            <iframe
              src={result.streamingUrl}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
            />
          ) : isRunning ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <span className="text-xs">Waiting...</span>
            </div>
          )}

          {/* Browser toolbar overlay */}
          <div className="absolute top-0 left-0 right-0 h-7 bg-gradient-to-b from-[#1a1a1a] to-[#141414] border-b border-[#262626] flex items-center px-2 gap-1.5 z-10">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          </div>
        </div>

        {/* Progress */}
        {isRunning && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {result?.currentStepDescription || 'Starting...'}
              </span>
              <span>
                {result?.currentStep || 0}/{result?.totalSteps || '?'}
              </span>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        )}

        {/* Status / Time */}
        <div className="flex items-center justify-between text-xs">
          {result?.status === 'passed' && (
            <span className="text-green-500 font-medium">Passed</span>
          )}
          {(result?.status === 'failed' || result?.status === 'error') && (
            <span className="text-red-500 font-medium truncate max-w-[70%]">
              {result.error || 'Failed'}
            </span>
          )}
          {result?.status === 'skipped' && (
            <span className="text-muted-foreground font-medium">Skipped</span>
          )}
          {isRunning && (
            <span className="text-amber-500 font-medium">Running</span>
          )}
          {!result && !isRunning && (
            <span className="text-muted-foreground">Pending</span>
          )}

          <span className="text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {result?.duration
              ? formatDuration(result.duration)
              : isRunning
              ? formatDuration(elapsed)
              : '--'}
          </span>
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-between">
          {/* Live view link */}
          {result?.streamingUrl && (
            <a
              href={result.streamingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Open in new tab
            </a>
          )}

          {/* Skip button for running tests */}
          {isRunning && onSkip && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={onSkip}
            >
              <SkipForward className="h-3 w-3 mr-1" />
              Skip
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface TestExecutionGridProps {
  testCases: TestCase[];
  results: Map<string, TestResult>;
  isRunning: boolean;
  onSkipTest?: (testCaseId: string) => void;
}

export function TestExecutionGrid({
  testCases,
  results,
  isRunning,
  onSkipTest,
}: TestExecutionGridProps) {
  if (testCases.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No test cases selected for execution
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {testCases.map((tc) => (
        <TestExecutionCard
          key={tc.id}
          testCase={tc}
          result={results.get(tc.id)}
          onSkip={onSkipTest ? () => onSkipTest(tc.id) : undefined}
        />
      ))}

      {/* Skeleton loaders for pending tests */}
      {isRunning && testCases.length < 3 && (
        Array.from({ length: 3 - testCases.length }).map((_, i) => (
          <Card key={`skeleton-${i}`} className="opacity-50">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="aspect-video w-full" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
