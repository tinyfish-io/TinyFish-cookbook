"use client";

/**
 * Client-side API calls to server-side AI routes
 * API keys are kept secure on the server
 */

import type { UserProfile, SearchConfig, Job, GeneratedSearchUrl } from "../types";

export interface ParsedResume {
  fullName: string;
  email: string;
  phone: string | null;
  location: string;
  currentTitle: string;
  yearsExperience: number;
  skills: string[];
  industries: string[];
  education: string;
  preferredTitles: string[];
  seniorityLevel: "entry" | "mid" | "senior" | "lead" | "executive";
  summary: string;
}

export interface JobMatchResult {
  matchScore: number;
  matchExplanation: string;
  keyStrengths: string[];
  potentialConcerns: string[];
  isReach: boolean;
  isPerfectFit: boolean;
}

/**
 * Parse resume text using AI
 */
export async function parseResume(resumeText: string): Promise<ParsedResume> {
  const response = await fetch("/api/ai/parse-resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeText }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to parse resume");
  }

  const { data } = await response.json();
  return data;
}

/**
 * Generate job board search URLs
 */
export async function generateSearchUrls(
  profile: UserProfile,
  searchConfig: SearchConfig
): Promise<GeneratedSearchUrl[]> {
  const response = await fetch("/api/ai/generate-urls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile, searchConfig }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate search URLs");
  }

  const { data } = await response.json();
  return data;
}

/**
 * Analyze job match with AI
 */
export async function analyzeJobMatch(
  job: Partial<Job>,
  profile: UserProfile
): Promise<JobMatchResult> {
  const response = await fetch("/api/ai/match-jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job, profile }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to analyze job match");
  }

  const { data } = await response.json();
  return data;
}

/**
 * Generate cover letter
 */
export async function generateCoverLetter(
  job: Job,
  profile: UserProfile
): Promise<string> {
  const response = await fetch("/api/ai/cover-letter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job, profile }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate cover letter");
  }

  const { data } = await response.json();
  return data;
}

/**
 * Batch analyze multiple jobs
 */
export async function batchAnalyzeJobs(
  jobs: Partial<Job>[],
  profile: UserProfile,
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, JobMatchResult>> {
  const results = new Map<string, JobMatchResult>();

  // Process in batches of 3 to avoid overwhelming the API
  const batchSize = 3;
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);

    const batchPromises = batch.map(async (job) => {
      try {
        onProgress?.(i + 1, jobs.length);
        const result = await analyzeJobMatch(job, profile);
        return { id: job.id || `job-${i}`, result };
      } catch (error) {
        return {
          id: job.id || `job-${i}`,
          result: {
            matchScore: 0,
            matchExplanation: "Unable to analyze this job listing.",
            keyStrengths: [],
            potentialConcerns: ["Analysis failed"],
            isReach: false,
            isPerfectFit: false,
          } as JobMatchResult,
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(({ id, result }) => {
      results.set(id, result);
    });
  }

  return results;
}

/**
 * Quick match estimation without AI (for initial sorting)
 */
export function quickMatchEstimate(
  job: Partial<Job>,
  profile: UserProfile
): number {
  const { score } = calculateMatchDetails(job, profile);
  return score;
}

/**
 * Generate a quick explanation without AI
 */
export function generateQuickExplanation(
  job: Partial<Job>,
  profile: UserProfile
): string {
  const { reasons } = calculateMatchDetails(job, profile);

  if (reasons.length === 0) {
    return "This job may be worth exploring based on your background.";
  }

  return reasons.join(" ");
}

/**
 * Calculate match details (score and reasons)
 */
function calculateMatchDetails(
  job: Partial<Job>,
  profile: UserProfile
): { score: number; reasons: string[] } {
  let score = 50;
  const reasons: string[] = [];

  const titleLower = job.title?.toLowerCase() || "";
  const preferredTitlesLower = profile.preferredTitles.map((t) => t.toLowerCase());

  // Title match
  if (preferredTitlesLower.some((t) => titleLower.includes(t))) {
    score += 20;
    reasons.push(`The title aligns well with your preferred roles.`);
  } else if (titleLower.includes(profile.currentTitle.toLowerCase())) {
    score += 15;
    reasons.push(`Similar to your current title as ${profile.currentTitle}.`);
  }

  // Skills match
  const descLower = (job.description?.toLowerCase() || "") + " " + titleLower;
  const matchedSkills = profile.skills.filter((skill) =>
    descLower.includes(skill.toLowerCase())
  );
  score += Math.min(matchedSkills.length * 3, 15);

  if (matchedSkills.length > 0) {
    const skillsToShow = matchedSkills.slice(0, 3);
    reasons.push(`Matches ${matchedSkills.length} of your skills${matchedSkills.length > 3 ? ` including ${skillsToShow.join(", ")}` : `: ${skillsToShow.join(", ")}`}.`);
  }

  // Location/remote match
  if (job.remoteStatus === "remote") {
    score += 5;
    reasons.push("Offers remote work flexibility.");
  } else if (
    job.location?.toLowerCase().includes(profile.location.toLowerCase())
  ) {
    score += 10;
    reasons.push(`Located in your area (${profile.location}).`);
  }

  // Seniority match
  const seniorityKeywords: Record<string, string[]> = {
    entry: ["entry", "junior", "associate", "intern"],
    mid: ["mid", "intermediate"],
    senior: ["senior", "sr.", "sr "],
    lead: ["lead", "principal", "staff"],
    executive: ["director", "vp", "head of", "chief"],
  };

  const userSeniority = seniorityKeywords[profile.seniorityLevel] || [];
  if (userSeniority.some((kw) => titleLower.includes(kw))) {
    score += 10;
    reasons.push(`Matches your ${profile.seniorityLevel}-level experience.`);
  }

  return { score: Math.min(Math.max(score, 0), 100), reasons };
}
