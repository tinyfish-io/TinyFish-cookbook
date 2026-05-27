"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Briefcase,
  MapPin,
  Building2,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  ChevronUp,
  ChevronDown,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, isNewJob, formatRelativeDate } from "@/lib/utils";
import type { Job, SavedJob } from "@/lib/types";

interface JobFeedProps {
  jobs: Job[];
  savedJobs: SavedJob[];
  onSaveJob: (jobId: string) => void;
  onUnsaveJob: (jobId: string) => void;
  onJobClick: (job: Job) => void;
  isLoading?: boolean;
}

type FilterTab = "all" | "top" | "new";
type SortOption = "match" | "date" | "company";
type SortDirection = "asc" | "desc";

// Move SortIcon outside component to avoid creating during render
function SortIcon({ 
  column, 
  sortBy, 
  sortDirection 
}: { 
  column: SortOption; 
  sortBy: SortOption; 
  sortDirection: SortDirection;
}) {
  if (sortBy !== column) return null;
  return sortDirection === "desc" ? (
    <ChevronDown className="w-4 h-4 ml-1" />
  ) : (
    <ChevronUp className="w-4 h-4 ml-1" />
  );
}

export function JobFeed({
  jobs,
  savedJobs,
  onSaveJob,
  onUnsaveJob,
  onJobClick,
  isLoading,
}: JobFeedProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [sortBy, setSortBy] = useState<SortOption>("match");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Calculate stats
  const stats = useMemo(() => {
    const totalJobs = jobs.length;
    const strongMatches = jobs.filter((j) => j.matchScore >= 80).length;
    const newToday = jobs.filter(
      (j) => j.postedDate && isNewJob(j.postedDate)
    ).length;

    return { totalJobs, strongMatches, newToday };
  }, [jobs]);

  // Filter and sort jobs
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          job.company.toLowerCase().includes(query) ||
          job.description.toLowerCase().includes(query)
      );
    }

    // Tab filter
    if (filterTab === "top") {
      result = result.filter((j) => j.matchScore >= 80);
    } else if (filterTab === "new") {
      result = result.filter((j) => j.postedDate && isNewJob(j.postedDate));
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "match":
          comparison = a.matchScore - b.matchScore;
          break;
        case "date":
          comparison = new Date(a.postedDate).getTime() - new Date(b.postedDate).getTime();
          break;
        case "company":
          comparison = a.company.localeCompare(b.company);
          break;
      }
      return sortDirection === "desc" ? -comparison : comparison;
    });

    return result;
  }, [jobs, searchQuery, filterTab, sortBy, sortDirection]);

  const getSavedJob = (jobId: string) =>
    savedJobs.find((sj) => sj.jobId === jobId);

  const handleSort = (column: SortOption) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortBy(column);
      setSortDirection("desc");
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return "text-match-excellent bg-match-excellent/10";
    if (score >= 50) return "text-match-good bg-match-good/10";
    return "text-match-poor bg-match-poor/10";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-16" />
        </div>
        <div className="border rounded-lg">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 p-4 border-b last:border-b-0">
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-5 w-1/6" />
              <Skeleton className="h-5 w-1/6" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="py-16 text-center">
        <Briefcase className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No jobs yet</h3>
        <p className="text-muted-foreground text-sm">
          Click &quot;Find Jobs&quot; to search across job boards.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <button
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
                filterTab === "all"
                  ? "bg-deep-teal text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              onClick={() => setFilterTab("all")}
            >
              All
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded",
                filterTab === "all" ? "bg-white/20" : "bg-muted"
              )}>
                {stats.totalJobs}
              </span>
            </button>
            <button
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
                filterTab === "top"
                  ? "bg-deep-teal text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              onClick={() => setFilterTab("top")}
            >
              Top Matches
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded",
                filterTab === "top" ? "bg-white/20" : "bg-muted"
              )}>
                {stats.strongMatches}
              </span>
            </button>
            <button
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
                filterTab === "new"
                  ? "bg-deep-teal text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              onClick={() => setFilterTab("new")}
            >
              New
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded",
                filterTab === "new" ? "bg-white/20" : "bg-muted"
              )}>
                {stats.newToday}
              </span>
            </button>
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          {filteredJobs.length} {filteredJobs.length === 1 ? "job" : "jobs"}
        </p>
      </div>

      {/* Jobs table */}
      {filteredJobs.length === 0 ? (
        <div className="py-12 text-center border rounded-lg">
          <p className="text-muted-foreground">
            {searchQuery
              ? "No jobs match your search"
              : "No jobs match your filters"}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[40%]">Job</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("company")}
                >
                  <div className="flex items-center">
                    Company
                    <SortIcon column="company" sortBy={sortBy} sortDirection={sortDirection} />
                  </div>
                </TableHead>
                <TableHead>Location</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("match")}
                >
                  <div className="flex items-center">
                    Match
                    <SortIcon column="match" sortBy={sortBy} sortDirection={sortDirection} />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("date")}
                >
                  <div className="flex items-center">
                    Posted
                    <SortIcon column="date" sortBy={sortBy} sortDirection={sortDirection} />
                  </div>
                </TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.map((job) => {
                const saved = getSavedJob(job.id);
                const isNew = job.postedDate && isNewJob(job.postedDate);

                return (
                  <TableRow
                    key={job.id}
                    className="cursor-pointer"
                    onClick={() => onJobClick(job)}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{job.title}</span>
                          {isNew && (
                            <Badge variant="secondary" className="text-xs bg-match-excellent/10 text-match-excellent">
                              New
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {job.sourceBoard}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate max-w-[150px]">{job.company}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {job.remoteStatus === "remote" ? (
                          <>
                            <Wifi className="w-4 h-4 text-match-excellent flex-shrink-0" />
                            <span className="text-match-excellent">Remote</span>
                          </>
                        ) : (
                          <>
                            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate max-w-[120px]">{job.location}</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn("font-semibold", getMatchScoreColor(job.matchScore))}
                      >
                        {job.matchScore}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {job.postedDate ? formatRelativeDate(job.postedDate) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            if (saved) {
                              onUnsaveJob(saved.id);
                            } else {
                              onSaveJob(job.id);
                            }
                          }}
                        >
                          {saved ? (
                            <BookmarkCheck className="w-4 h-4 text-burnt-orange" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(job.fullUrl, "_blank")}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
