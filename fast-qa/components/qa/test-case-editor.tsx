"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { TestCase } from '@/types';

interface TestCaseEditorProps {
  testCase?: Partial<TestCase>;
  websiteUrl: string;
  onSave: (testCase: Pick<TestCase, 'title' | 'description' | 'expectedOutcome' | 'status'>) => void;
  onCancel: () => void;
}

export function TestCaseEditor({
  testCase,
  websiteUrl,
  onSave,
  onCancel,
}: TestCaseEditorProps) {
  const [title, setTitle] = useState(testCase?.title || '');
  const [description, setDescription] = useState(testCase?.description || '');
  const [expectedOutcome, setExpectedOutcome] = useState(testCase?.expectedOutcome || '');

  const handleSave = () => {
    if (!title.trim() || !description.trim()) return;

    onSave({
      title,
      description,
      expectedOutcome,
      status: 'pending',
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{testCase?.id ? 'Edit Test Case' : 'Create Test Case'}</CardTitle>
          <CardDescription>
            Describe your test in plain English. The AI will execute these steps on {websiteUrl}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., Login with valid credentials"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Test Description</Label>
            <Textarea
              id="description"
              placeholder={`Describe what this test should do. For example:

1. Navigate to the login page
2. Enter username 'test@example.com' and password 'password123'
3. Click the login button
4. Verify the dashboard appears with the user's name`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              className="resize-none font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected">Expected Outcome</Label>
            <Input
              id="expected"
              placeholder="e.g., User is logged in and sees their dashboard"
              value={expectedOutcome}
              onChange={(e) => setExpectedOutcome(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!title.trim() || !description.trim()}
        >
          Save Test Case
        </Button>
      </div>
    </div>
  );
}
