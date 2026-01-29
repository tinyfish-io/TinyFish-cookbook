"use client";

import { motion } from "framer-motion";
import {
  MapPin,
  Building2,
  Clock,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Wifi,
  WifiOff,
  DollarSign,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeDate, isNewJob, truncate } from "@/lib/utils";
import type { Job, SavedJob } from "@/lib/types";

interface JobCardProps {
  job: Job;
  savedJob?: SavedJob;
  onSave: () => void;
  onUnsave: () => void;
  onClick: () => void;
  index?: number;
}

export function JobCard({
  job,
  savedJob,
  onSave,
  onUnsave,
  onClick,
  index = 0,
}: JobCardProps) {
  const isSaved = !!savedJob;
  const isNew = job.postedDate ? isNewJob(job.postedDate) : false;

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return "text-match-excellent";
    if (score >= 50) return "text-match-good";
    return "text-match-poor";
  };

  const getMatchScoreBg = (score: number) => {
    if (score >= 80) return "bg-match-excellent/10 border-match-excellent/20";
    if (score >= 50) return "bg-match-good/10 border-match-good/20";
    return "bg-match-poor/10 border-match-poor/20";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className="job-card cursor-pointer group hover:shadow-lg transition-all duration-200"
        onClick={onClick}
      >
        <CardContent className="p-5">
          <div className="flex gap-4">
            {/* Company logo placeholder */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <Building2 className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-medium text-lg leading-tight group-hover:text-burnt-orange transition-colors">
                    {job.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{job.company}</p>
                </div>

                {/* Match score */}
                <div
                  className={cn(
                    "flex-shrink-0 px-3 py-1.5 rounded-lg border",
                    getMatchScoreBg(job.matchScore)
                  )}
                >
                  <span
                    className={cn(
                      "text-lg font-semibold",
                      getMatchScoreColor(job.matchScore)
                    )}
                  >
                    {job.matchScore}%
                  </span>
                </div>
              </div>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {job.location}
                </span>

                {job.remoteStatus && (
                  <span className="inline-flex items-center gap-1">
                    {job.remoteStatus === "remote" ? (
                      <Wifi className="w-3.5 h-3.5 text-match-excellent" />
                    ) : (
                      <WifiOff className="w-3.5 h-3.5" />
                    )}
                    {job.remoteStatus === "remote"
                      ? "Remote"
                      : job.remoteStatus === "hybrid"
                      ? "Hybrid"
                      : "On-site"}
                  </span>
                )}

                {job.salaryRange && (
                  <span className="inline-flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    {job.salaryRange}
                  </span>
                )}

                {job.postedDate && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatRelativeDate(job.postedDate)}
                  </span>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {isNew && (
                  <Badge className="bg-match-excellent text-white">NEW</Badge>
                )}

                {job.isPerfectFit && (
                  <Badge className="bg-deep-teal text-white">Perfect Fit</Badge>
                )}

                {job.isReach && (
                  <Badge variant="outline" className="border-burnt-orange text-burnt-orange">
                    Reach
                  </Badge>
                )}

                <Badge variant="secondary" className="text-xs">
                  {job.sourceBoard}
                </Badge>
              </div>

              {/* Match explanation */}
              {job.matchExplanation && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {job.matchExplanation}
                </p>
              )}

              {/* Key strengths */}
              {job.keyStrengths && job.keyStrengths.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {job.keyStrengths.slice(0, 3).map((strength, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 rounded-full bg-match-excellent/10 text-match-excellent"
                    >
                      {truncate(strength, 30)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                isSaved ? onUnsave() : onSave();
              }}
              className={cn(
                isSaved && "text-burnt-orange hover:text-burnt-orange"
              )}
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="w-4 h-4 mr-2" />
                  Saved
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                window.open(job.fullUrl, "_blank");
              }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Job
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Compact job card for table/list views
 */
export function JobCardCompact({
  job,
  savedJob,
  onSave,
  onUnsave,
  onClick,
}: Omit<JobCardProps, "index">) {
  const isSaved = !!savedJob;
  const isNew = job.postedDate ? isNewJob(job.postedDate) : false;

  return (
    <div
      className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      {/* Match score */}
      <div
        className={cn(
          "w-12 h-12 rounded-lg flex items-center justify-center text-sm font-semibold",
          job.matchScore >= 80 && "bg-match-excellent/10 text-match-excellent",
          job.matchScore >= 50 &&
            job.matchScore < 80 &&
            "bg-match-good/10 text-match-good",
          job.matchScore < 50 && "bg-match-poor/10 text-match-poor"
        )}
      >
        {job.matchScore}%
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium truncate">{job.title}</h4>
          {isNew && (
            <Badge className="bg-match-excellent text-white text-xs">NEW</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {job.company} • {job.location}
        </p>
      </div>

      {/* Actions */}
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          isSaved ? onUnsave() : onSave();
        }}
        className={cn(isSaved && "text-burnt-orange")}
      >
        {isSaved ? (
          <BookmarkCheck className="w-4 h-4" />
        ) : (
          <Bookmark className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}
