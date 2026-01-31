"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Play,
  Edit2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  FileText,
  Target,
  Timer,
  SkipForward,
  ListOrdered,
  AlertCircle,
} from 'lucide-react';
import type { TestCase } from '@/types';
import { cn, formatDuration, formatRelativeTime } from '@/lib/utils';

interface TestCaseDetailProps {
  testCase: TestCase;
  onBack: () => void;
  onEdit: () => void;
  onRun: () => void;
}

export function TestCaseDetail({
  testCase,
  onBack,
  onEdit,
  onRun,
}: TestCaseDetailProps) {
  const result = testCase.lastRunResult;
  const hasResult = result && result.status !== 'pending';

  const getStatusConfig = () => {
    if (!hasResult) {
      return {
        icon: Clock,
        label: 'Never Run',
        color: 'text-muted-foreground',
        bgColor: 'bg-muted/50',
        borderColor: 'border-muted',
      };
    }
    switch (result.status) {
      case 'passed':
        return {
          icon: CheckCircle2,
          label: 'Passed',
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
        };
      case 'failed':
      case 'error':
        return {
          icon: XCircle,
          label: result.status === 'error' ? 'Error' : 'Failed',
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
        };
      case 'skipped':
        return {
          icon: SkipForward,
          label: 'Skipped',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/50',
          borderColor: 'border-muted',
        };
      default:
        return {
          icon: Clock,
          label: 'Pending',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/50',
          borderColor: 'border-muted',
        };
    }
  };

  const status = getStatusConfig();
  const StatusIcon = status.icon;

  // Get the summary from the result
  const getSummary = () => {
    if (!hasResult) return null;

    // Use the AI-generated reason if available
    if (result.reason) {
      return result.reason;
    }

    // Fallback summaries if no reason is available
    if (result.status === 'passed') {
      const stepCount = result.steps?.length || 0;
      return stepCount > 0
        ? `The test completed successfully after executing ${stepCount} step${stepCount === 1 ? '' : 's'}.`
        : 'The test completed successfully.';
    }

    if (result.status === 'failed' || result.status === 'error') {
      return result.error || 'The test did not complete as expected.';
    }

    if (result.status === 'skipped') {
      return 'This test was skipped by the user during execution.';
    }

    return null;
  };

  const summary = getSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-semibold">{testCase.title}</h2>
            <p className="text-muted-foreground text-sm">
              Created {formatRelativeTime(testCase.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button size="sm" onClick={onRun}>
            <Play className="mr-2 h-4 w-4" />
            Run Test
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <Card className={cn('border-2', status.borderColor)}>
        <CardContent className={cn('py-6', status.bgColor)}>
          <div className="flex items-center gap-4">
            <div className={cn('p-3 rounded-full', status.bgColor)}>
              <StatusIcon className={cn('h-8 w-8', status.color)} />
            </div>
            <div className="flex-1">
              <div className={cn('text-2xl font-semibold', status.color)}>
                {status.label}
              </div>
              {hasResult && result.completedAt && (
                <p className="text-muted-foreground">
                  Last run {formatRelativeTime(result.completedAt)}
                </p>
              )}
            </div>
            {hasResult && result.duration && (
              <div className="text-right">
                <div className="text-2xl font-semibold">
                  {formatDuration(result.duration)}
                </div>
                <p className="text-muted-foreground text-sm">Duration</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Result Summary - Show for any completed test */}
      {hasResult && summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.status === 'passed' ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : result.status === 'failed' || result.status === 'error' ? (
                <AlertCircle className="h-5 w-5 text-red-500" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
              Result Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              'p-4 rounded-lg border',
              result.status === 'passed'
                ? 'bg-green-500/5 border-green-500/20'
                : result.status === 'failed' || result.status === 'error'
                ? 'bg-red-500/5 border-red-500/20'
                : 'bg-muted/50 border-muted'
            )}>
              <ul className="space-y-2">
                {summary.split('\n').filter(line => line.trim()).map((line, index) => {
                  // Remove bullet character if present, we'll add our own styling
                  const cleanLine = line.replace(/^[•\-\*]\s*/, '').trim();
                  if (!cleanLine) return null;
                  return (
                    <li key={index} className="flex gap-3">
                      <span className={cn(
                        'flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2',
                        result.status === 'passed' ? 'bg-green-500' :
                        result.status === 'failed' || result.status === 'error' ? 'bg-red-500' :
                        'bg-muted-foreground'
                      )} />
                      <span className="text-foreground leading-relaxed">{cleanLine}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Steps Taken - Show if there are steps */}
      {hasResult && result.steps && result.steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListOrdered className="h-5 w-5" />
              Steps Executed ({result.steps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {result.steps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className={cn(
                    'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                    result.status === 'passed'
                      ? 'bg-green-500/10 text-green-500'
                      : result.status === 'failed' || result.status === 'error'
                      ? index === result.steps!.length - 1
                        ? 'bg-red-500/10 text-red-500'
                        : 'bg-green-500/10 text-green-500'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {index + 1}
                  </span>
                  <span className="text-foreground pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Test Details */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Test Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {testCase.description}
            </p>
          </CardContent>
        </Card>

        {/* Expected Outcome */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Expected Outcome
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {testCase.expectedOutcome || 'No expected outcome specified.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Execution Details - Only show if there's a result */}
      {hasResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Execution Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-sm text-muted-foreground mb-1">Status</div>
                <Badge className={cn(
                  result.status === 'passed' && 'bg-green-500/10 text-green-500 border-green-500/20',
                  (result.status === 'failed' || result.status === 'error') && 'bg-red-500/10 text-red-500 border-red-500/20',
                  result.status === 'skipped' && 'bg-muted text-muted-foreground',
                )}>
                  {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                </Badge>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-sm text-muted-foreground mb-1">Duration</div>
                <div className="font-medium">
                  {result.duration ? formatDuration(result.duration) : '--'}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-sm text-muted-foreground mb-1">Started</div>
                <div className="font-medium text-sm">
                  {result.startedAt ? new Date(result.startedAt).toLocaleTimeString() : '--'}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-sm text-muted-foreground mb-1">Completed</div>
                <div className="font-medium text-sm">
                  {result.completedAt ? new Date(result.completedAt).toLocaleTimeString() : '--'}
                </div>
              </div>
            </div>

            {/* Browser Recording Link */}
            {result.streamingUrl && (
              <div className="mt-4 pt-4 border-t">
                <a
                  href={result.streamingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Browser Recording
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Extracted Data - Only show if there's data */}
      {hasResult && result.extractedData && Object.keys(result.extractedData).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="p-4 rounded-lg bg-muted/50 text-sm overflow-auto max-h-64">
              {JSON.stringify(result.extractedData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* No Result Message */}
      {!hasResult && (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Results Yet</h3>
            <p className="text-muted-foreground mb-4">
              This test has not been run yet. Click the Run Test button to execute it and see the results.
            </p>
            <Button onClick={onRun}>
              <Play className="mr-2 h-4 w-4" />
              Run Test
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
