/**
 * Core TypeScript types for the Job Hunter application
 */

// User Profile - parsed from resume
export interface UserProfile {
  fullName: string;
  email: string;
  phone?: string;
  location: string;
  currentTitle: string;
  yearsExperience: number;
  skills: string[];
  industries: string[];
  education: string;
  preferredTitles: string[];
  seniorityLevel: "entry" | "mid" | "senior" | "lead" | "executive";
  summary: string;
  createdAt: string;
  updatedAt: string;
}

// Resume storage
export interface Resume {
  rawText: string;
  parsedData: Partial<UserProfile>;
  fileName?: string;
  uploadedAt: string;
}

// Search configuration
export interface SearchConfig {
  locations: string[];
  radiusMiles: number;
  jobTypes: JobType[];
  remotePreference: RemotePreference;
  salaryMinimum?: number;
  mustHaveKeywords: string[];
  excludeKeywords: string[];
  scanFrequency: "manual" | "daily" | "weekly";
  isActive: boolean;
  lastScanAt?: string;
  jobSearchPrompt?: string; // User's description of what jobs they're looking for
}

export type JobType = "full-time" | "part-time" | "contract" | "internship";
export type RemotePreference = "any" | "remote-only" | "hybrid-ok" | "onsite-only";

// Job listing
export interface Job {
  id: string;
  externalId?: string;
  title: string;
  company: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryRange?: string;
  jobType?: JobType;
  remoteStatus?: "remote" | "hybrid" | "onsite";
  description: string;
  requirements?: string[];
  fullUrl: string;
  sourceBoard: string;
  postedDate: string;

  // AI-generated matching data
  matchScore: number;
  matchExplanation: string;
  keyStrengths?: string[];
  potentialConcerns?: string[];
  isReach?: boolean;
  isPerfectFit?: boolean;

  // Tracking
  firstSeenAt: string;
  hash: string;
}

// Saved job with application tracking
export interface SavedJob {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  appliedDate?: string;
  notes?: string;
  followUpDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type ApplicationStatus = "saved" | "applied" | "interview" | "offer" | "rejected";

// Cover letter
export interface CoverLetter {
  id: string;
  jobId: string;
  content: string;
  createdAt: string;
}

// Scan history
export interface ScanHistory {
  id: string;
  scanDate: string;
  totalJobsFound: number;
  newJobsCount: number;
  strongMatchesCount: number;
  status: "running" | "completed" | "failed";
  boardsScanned?: string[];
}

// Job board configuration
export interface JobBoard {
  name: string;
  baseUrl: string;
  icon?: string;
  supportsRemote?: boolean;
  requiresStealth?: boolean;
}

// Job board scraping status
export interface JobBoardScan {
  board: string;
  searchUrl: string;
  status: "pending" | "searching" | "extracting" | "complete" | "error";
  steps: string[];
  jobsFound: number;
  error?: string;
  streamingUrl?: string;
}

// AI-generated search URLs
export interface GeneratedSearchUrl {
  boardName: string;
  searchUrl: string;
}

// localStorage keys
export const STORAGE_KEYS = {
  PROFILE: "jobhunter_profile",
  RESUME: "jobhunter_resume",
  SEARCH_CONFIG: "jobhunter_search_config",
  JOBS: "jobhunter_jobs",
  SAVED_JOBS: "jobhunter_saved_jobs",
  COVER_LETTERS: "jobhunter_cover_letters",
  SCAN_HISTORY: "jobhunter_scan_history",
} as const;

// Default values
export const DEFAULT_PROFILE: UserProfile = {
  fullName: "",
  email: "",
  location: "",
  currentTitle: "",
  yearsExperience: 0,
  skills: [],
  industries: [],
  education: "",
  preferredTitles: [],
  seniorityLevel: "mid",
  summary: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  locations: [],
  radiusMiles: 50,
  jobTypes: ["full-time"],
  remotePreference: "any",
  mustHaveKeywords: [],
  excludeKeywords: [],
  scanFrequency: "manual",
  isActive: true,
  jobSearchPrompt: "",
};

// Application status colors and labels
export const APPLICATION_STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; color: string; bgColor: string }
> = {
  saved: {
    label: "Saved",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
  applied: {
    label: "Applied",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  interview: {
    label: "Interview",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  offer: {
    label: "Offer",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  rejected: {
    label: "Rejected",
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
};
