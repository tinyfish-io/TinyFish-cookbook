"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Briefcase,
  Kanban,
  Settings,
  Search,
  Moon,
  Sun,
  Bot,
  ExternalLink,
  Check,
  X,
  Loader2,
  Eye,
  StopCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { JobFeed } from "./jobs/job-feed";
import { JobDetailDialog } from "./jobs/job-detail-dialog";
import { JobTrackerKanban } from "./jobs/job-tracker-kanban";
import { SettingsPanel } from "./settings/settings-panel";
import { CommandMenu } from "./command-menu";
import {
  useProfile,
  useJobs,
  useSavedJobs,
  useSearchConfig,
  useScanHistory,
} from "@/lib/hooks/use-local-storage";
import {
  generateSearchUrls,
  batchAnalyzeJobs,
  quickMatchEstimate,
  generateQuickExplanation,
} from "@/lib/ai/client";
import { scrapeMultipleBoards, parseScrapedJobs, type BoardUpdate } from "@/lib/mino-client";
import { generateId, createJobHash, cn } from "@/lib/utils";
import type { Job, ApplicationStatus, GeneratedSearchUrl, JobBoardScan } from "@/lib/types";

export function Dashboard() {
  const { theme, setTheme } = useTheme();
  const { profile, updateProfile } = useProfile();
  const { jobs, addJobs, clearJobs } = useJobs();
  const { savedJobs, saveJob, updateSavedJob, removeSavedJob, updateStatus } =
    useSavedJobs();
  const { config: searchConfig, updateConfig: updateSearchConfig } =
    useSearchConfig();
  const { history, addScan, updateScan } = useScanHistory();

  const [activeTab, setActiveTab] = useState("feed");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [searchPrompt, setSearchPrompt] = useState("");

  // Agent tab state
  const [boardScans, setBoardScans] = useState<Map<string, JobBoardScan>>(new Map());
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [currentStreamingUrl, setCurrentStreamingUrl] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Listen for keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandMenuOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Process completed board results immediately
  const processCompletedBoard = useCallback((boardName: string, rawJobs: unknown[]) => {
    if (!Array.isArray(rawJobs) || rawJobs.length === 0) {
      return;
    }

    const parsed = parseScrapedJobs(rawJobs, boardName);
    if (parsed.length === 0) {
      return;
    }

    // Create Job objects with quick estimates
    const newJobs: Job[] = parsed.map((scraped) => {
      const hash = createJobHash(scraped.company, scraped.title, scraped.location);
      const quickScore = profile
        ? quickMatchEstimate(scraped as Partial<Job>, profile)
        : 50;
      const quickExplanation = profile
        ? generateQuickExplanation(scraped as Partial<Job>, profile)
        : "Complete your profile for personalized match insights.";

      return {
        id: generateId(),
        title: scraped.title,
        company: scraped.company,
        location: scraped.location,
        salaryRange: scraped.salaryRange,
        remoteStatus: scraped.remoteStatus,
        description: scraped.description,
        fullUrl: scraped.fullUrl,
        postedDate: scraped.postedDate,
        sourceBoard: scraped.sourceBoard,
        matchScore: quickScore,
        matchExplanation: quickExplanation,
        hash,
        firstSeenAt: new Date().toISOString(),
      };
    });

    // Add jobs immediately (dedupe will happen on addJobs)
    addJobs(newJobs);
    toast.success(`Found ${newJobs.length} jobs from ${boardName}`);
  }, [profile, addJobs]);

  const handleFindJobsClick = () => {
    if (!profile) {
      toast.error("Please complete your profile first");
      return;
    }
    // Pre-fill with existing prompt if any
    setSearchPrompt(searchConfig.jobSearchPrompt || "");
    setShowSearchDialog(true);
  };

  const handleStartScan = async () => {
    setShowSearchDialog(false);

    // Save the search prompt to config
    if (searchPrompt !== searchConfig.jobSearchPrompt) {
      updateSearchConfig({ jobSearchPrompt: searchPrompt });
    }

    // Switch to Agent tab
    setActiveTab("agent");
    setIsScanning(true);
    setCurrentStreamingUrl(null);
    setSelectedBoard(null);
    setBoardScans(new Map());

    toast.info("Generating search queries based on your preferences...");

    try {
      // Generate search URLs using AI with the updated prompt
      const configWithPrompt = { ...searchConfig, jobSearchPrompt: searchPrompt };

      const urls = await generateSearchUrls(profile!, configWithPrompt);

      if (urls.length === 0) {
        toast.error("Failed to generate search URLs");
        setIsScanning(false);
        return;
      }

      toast.success(`Generated ${urls.length} search URLs`);

      // Initialize board scans
      const initialScans = new Map<string, JobBoardScan>();
      urls.forEach(({ boardName, searchUrl }) => {
        initialScans.set(boardName, {
          board: boardName,
          searchUrl,
          status: "pending",
          steps: [],
          jobsFound: 0,
        });
      });
      setBoardScans(initialScans);

      // Start scraping
      abortControllerRef.current = new AbortController();

      await scrapeMultipleBoards(
        urls,
        searchPrompt, // Pass the job search criteria to filter relevant jobs
        (boardName, update: BoardUpdate) => {
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
            }
            return newMap;
          });

          // Auto-select first board with streaming URL
          if (update.streamingUrl) {
            setSelectedBoard((prev) => prev || boardName);
            setCurrentStreamingUrl((prev) => prev || update.streamingUrl || null);
          }

          // Process completed results immediately when jobs are included
          if (update.status === "complete" && update.jobs && update.jobs.length > 0) {
            processCompletedBoard(boardName, update.jobs);
          }
        },
        abortControllerRef.current.signal
      );

      setIsScanning(false);
      toast.success("Scan complete!");

    } catch (error) {
      toast.error("Scanning failed");
      setIsScanning(false);
    }
  };

  const handleCancelScan = () => {
    abortControllerRef.current?.abort();
    setIsScanning(false);
    toast.info("Scan cancelled");
  };

  const handleSelectBoard = (boardName: string) => {
    setSelectedBoard(boardName);
    const scan = boardScans.get(boardName);
    if (scan?.streamingUrl) {
      setCurrentStreamingUrl(scan.streamingUrl);
    }
  };

  const handleSaveJob = useCallback(
    (jobId: string) => {
      saveJob(jobId, "saved");
      toast.success("Job saved!");
    },
    [saveJob]
  );

  const handleUnsaveJob = useCallback(
    (savedJobId: string) => {
      removeSavedJob(savedJobId);
      toast.info("Job removed from saved");
    },
    [removeSavedJob]
  );

  const handleJobClick = (job: Job) => {
    setSelectedJob(job);
    setIsDialogOpen(true);
  };

  const handleUpdateStatus = (status: ApplicationStatus) => {
    if (selectedJob) {
      updateStatus(selectedJob.id, status);
      toast.success(`Status updated to ${status}`);
    }
  };

  const getSavedJobForJob = (jobId: string) =>
    savedJobs.find((sj) => sj.jobId === jobId);

  const lastScan = history[0];
  const completedCount = Array.from(boardScans.values()).filter(
    (s) => s.status === "complete" || s.status === "error"
  ).length;
  const totalBoards = boardScans.size;
  const progressPercent = totalBoards > 0 ? Math.round((completedCount / totalBoards) * 100) : 0;

  const getStatusIcon = (status: JobBoardScan["status"]) => {
    switch (status) {
      case "pending":
        return <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />;
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
    <div className="min-h-screen bg-background">
      {/* Notion-style minimal header */}
      <header className="border-b sticky top-0 z-20 bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-burnt-orange" />
            <span className="font-medium">Job Hunter</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-8 w-8 p-0"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>

            <Button
              onClick={handleFindJobsClick}
              disabled={isScanning || !profile}
              size="sm"
              className="h-8 bg-burnt-orange hover:bg-burnt-orange/90"
            >
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Find Jobs
            </Button>
          </div>
        </div>
      </header>

      {/* Tabs at the top */}
      <div className="border-b bg-background sticky top-[53px] z-10">
        <div className="max-w-7xl mx-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-10 bg-transparent border-none p-0 gap-0">
              <TabsTrigger
                value="agent"
                className="relative h-10 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-burnt-orange data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Bot className="w-4 h-4 mr-2" />
                Agent
                {isScanning && (
                  <span className="ml-2 w-2 h-2 bg-burnt-orange rounded-full animate-pulse" />
                )}
              </TabsTrigger>
              <TabsTrigger
                value="feed"
                className="relative h-10 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-burnt-orange data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Jobs
                {jobs.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 text-xs">
                    {jobs.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="tracker"
                className="relative h-10 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-burnt-orange data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Kanban className="w-4 h-4 mr-2" />
                Tracker
                {savedJobs.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 text-xs">
                    {savedJobs.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="relative h-10 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-burnt-orange data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Agent Tab - Split view: list left, browser right */}
          <TabsContent value="agent" className="mt-0">
            {boardScans.size > 0 ? (
              <div className="space-y-4">
                {/* Progress header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {completedCount} / {totalBoards} complete
                    </span>
                    <Progress value={progressPercent} className="w-32 h-1.5" />
                  </div>
                  {isScanning && (
                    <Button variant="ghost" size="sm" onClick={handleCancelScan} className="h-8">
                      <StopCircle className="w-4 h-4 mr-1.5" />
                      Cancel
                    </Button>
                  )}
                </div>

                {/* Split layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Board list */}
                  <div className="border rounded-lg divide-y max-h-[600px] overflow-y-auto">
                    {Array.from(boardScans.values()).map((scan) => (
                      <button
                        key={scan.board}
                        onClick={() => handleSelectBoard(scan.board)}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left",
                          selectedBoard === scan.board && "bg-muted"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {getStatusIcon(scan.status)}
                          <span className="font-medium text-sm truncate">{scan.board}</span>

                          {scan.status === "complete" && (
                            <span className="text-xs text-green-600">
                              {scan.jobsFound} jobs
                            </span>
                          )}
                          {scan.status === "error" && (
                            <span className="text-xs text-red-500 truncate max-w-[150px]">
                              {scan.error || "Failed"}
                            </span>
                          )}
                          {(scan.status === "searching" || scan.status === "extracting") && (
                            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {scan.steps[scan.steps.length - 1] || "Starting..."}
                            </span>
                          )}
                        </div>

                        {scan.streamingUrl && scan.status !== "complete" && scan.status !== "error" && (
                          <Eye className="w-4 h-4 text-burnt-orange flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Right: Live browser preview */}
                  <div className="border rounded-lg overflow-hidden bg-muted min-h-[400px] lg:min-h-[600px]">
                    {currentStreamingUrl ? (
                      <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between px-3 py-2 border-b bg-background">
                          <span className="text-sm font-medium">{selectedBoard}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => window.open(currentStreamingUrl, "_blank")}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Open
                          </Button>
                        </div>
                        <iframe
                          src={currentStreamingUrl}
                          className="flex-1 w-full"
                          title="Live browser preview"
                        />
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Select a board to watch live</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary when done */}
                {!isScanning && completedCount === totalBoards && (
                  <div className="flex gap-6 text-sm text-muted-foreground pt-4 border-t">
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
            ) : (
              <div className="py-16 text-center">
                <Bot className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">AI Agents</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
                  Click &quot;Find Jobs&quot; to start searching across multiple job boards simultaneously.
                  Watch each agent work in real-time.
                </p>
                <Button
                  onClick={handleFindJobsClick}
                  disabled={isScanning || !profile}
                  className="bg-burnt-orange hover:bg-burnt-orange/90"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Start Searching
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="feed" className="mt-0">
            <JobFeed
              jobs={jobs}
              savedJobs={savedJobs}
              onSaveJob={handleSaveJob}
              onUnsaveJob={(jobId) => {
                const saved = getSavedJobForJob(jobId);
                if (saved) handleUnsaveJob(saved.id);
              }}
              onJobClick={handleJobClick}
              isLoading={false}
            />
          </TabsContent>

          <TabsContent value="tracker" className="mt-0">
            <JobTrackerKanban
              jobs={jobs}
              savedJobs={savedJobs}
              onUpdateStatus={(savedJobId, status) => {
                const saved = savedJobs.find((sj) => sj.id === savedJobId);
                if (saved) {
                  updateSavedJob(savedJobId, { status });
                  toast.success(`Moved to ${status}`);
                }
              }}
              onJobClick={handleJobClick}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <SettingsPanel
              profile={profile}
              searchConfig={searchConfig}
              onUpdateProfile={updateProfile}
              onUpdateSearchConfig={updateSearchConfig}
              onRescan={handleStartScan}
              lastScanAt={lastScan?.scanDate}
              isScanning={isScanning}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Job detail dialog */}
      <JobDetailDialog
        job={selectedJob}
        savedJob={selectedJob ? getSavedJobForJob(selectedJob.id) : undefined}
        profile={profile}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={(status) => {
          if (selectedJob) {
            saveJob(selectedJob.id, status || "saved");
            toast.success("Job saved!");
          }
        }}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* Command menu */}
      <CommandMenu
        open={commandMenuOpen}
        onOpenChange={setCommandMenuOpen}
        onFindJobs={handleFindJobsClick}
        onGoToTab={setActiveTab}
        jobs={jobs}
        onJobClick={handleJobClick}
      />

      {/* Search prompt dialog */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>What jobs are you looking for?</DialogTitle>
            <DialogDescription>
              Describe the type of jobs you want to find. Be specific about roles, industries, technologies, or preferences.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g., Senior software engineering roles at tech companies. Remote positions working with React, TypeScript, and Node.js. Open to startups with good work-life balance."
            value={searchPrompt}
            onChange={(e) => setSearchPrompt(e.target.value)}
            className="min-h-[120px] resize-none"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSearchDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStartScan}
              disabled={!searchPrompt.trim()}
              className="bg-burnt-orange hover:bg-burnt-orange/90"
            >
              <Search className="w-4 h-4 mr-2" />
              Search Jobs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
