"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { GripVertical, Building2, ExternalLink, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeDate } from "@/lib/utils";
import type { Job, SavedJob, ApplicationStatus } from "@/lib/types";
import { APPLICATION_STATUS_CONFIG } from "@/lib/types";

interface KanbanBoardProps {
  jobs: Job[];
  savedJobs: SavedJob[];
  onUpdateStatus: (savedJobId: string, status: ApplicationStatus) => void;
  onJobClick: (job: Job) => void;
}

const COLUMNS: ApplicationStatus[] = [
  "saved",
  "applied",
  "interview",
  "offer",
  "rejected",
];

export function KanbanBoard({
  jobs,
  savedJobs,
  onUpdateStatus,
  onJobClick,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group saved jobs by status
  const jobsByStatus = COLUMNS.reduce((acc, status) => {
    acc[status] = savedJobs.filter((sj) => sj.status === status);
    return acc;
  }, {} as Record<ApplicationStatus, SavedJob[]>);

  const getJobForSavedJob = (savedJob: SavedJob) =>
    jobs.find((j) => j.id === savedJob.jobId);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column
    if (COLUMNS.includes(overId as ApplicationStatus)) {
      const savedJob = savedJobs.find((sj) => sj.id === activeId);
      if (savedJob && savedJob.status !== overId) {
        onUpdateStatus(activeId, overId as ApplicationStatus);
      }
    }
  };

  const activeSavedJob = activeId
    ? savedJobs.find((sj) => sj.id === activeId)
    : null;
  const activeJob = activeSavedJob
    ? getJobForSavedJob(activeSavedJob)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            savedJobs={jobsByStatus[status]}
            jobs={jobs}
            onJobClick={onJobClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeJob && activeSavedJob && (
          <KanbanCardDragPreview job={activeJob} savedJob={activeSavedJob} />
        )}
      </DragOverlay>
    </DndContext>
  );
}

interface KanbanColumnProps {
  status: ApplicationStatus;
  savedJobs: SavedJob[];
  jobs: Job[];
  onJobClick: (job: Job) => void;
}

function KanbanColumn({ status, savedJobs, jobs, onJobClick }: KanbanColumnProps) {
  const { label, color, bgColor } = APPLICATION_STATUS_CONFIG[status];
  const { setNodeRef, isOver } = useSortable({
    id: status,
    data: { type: "column" },
  });

  const getJobForSavedJob = (savedJob: SavedJob) =>
    jobs.find((j) => j.id === savedJob.jobId);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "kanban-column flex-shrink-0 w-72 rounded-lg bg-muted/30 p-3",
        isOver && "ring-2 ring-burnt-orange ring-offset-2"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge className={cn(bgColor, color)}>{label}</Badge>
          <span className="text-sm text-muted-foreground">
            {savedJobs.length}
          </span>
        </div>
      </div>

      <SortableContext
        items={savedJobs.map((sj) => sj.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 min-h-[200px]">
          {savedJobs.map((savedJob) => {
            const job = getJobForSavedJob(savedJob);
            if (!job) return null;

            return (
              <KanbanCard
                key={savedJob.id}
                savedJob={savedJob}
                job={job}
                onClick={() => onJobClick(job)}
              />
            );
          })}

          {savedJobs.length === 0 && (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
              Drop jobs here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

interface KanbanCardProps {
  savedJob: SavedJob;
  job: Job;
  onClick: () => void;
}

function KanbanCard({ savedJob, job, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: savedJob.id,
    data: { type: "card", savedJob, job },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(isDragging && "opacity-50")}
    >
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow group"
        onClick={onClick}
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <button
              {...listeners}
              className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{job.title}</h4>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Building2 className="w-3 h-3" />
                <span className="truncate">{job.company}</span>
              </div>

              <div className="flex items-center justify-between mt-2">
                <div
                  className={cn(
                    "text-xs font-medium px-1.5 py-0.5 rounded",
                    job.matchScore >= 80 &&
                      "bg-match-excellent/10 text-match-excellent",
                    job.matchScore >= 50 &&
                      job.matchScore < 80 &&
                      "bg-match-good/10 text-match-good",
                    job.matchScore < 50 && "bg-match-poor/10 text-match-poor"
                  )}
                >
                  {job.matchScore}% match
                </div>

                {savedJob.appliedDate && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatRelativeDate(savedJob.appliedDate)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function KanbanCardDragPreview({
  job,
  savedJob,
}: {
  job: Job;
  savedJob: SavedJob;
}) {
  return (
    <Card className="w-64 shadow-xl rotate-3">
      <CardContent className="p-3">
        <h4 className="font-medium text-sm truncate">{job.title}</h4>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <Building2 className="w-3 h-3" />
          <span className="truncate">{job.company}</span>
        </div>
      </CardContent>
    </Card>
  );
}
