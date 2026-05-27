'use client';

import React from "react"

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { UseCase } from '@/lib/types';

interface SearchFormProps {
  onSearch: (topic: string, useCase: UseCase) => void;
  isLoading: boolean;
}

const useCases: { value: UseCase; label: string; description: string }[] = [
  { value: 'machine-learning', label: 'Machine Learning', description: 'Training models' },
  { value: 'academic-research', label: 'Research', description: 'Academic study' },
  { value: 'visualization', label: 'Visualization', description: 'Charts & insights' },
  { value: 'general', label: 'General', description: 'Exploration' },
];

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [topic, setTopic] = useState('');
  const [useCase, setUseCase] = useState<UseCase>('machine-learning');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onSearch(topic.trim(), useCase);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="topic" className="font-mono text-xs uppercase tracking-widest font-semibold text-foreground">
          What domain or problem are you exploring?
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            id="topic"
            type="text"
            placeholder="e.g., stock prices, dna sequencing"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="pl-10 h-12 text-base bg-card border-2 border-border focus:border-primary rounded-xl"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="font-mono text-xs uppercase tracking-widest font-semibold text-foreground">Purpose</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {useCases.map((uc) => (
            <button
              key={uc.value}
              type="button"
              onClick={() => setUseCase(uc.value)}
              disabled={isLoading}
              className={cn(
                'flex flex-col items-start p-3 rounded-xl text-left transition-all',
                'border-2 hover:border-primary/50',
                useCase === uc.value
                  ? 'bg-primary/10 text-foreground border-primary shadow-sm shadow-primary/20'
                  : 'bg-card text-foreground border-border hover:bg-muted'
              )}
            >
              <span className="font-medium text-sm">{uc.label}</span>
              <span
                className={cn(
                  'text-xs',
                  useCase === uc.value ? 'text-foreground/70' : 'text-muted-foreground'
                )}
              >
                {uc.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25" disabled={!topic.trim() || isLoading}>
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Discovering datasets...
          </span>
        ) : (
          <span className="flex items-center gap-2 font-mono font-semibold uppercase tracking-wide">
            <Search className="w-5 h-5" />
            Run Scan
          </span>
        )}
      </Button>
    </form>
  );
}
