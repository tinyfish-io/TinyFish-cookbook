"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SkillPreview } from "./skill-preview";
import { SkillRaw } from "./skill-raw";
import { SkillSources } from "./skill-sources";
import type { IdentifiedSource } from "@/types";
import { Copy, Download, Check, Eye, Code, Link2 } from "lucide-react";
import { toast } from "sonner";

interface SkillOutputProps {
  skillMd: string;
  sources: IdentifiedSource[];
  topic: string;
  isStreaming?: boolean;
}

export function SkillOutput({
  skillMd,
  sources,
  topic,
  isStreaming = false,
}: SkillOutputProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(skillMd);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([skillMd], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SKILL-${topic.toLowerCase().replace(/\s+/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded SKILL.md");
  };

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="preview" className="flex-1 flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <TabsList>
            <TabsTrigger value="preview" className="gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="raw" className="gap-1.5">
              <Code className="h-3.5 w-3.5" />
              Raw
            </TabsTrigger>
            <TabsTrigger value="sources" className="gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              Sources
              {sources.length > 0 && (
                <span className="ml-1 rounded-full bg-secondary px-1.5 py-0.5 text-[10px]">
                  {sources.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              disabled={!skillMd || isStreaming}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className="sr-only">Copy</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              disabled={!skillMd || isStreaming}
            >
              <Download className="h-4 w-4" />
              <span className="sr-only">Download</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="preview" className="h-full m-0">
            <SkillPreview markdown={skillMd} isStreaming={isStreaming} />
          </TabsContent>
          <TabsContent value="raw" className="h-full m-0">
            <SkillRaw markdown={skillMd} />
          </TabsContent>
          <TabsContent value="sources" className="h-full m-0">
            <SkillSources sources={sources} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
