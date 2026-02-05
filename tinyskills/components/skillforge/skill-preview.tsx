"use client";

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { marked } from "marked";

interface SkillPreviewProps {
  markdown: string;
  isStreaming?: boolean;
}

export function SkillPreview({
  markdown,
  isStreaming = false,
}: SkillPreviewProps) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    if (markdown) {
      // Configure marked
      marked.setOptions({
        gfm: true,
        breaks: true,
      });

      const parsed = marked.parse(markdown);
      if (typeof parsed === "string") {
        setHtml(parsed);
      } else {
        parsed.then(setHtml);
      }
    } else {
      setHtml("");
    }
  }, [markdown]);

  if (!markdown && !isStreaming) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p>No content yet. Generate a skill guide to see the preview.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6">
        <div
          className="prose-skill max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {isStreaming && (
          <div className="flex items-center gap-2 mt-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Generating...</span>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
