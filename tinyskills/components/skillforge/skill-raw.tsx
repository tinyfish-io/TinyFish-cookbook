"use client";

import { ScrollArea } from "@/components/ui/scroll-area";

interface SkillRawProps {
  markdown: string;
}

export function SkillRaw({ markdown }: SkillRawProps) {
  if (!markdown) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p>No content yet. Generate a skill guide to see the raw markdown.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <pre className="p-6 font-mono text-sm text-muted-foreground whitespace-pre-wrap break-words">
        {markdown}
      </pre>
    </ScrollArea>
  );
}
