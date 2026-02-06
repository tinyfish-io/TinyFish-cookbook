"use client";

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Clock, AlertCircle, Bug, Copy, Check } from 'lucide-react';
import type { TestCase, TestResult, BugReport } from '@/types';
import { formatDuration, cn } from '@/lib/utils';

interface TestResultsTableProps {
  testCases: TestCase[];
  results: TestResult[];
  projectUrl: string;
}

export function TestResultsTable({
  testCases,
  results,
  projectUrl,
}: TestResultsTableProps) {
  const [bugReport, setBugReport] = useState<BugReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const getTestCase = (testCaseId: string) => {
    return testCases.find((tc) => tc.id === testCaseId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'skipped':
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const generateBugReport = async (result: TestResult, testCase: TestCase) => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          failedTest: result,
          testCase,
          projectUrl,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const report = await response.json();
      setBugReport(report);
    } catch (error) {
      console.error('Error generating bug report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyReport = () => {
    if (!bugReport) return;

    const markdown = `# ${bugReport.title}

**Severity:** ${bugReport.severity}

## Description
${bugReport.description}

## Steps to Reproduce
${bugReport.stepsToReproduce.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## Expected Behavior
${bugReport.expectedBehavior}

## Actual Behavior
${bugReport.actualBehavior}

${bugReport.environment ? `## Environment\n${bugReport.environment}\n` : ''}
${bugReport.additionalNotes ? `## Additional Notes\n${bugReport.additionalNotes}` : ''}`;

    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate summary
  const summary = {
    total: results.length,
    passed: results.filter((r) => r.status === 'passed').length,
    failed: results.filter((r) => r.status === 'failed' || r.status === 'error').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
  };

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-2xl font-bold">{summary.total}</div>
          <div className="text-sm text-muted-foreground">Total Tests</div>
        </div>
        <div className="rounded-lg border bg-card p-4 border-green-500/20">
          <div className="text-2xl font-bold text-green-500">{summary.passed}</div>
          <div className="text-sm text-muted-foreground">Passed</div>
        </div>
        <div className="rounded-lg border bg-card p-4 border-red-500/20">
          <div className="text-2xl font-bold text-red-500">{summary.failed}</div>
          <div className="text-sm text-muted-foreground">Failed</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-2xl font-bold text-muted-foreground">{summary.skipped}</div>
          <div className="text-sm text-muted-foreground">Skipped</div>
        </div>
      </div>

      {/* Results Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Test Case</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => {
              const testCase = getTestCase(result.testCaseId);
              // Show result even if test case was deleted
              const title = testCase?.title || `Test ${result.testCaseId.slice(0, 8)}...`;
              const description = testCase?.description || 'Test case details not available';

              return (
                <TableRow key={result.id}>
                  <TableCell>{getStatusIcon(result.status)}</TableCell>
                  <TableCell>
                    <Accordion type="single" collapsible>
                      <AccordionItem value="details" className="border-0">
                        <AccordionTrigger className="py-0 hover:no-underline">
                          <span className="font-medium">{title}</span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2">
                          <div className="space-y-2 text-sm">
                            <p className="text-muted-foreground">
                              {description}
                            </p>
                            {result.reason && (
                              <div className={cn(
                                'p-2 rounded border',
                                result.status === 'passed'
                                  ? 'bg-green-500/10 text-green-600 border-green-500/20'
                                  : result.status === 'failed' || result.status === 'error'
                                  ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                  : 'bg-muted text-muted-foreground border-muted'
                              )}>
                                <span className="font-medium">Summary: </span>
                                {result.reason}
                              </div>
                            )}
                            {result.error && !result.reason && (
                              <div className="p-2 rounded bg-red-500/10 text-red-500 border border-red-500/20">
                                <span className="font-medium">Error: </span>
                                {result.error}
                              </div>
                            )}
                            {result.steps && result.steps.length > 0 && (
                              <div className="p-2 rounded bg-muted">
                                <span className="font-medium">Steps Executed:</span>
                                <ol className="mt-1 list-decimal list-inside text-xs space-y-0.5">
                                  {result.steps.map((step, i) => (
                                    <li key={i}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            )}
                            {result.extractedData && Object.keys(result.extractedData).length > 0 && (
                              <div className="p-2 rounded bg-muted">
                                <span className="font-medium">Extracted Data:</span>
                                <pre className="mt-1 text-xs overflow-auto">
                                  {JSON.stringify(result.extractedData, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {result.duration ? formatDuration(result.duration) : '--'}
                  </TableCell>
                  <TableCell>
                    {(result.status === 'failed' || result.status === 'error') && testCase && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateBugReport(result, testCase)}
                        disabled={isGenerating}
                      >
                        <Bug className="mr-2 h-4 w-4" />
                        {isGenerating ? 'Generating...' : 'Bug Report'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Bug Report Dialog */}
      <Dialog open={!!bugReport} onOpenChange={(open) => !open && setBugReport(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-red-500" />
              Bug Report
            </DialogTitle>
            <DialogDescription>
              AI-generated bug report based on the test failure
            </DialogDescription>
          </DialogHeader>

          {bugReport && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">{bugReport.title}</h3>
                <Badge
                  className={cn(
                    'mt-1',
                    bugReport.severity === 'critical' && 'bg-red-500',
                    bugReport.severity === 'high' && 'bg-orange-500',
                    bugReport.severity === 'medium' && 'bg-amber-500',
                    bugReport.severity === 'low' && 'bg-blue-500'
                  )}
                >
                  {bugReport.severity}
                </Badge>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                <p className="text-sm">{bugReport.description}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Steps to Reproduce</h4>
                <ol className="text-sm list-decimal list-inside space-y-1">
                  {bugReport.stepsToReproduce.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Expected Behavior</h4>
                  <p className="text-sm">{bugReport.expectedBehavior}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Actual Behavior</h4>
                  <p className="text-sm">{bugReport.actualBehavior}</p>
                </div>
              </div>

              {bugReport.additionalNotes && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Additional Notes</h4>
                  <p className="text-sm">{bugReport.additionalNotes}</p>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={copyReport}>
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy as Markdown
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
