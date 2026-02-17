"use client";

import { useEffect, useState } from "react";
import {
  getHistory,
  clearHistory,
  getSkills,
  deleteSkill,
  type HistoryEntry,
} from "@/lib/storage";
import type { GeneratedSkill } from "@/types";
import { formatDuration } from "@/lib/utils";
import {
  Trash2,
  CheckCircle,
  XCircle,
  FileText,
  Download,
  History,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [skills, setSkills] = useState<GeneratedSkill[]>([]);

  useEffect(() => {
    setHistory(getHistory());
    setSkills(getSkills());
  }, []);

  const handleClearHistory = () => {
    if (confirm("Clear all generation history?")) {
      clearHistory();
      setHistory([]);
      toast.success("History cleared");
    }
  };

  const handleDeleteSkill = (skillId: string) => {
    deleteSkill(skillId);
    setSkills(getSkills());
    toast.success("Skill deleted");
  };

  const handleDownloadSkill = (skill: GeneratedSkill) => {
    const blob = new Blob([skill.skillMd], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SKILL-${skill.topic.toLowerCase().replace(/\s+/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded SKILL.md");
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/tinyfish.avif"
              alt="TinySkills"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="font-semibold text-lg tracking-tight font-display">TinySkills<span className="text-primary">.md</span></span>
          </Link>
        </div>
        <nav className="flex items-center gap-1">
          <Link
            href="/history"
            className="p-2 rounded-md text-foreground bg-muted"
          >
            <History className="w-4 h-4" />
          </Link>
          <Link
            href="/settings"
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <p className="section-label mb-2">Activity</p>
          <h1 className="text-3xl font-semibold tracking-tight text-secondary">History</h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Saved Skills */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="section-label">Saved Skills</p>
              <span className="text-xs text-muted-foreground">{skills.length} total</span>
            </div>

            {skills.length === 0 ? (
              <div className="bg-white border border-dashed border-border rounded-lg p-8 text-center">
                <FileText className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No saved skills yet</p>
                <Link href="/" className="text-sm text-primary hover:underline mt-2 inline-block">
                  Generate your first skill guide
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="bg-white border border-border rounded-lg p-4 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{skill.topic}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(skill.generatedAt).toLocaleDateString()} &middot;{" "}
                          {skill.sources.length} sources
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDownloadSkill(skill)}
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSkill(skill.id)}
                          className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generation History */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="section-label">Generation History</p>
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="bg-white border border-dashed border-border rounded-lg p-8 text-center">
                <History className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No history yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.slice(0, 20).map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-white border border-border rounded-lg p-4 flex items-center gap-3"
                  >
                    {entry.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{entry.topic}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                        <span>&middot;</span>
                        <span>{formatDuration(entry.duration)}</span>
                        {entry.success && (
                          <>
                            <span>&middot;</span>
                            <span>{entry.sourceCount} sources</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
