"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Check,
  X,
  Loader2,
  ExternalLink,
  StopCircle,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { JobBoardScan, GeneratedSearchUrl } from "@/lib/types";

interface ScrapingGridProps {
  searchUrls: GeneratedSearchUrl[];
  jobSearchCriteria: string;
  onComplete: (results: Map<string, unknown[]>) => void;
  onCancel: () => void;
  onStreamingUrl?: (url: string) => void;
}

export function ScrapingGrid({
  searchUrls,
  jobSearchCriteria,
  onComplete,
  onCancel,
  onStreamingUrl,
}: ScrapingGridProps) {
  const [boardScans, setBoardScans] = useState<Map<string, JobBoardScan>>(
    new Map()
  );
  const [isRunning, setIsRunning] = useState(true);
  const [completedCount, setCompletedCount] = useState(0);
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<Map<string, unknown[]>>(new Map());

  // Initialize board scans
  useEffect(() => {
    const initialScans = new Map<string, JobBoardScan>();
    searchUrls.forEach(({ boardName, searchUrl }) => {
      initialScans.set(boardName, {
        board: boardName,
        searchUrl,
        status: "pending",
        steps: [],
        jobsFound: 0,
      });
    });
    setBoardScans(initialScans);
  }, [searchUrls]);

  // Start scraping when component mounts
  useEffect(() => {
    const runScraping = async () => {
      abortControllerRef.current = new AbortController();

      const { scrapeMultipleBoards } = await import("@/lib/mino-client");

      await scrapeMultipleBoards(
        searchUrls,
        jobSearchCriteria,
        (boardName, update) => {
          setBoardScans((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(boardName);
            if (existing) {
              const updated: JobBoardScan = {
                ...existing,
                status: update.status,
                steps: update.step
                  ? [...existing.steps, update.step].slice(-5)
                  : existing.steps,
                jobsFound: update.jobsFound ?? existing.jobsFound,
                error: update.error,
                streamingUrl: update.streamingUrl ?? existing.streamingUrl,
              };
              newMap.set(boardName, updated);

              // Notify parent of streaming URL
              if (update.streamingUrl && onStreamingUrl) {
                onStreamingUrl(update.streamingUrl);
              }

              // Track completion
              if (update.status === "complete" || update.status === "error") {
                setCompletedCount((c) => c + 1);
              }
            }
            return newMap;
          });
        },
        abortControllerRef.current.signal
      );

      setIsRunning(false);
      onComplete(resultsRef.current);
    };

    if (searchUrls.length > 0) {
      runScraping();
    }

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [searchUrls, jobSearchCriteria, onComplete, onStreamingUrl]);

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setIsRunning(false);
    onCancel();
  };

  const handleWatchLive = (boardName: string) => {
    const scan = boardScans.get(boardName);
    if (scan?.streamingUrl) {
      setSelectedBoard(boardName);
      onStreamingUrl?.(scan.streamingUrl);
    }
  };

  const totalBoards = searchUrls.length;
  const progressPercent =
    totalBoards > 0 ? Math.round((completedCount / totalBoards) * 100) : 0;

  const getStatusIcon = (status: JobBoardScan["status"]) => {
    switch (status) {
      case "pending":
        return <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />;
      case "searching":
        return <Search className="w-3 h-3 text-burnt-orange animate-pulse" />;
      case "extracting":
        return <Loader2 className="w-3 h-3 text-burnt-orange animate-spin" />;
      case "complete":
        return <Check className="w-3 h-3 text-green-500" />;
      case "error":
        return <X className="w-3 h-3 text-red-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {completedCount} / {totalBoards} complete
          </div>
          <Progress value={progressPercent} className="w-32 h-1.5" />
        </div>
        {isRunning && (
          <Button variant="ghost" size="sm" onClick={handleCancel} className="h-8">
            <StopCircle className="w-4 h-4 mr-1.5" />
            Cancel
          </Button>
        )}
      </div>

      {/* Notion-style minimal board list */}
      <div className="border rounded-lg divide-y">
        {Array.from(boardScans.values()).map((scan) => (
          <div
            key={scan.board}
            className={cn(
              "flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors",
              selectedBoard === scan.board && "bg-muted/50"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              {getStatusIcon(scan.status)}
              <span className="font-medium text-sm truncate">{scan.board}</span>

              {/* Status text */}
              {scan.status === "complete" && (
                <span className="text-xs text-green-600">
                  {scan.jobsFound} jobs
                </span>
              )}
              {scan.status === "error" && (
                <span className="text-xs text-red-500 truncate max-w-[200px]">
                  {scan.error || "Failed"}
                </span>
              )}
              {(scan.status === "searching" || scan.status === "extracting") && (
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {scan.steps[scan.steps.length - 1] || "Starting..."}
                </span>
              )}
            </div>

            {/* Watch live button */}
            {scan.streamingUrl && scan.status !== "complete" && scan.status !== "error" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-burnt-orange hover:text-burnt-orange"
                onClick={() => handleWatchLive(scan.board)}
              >
                <Eye className="w-3 h-3 mr-1" />
                Watch
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Summary when done */}
      {!isRunning && (
        <div className="flex gap-6 text-sm text-muted-foreground">
          <span className="text-green-600">
            {Array.from(boardScans.values()).filter((s) => s.status === "complete").length} succeeded
          </span>
          <span>
            {Array.from(boardScans.values()).reduce((sum, s) => sum + s.jobsFound, 0)} total jobs
          </span>
          <span className="text-red-500">
            {Array.from(boardScans.values()).filter((s) => s.status === "error").length} failed
          </span>
        </div>
      )}
    </div>
  );
}
