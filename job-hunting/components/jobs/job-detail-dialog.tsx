"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  Building2,
  Clock,
  DollarSign,
  Wifi,
  ExternalLink,
  FileText,
  Copy,
  Check,
  Loader2,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatRelativeDate } from "@/lib/utils";
import type { Job, SavedJob, UserProfile, ApplicationStatus } from "@/lib/types";
import { APPLICATION_STATUS_CONFIG } from "@/lib/types";
import { generateCoverLetter } from "@/lib/ai/client";

interface JobDetailDialogProps {
  job: Job | null;
  savedJob?: SavedJob;
  profile: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (status?: ApplicationStatus) => void;
  onUpdateStatus: (status: ApplicationStatus) => void;
}

export function JobDetailDialog({
  job,
  savedJob,
  profile,
  open,
  onOpenChange,
  onSave,
  onUpdateStatus,
}: JobDetailDialogProps) {
  const [coverLetter, setCoverLetter] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);

  if (!job) return null;

  const handleGenerateCoverLetter = async () => {
    if (!profile) return;

    setIsGenerating(true);
    setShowCoverLetter(true);
    setCoverLetter("");

    try {
      const letter = await generateCoverLetter(job, profile);
      setCoverLetter(letter);
    } catch (error) {
      setCoverLetter("Failed to generate cover letter. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return "text-match-excellent";
    if (score >= 50) return "text-match-good";
    return "text-match-poor";
  };

  const getMatchScoreBg = (score: number) => {
    if (score >= 80) return "bg-match-excellent/10";
    if (score >= 50) return "bg-match-good/10";
    return "bg-match-poor/10";
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-background"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background border-b">
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Jobs
              </Button>

              <div className="flex items-center gap-3">
                {savedJob ? (
                  <Select
                    value={savedJob.status}
                    onValueChange={(v) => onUpdateStatus(v as ApplicationStatus)}
                  >
                    <SelectTrigger className="w-[140px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(APPLICATION_STATUS_CONFIG).map(
                        ([key, { label }]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSave("saved")}
                  >
                    <Bookmark className="w-4 h-4 mr-2" />
                    Save Job
                  </Button>
                )}

                <Button
                  size="sm"
                  className="bg-burnt-orange hover:bg-burnt-orange/90"
                  onClick={() => window.open(job.fullUrl, "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Apply
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="h-[calc(100vh-73px)]">
            <div className="max-w-6xl mx-auto px-6 py-8">
              {/* Title section */}
              <div className="flex items-start justify-between gap-8 mb-8">
                <div className="space-y-3 flex-1">
                  <h1 className="text-3xl font-semibold tracking-tight">
                    {job.title}
                  </h1>
                  <div className="flex items-center gap-2 text-lg text-muted-foreground">
                    <Building2 className="w-5 h-5" />
                    <span>{job.company}</span>
                  </div>

                  {/* Meta info */}
                  <div className="flex flex-wrap gap-4 text-sm pt-2">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      {job.location}
                    </span>
                    {job.remoteStatus && (
                      <Badge
                        variant={job.remoteStatus === "remote" ? "default" : "secondary"}
                        className={job.remoteStatus === "remote" ? "bg-match-excellent" : ""}
                      >
                        <Wifi className="w-3 h-3 mr-1" />
                        {job.remoteStatus === "remote"
                          ? "Remote"
                          : job.remoteStatus === "hybrid"
                          ? "Hybrid"
                          : "On-site"}
                      </Badge>
                    )}
                    {job.salaryRange && (
                      <span className="inline-flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        {job.salaryRange}
                      </span>
                    )}
                    {job.postedDate && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        Posted {formatRelativeDate(job.postedDate)}
                      </span>
                    )}
                    <Badge variant="outline">{job.sourceBoard}</Badge>
                  </div>
                </div>

                {/* Match score */}
                <div className={cn(
                  "flex-shrink-0 p-6 rounded-xl text-center",
                  getMatchScoreBg(job.matchScore)
                )}>
                  <div className={cn("text-5xl font-bold", getMatchScoreColor(job.matchScore))}>
                    {job.matchScore}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Match Score</p>
                </div>
              </div>

              {/* Two column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Job details (2 cols) */}
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <h2 className="text-lg font-medium mb-4">About this role</h2>
                    <div className="prose prose-sm max-w-none text-muted-foreground">
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {job.description || "No description available."}
                      </p>
                    </div>
                  </div>

                  {job.requirements && job.requirements.length > 0 && (
                    <div>
                      <h2 className="text-lg font-medium mb-4">Requirements</h2>
                      <ul className="space-y-2">
                        {job.requirements.map((req, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground flex items-start gap-3"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-burnt-orange mt-2 flex-shrink-0" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Cover Letter Section */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-medium flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Cover Letter
                      </h2>
                      {!showCoverLetter ? (
                        <Button
                          onClick={handleGenerateCoverLetter}
                          disabled={!profile || isGenerating}
                          className="bg-burnt-orange hover:bg-burnt-orange/90"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate with AI
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopy}
                            disabled={!coverLetter || isGenerating}
                          >
                            {copied ? (
                              <>
                                <Check className="w-4 h-4 mr-2" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 mr-2" />
                                Copy
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleGenerateCoverLetter}
                            disabled={isGenerating}
                          >
                            Regenerate
                          </Button>
                        </div>
                      )}
                    </div>

                    {!showCoverLetter ? (
                      <div className="p-8 rounded-xl bg-muted/30 border border-dashed text-center">
                        <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">
                          Generate a personalized cover letter tailored to this role and your experience.
                        </p>
                      </div>
                    ) : isGenerating ? (
                      <div className="p-12 rounded-xl bg-muted/30 border flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 text-burnt-orange animate-spin mb-4" />
                        <p className="text-muted-foreground">Generating your cover letter...</p>
                      </div>
                    ) : (
                      <Textarea
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        className="min-h-[400px] font-mono text-sm leading-relaxed"
                        placeholder="Your cover letter will appear here..."
                      />
                    )}
                  </div>
                </div>

                {/* Right: Match analysis (1 col) */}
                <div className="space-y-6">
                  {/* Match explanation */}
                  <div className="p-5 rounded-xl bg-muted/50">
                    <h3 className="font-medium mb-3">Why this matches</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {job.matchExplanation || "Analyzing..."}
                    </p>
                  </div>

                  {/* Profile comparison */}
                  {profile && (
                    <div className="p-5 rounded-xl border">
                      <h3 className="font-medium mb-4">Your Profile Match</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Skills Match</span>
                            <span className="font-medium">{Math.min(100, Math.round(job.matchScore * 1.1))}%</span>
                          </div>
                          <Progress value={Math.min(100, job.matchScore * 1.1)} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Experience Level</span>
                            <span className="font-medium">{Math.min(100, Math.round(job.matchScore * 0.95))}%</span>
                          </div>
                          <Progress value={Math.min(100, job.matchScore * 0.95)} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Title Alignment</span>
                            <span className="font-medium">{Math.min(100, Math.round(job.matchScore * 1.05))}%</span>
                          </div>
                          <Progress value={Math.min(100, job.matchScore * 1.05)} className="h-2" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Strengths */}
                  {job.keyStrengths && job.keyStrengths.length > 0 && (
                    <div className="p-5 rounded-xl bg-match-excellent/5 border border-match-excellent/20">
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-match-excellent" />
                        Your Strengths
                      </h3>
                      <ul className="space-y-2">
                        {job.keyStrengths.map((strength, i) => (
                          <li
                            key={i}
                            className="text-sm text-match-excellent flex items-start gap-2"
                          >
                            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Concerns */}
                  {job.potentialConcerns && job.potentialConcerns.length > 0 && (
                    <div className="p-5 rounded-xl bg-match-good/5 border border-match-good/20">
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-match-good" />
                        Areas to Address
                      </h3>
                      <ul className="space-y-2">
                        {job.potentialConcerns.map((concern, i) => (
                          <li
                            key={i}
                            className="text-sm text-match-good flex items-start gap-2"
                          >
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            {concern}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
