"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GripVertical,
  Building2,
  MapPin,
  Calendar,
  ExternalLink,
  Wifi,
} from "lucide-react";
import { cn, formatRelativeDate } from "@/lib/utils";
import type { Job, SavedJob, ApplicationStatus } from "@/lib/types";
import { APPLICATION_STATUS_CONFIG } from "@/lib/types";

interface JobTrackerKanbanProps {
  jobs: Job[];
  savedJobs: SavedJob[];
  onUpdateStatus: (savedJobId: string, status: ApplicationStatus) => void;
  onJobClick: (job: Job) => void;
}

interface Column {
  id: ApplicationStatus;
  title: string;
  color: string;
  savedJobs: SavedJob[];
}

const COLUMN_COLORS: Record<ApplicationStatus, string> = {
  saved: "#6B7280",
  applied: "#3B82F6",
  interview: "#8B5CF6",
  offer: "#10B981",
  rejected: "#EF4444",
};

export function JobTrackerKanban({
  jobs,
  savedJobs,
  onUpdateStatus,
  onJobClick,
}: JobTrackerKanbanProps) {
  const [draggedJob, setDraggedJob] = useState<{
    savedJob: SavedJob;
    sourceColumnId: ApplicationStatus;
  } | null>(null);

  // Build columns from saved jobs
  const columns: Column[] = (
    ["saved", "applied", "interview", "offer", "rejected"] as ApplicationStatus[]
  ).map((status) => ({
    id: status,
    title: APPLICATION_STATUS_CONFIG[status].label,
    color: COLUMN_COLORS[status],
    savedJobs: savedJobs.filter((sj) => sj.status === status),
  }));

  const getJobForSavedJob = (savedJob: SavedJob) =>
    jobs.find((j) => j.id === savedJob.jobId);

  const handleDragStart = (
    e: React.DragEvent,
    savedJob: SavedJob,
    columnId: ApplicationStatus
  ) => {
    setDraggedJob({ savedJob, sourceColumnId: columnId });
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ savedJobId: savedJob.id, sourceColumnId: columnId })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: ApplicationStatus) => {
    e.preventDefault();

    if (!draggedJob) return;

    const { savedJob, sourceColumnId } = draggedJob;

    if (sourceColumnId !== targetColumnId) {
      onUpdateStatus(savedJob.id, targetColumnId);
    }

    setDraggedJob(null);
  };

  const handleDragEnd = () => {
    setDraggedJob(null);
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return "text-match-excellent bg-match-excellent/10";
    if (score >= 50) return "text-match-good bg-match-good/10";
    return "text-match-poor bg-match-poor/10";
  };

  if (savedJobs.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <GripVertical className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-medium mb-2">No tracked applications</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Save jobs from the Jobs tab to start tracking your applications here.
          Drag and drop to update status.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {columns.map((column) => (
          <div
            key={column.id}
            className={cn(
              "bg-muted/30 backdrop-blur-sm rounded-2xl p-4 border border-border/50 min-h-[300px] transition-all",
              draggedJob && draggedJob.sourceColumnId !== column.id && "ring-2 ring-burnt-orange/30 ring-offset-2"
            )}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: column.color }}
                />
                <h3 className="font-medium text-sm">{column.title}</h3>
                <Badge
                  variant="secondary"
                  className="h-5 px-1.5 text-xs bg-background/80"
                >
                  {column.savedJobs.length}
                </Badge>
              </div>
            </div>

            {/* Cards */}
            <div className="space-y-3">
              {column.savedJobs.map((savedJob) => {
                const job = getJobForSavedJob(savedJob);
                if (!job) return null;

                return (
                  <Card
                    key={savedJob.id}
                    className={cn(
                      "cursor-move transition-all duration-200 border bg-background/80 backdrop-blur-sm hover:shadow-md hover:border-burnt-orange/30",
                      draggedJob?.savedJob.id === savedJob.id && "opacity-50 scale-95"
                    )}
                    draggable
                    onDragStart={(e) => handleDragStart(e, savedJob, column.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onJobClick(job)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Title and drag handle */}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm leading-tight line-clamp-2">
                            {job.title}
                          </h4>
                          <GripVertical className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 cursor-grab" />
                        </div>

                        {/* Company */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Building2 className="w-3.5 h-3.5" />
                          <span className="truncate">{job.company}</span>
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {job.remoteStatus === "remote" ? (
                            <>
                              <Wifi className="w-3.5 h-3.5 text-match-excellent" />
                              <span className="text-match-excellent">Remote</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="truncate">{job.location}</span>
                            </>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs font-medium",
                              getMatchScoreColor(job.matchScore)
                            )}
                          >
                            {job.matchScore}%
                          </Badge>

                          {savedJob.appliedDate && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatRelativeDate(savedJob.appliedDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Empty state for column */}
              {column.savedJobs.length === 0 && (
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
                  Drop here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
