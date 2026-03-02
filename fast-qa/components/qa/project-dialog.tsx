"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { isValidUrl } from '@/lib/utils';
import type { Project } from '@/types';

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
  onSave: (name: string, websiteUrl: string, description?: string) => void;
}

export function ProjectDialog({
  open,
  onOpenChange,
  project,
  onSave,
}: ProjectDialogProps) {
  const [name, setName] = useState(project?.name || '');
  const [websiteUrl, setWebsiteUrl] = useState(project?.websiteUrl || '');
  const [description, setDescription] = useState(project?.description || '');
  const [urlError, setUrlError] = useState<string | null>(null);

  // Sync form state when project prop changes
  useEffect(() => {
    setName(project?.name || '');
    setWebsiteUrl(project?.websiteUrl || '');
    setDescription(project?.description || '');
    setUrlError(null);
  }, [project]);

  const handleSave = () => {
    // Validate URL
    if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
      setUrlError('URL must start with http:// or https://');
      return;
    }

    if (!isValidUrl(websiteUrl)) {
      setUrlError('Please enter a valid URL');
      return;
    }

    onSave(name, websiteUrl, description || undefined);
    onOpenChange(false);

    // Reset form
    setName('');
    setWebsiteUrl('');
    setDescription('');
    setUrlError(null);
  };

  const handleUrlChange = (value: string) => {
    setWebsiteUrl(value);
    setUrlError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Project' : 'Create New Project'}</DialogTitle>
          <DialogDescription>
            {project
              ? 'Update your project details'
              : 'Add a new website to test. You can create test cases after setting up the project.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              placeholder="e.g., My E-commerce Site"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Website URL</Label>
            <Input
              id="url"
              placeholder="https://example.com"
              value={websiteUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              className={urlError ? 'border-destructive' : ''}
            />
            {urlError && (
              <p className="text-sm text-destructive">{urlError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of what you're testing"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || !websiteUrl.trim()}>
            {project ? 'Save Changes' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
