"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import type { GeneratedTest } from '@/types';
import { cn } from '@/lib/utils';

interface AITestGeneratorProps {
  websiteUrl: string;
  onAddTests: (tests: GeneratedTest[]) => void;
}

export function AITestGenerator({ websiteUrl, onAddTests }: AITestGeneratorProps) {
  const [rawText, setRawText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTests, setGeneratedTests] = useState<GeneratedTest[]>([]);
  const [selectedTests, setSelectedTests] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!rawText.trim()) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedTests([]);
    setSelectedTests(new Set());

    try {
      const response = await fetch('/api/generate-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText,
          websiteUrl,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate tests');
      }

      const data = await response.json();

      if (data.tests && data.tests.length > 0) {
        setGeneratedTests(data.tests);
        // Select all by default
        setSelectedTests(new Set(data.tests.map((_: GeneratedTest, i: number) => i)));
      } else {
        setError('No tests were generated. Try providing more details.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tests');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTest = (index: number) => {
    const newSelected = new Set(selectedTests);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTests(newSelected);
  };

  const selectAll = () => {
    setSelectedTests(new Set(generatedTests.map((_, i) => i)));
  };

  const selectNone = () => {
    setSelectedTests(new Set());
  };

  const handleAddSelected = () => {
    const testsToAdd = generatedTests.filter((_, i) => selectedTests.has(i));
    if (testsToAdd.length > 0) {
      onAddTests(testsToAdd);
      // Reset state
      setGeneratedTests([]);
      setSelectedTests(new Set());
      setRawText('');
    }
  };

  const removeTest = (index: number) => {
    setGeneratedTests((prev) => prev.filter((_, i) => i !== index));
    const newSelected = new Set(selectedTests);
    newSelected.delete(index);
    // Adjust indices for items after the removed one
    const adjusted = new Set<number>();
    newSelected.forEach((i) => {
      if (i > index) {
        adjusted.add(i - 1);
      } else {
        adjusted.add(i);
      }
    });
    setSelectedTests(adjusted);
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Test Generator
          </CardTitle>
          <CardDescription>
            Paste your requirements, user stories, feature descriptions, or any text.
            AI will analyze it and generate test cases automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={`Paste your text here. Examples:

• Feature requirements or user stories
• Bug descriptions to create regression tests
• Workflow descriptions
• API documentation
• Or just describe what you want to test...

Example:
"Users should be able to log in with email and password.
If credentials are wrong, show an error message.
Users can reset their password via email link.
After 3 failed attempts, the account is locked for 15 minutes."`}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={10}
            className="resize-none font-mono text-sm"
          />

          <div className="flex items-center gap-4">
            <Button
              onClick={handleGenerate}
              disabled={!rawText.trim() || isGenerating}
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Tests...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Test Cases
                </>
              )}
            </Button>

            {error && (
              <span className="text-sm text-destructive">{error}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generated Tests Section */}
      {generatedTests.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Generated Test Cases</CardTitle>
                <CardDescription>
                  Review and select the tests you want to add. You can edit them after adding.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedTests.size} of {generatedTests.length} selected
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selection controls */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={selectNone}>
                Select None
              </Button>
            </div>

            {/* Test list */}
            <div className="space-y-3">
              {generatedTests.map((test, index) => (
                <div
                  key={index}
                  className={cn(
                    'p-4 rounded-lg border transition-colors',
                    selectedTests.has(index)
                      ? 'bg-primary/5 border-primary/30'
                      : 'bg-muted/30 border-border'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedTests.has(index)}
                      onCheckedChange={() => toggleTest(index)}
                      className="mt-1"
                    />

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{test.title}</span>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {test.description}
                      </p>

                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Expected:</span>
                        <span className="text-green-500">{test.expectedOutcome}</span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeTest(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add button */}
            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={handleAddSelected}
                disabled={selectedTests.size === 0}
                size="lg"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add {selectedTests.size} Test{selectedTests.size !== 1 ? 's' : ''} to Project
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success state placeholder for when tests are added */}
      {generatedTests.length === 0 && rawText === '' && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Paste your requirements or descriptions above to generate test cases
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
