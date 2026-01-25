"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

/**
 * Custom hook for reactive localStorage management
 * Syncs state with localStorage and handles SSR
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, boolean] {
  // Track if we're on the client - derive from window instead of useEffect
  const isClient = useMemo(() => typeof window !== "undefined", []);

  // Initialize state with lazy function to read from localStorage
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        return JSON.parse(item);
      }
    } catch (error) {
      // Error loading from localStorage
    }
    return initialValue;
  });

  // Update localStorage when state changes
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Allow value to be a function for updates based on previous value
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        setStoredValue(valueToStore);

        // Only write to localStorage on client
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));

          // Dispatch custom event for cross-tab sync
          window.dispatchEvent(
            new StorageEvent("storage", {
              key,
              newValue: JSON.stringify(valueToStore),
            })
          );
        }
      } catch (error) {
        // Error saving to localStorage
      }
    },
    [key, storedValue]
  );

  // Listen for changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch {
          // Error parsing storage event
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key]);

  return [storedValue, setValue, isClient];
}

/**
 * Hook for managing user profile
 */
export function useProfile() {
  const [profile, setProfile, isClient] = useLocalStorage<import("../types").UserProfile | null>(
    "jobhunter_profile",
    null
  );

  const updateProfile = useCallback(
    (updates: Partial<import("../types").UserProfile>) => {
      setProfile((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [setProfile]
  );

  const clearProfile = useCallback(() => {
    setProfile(null);
  }, [setProfile]);

  return { profile, setProfile, updateProfile, clearProfile, isClient };
}

/**
 * Hook for managing resume data
 */
export function useResume() {
  const [resume, setResume, isClient] = useLocalStorage<import("../types").Resume | null>(
    "jobhunter_resume",
    null
  );

  return { resume, setResume, isClient };
}

/**
 * Hook for managing search configuration
 */
export function useSearchConfig() {
  const [config, setConfig, isClient] = useLocalStorage<import("../types").SearchConfig>(
    "jobhunter_search_config",
    {
      locations: [],
      radiusMiles: 50,
      jobTypes: ["full-time"],
      remotePreference: "any",
      mustHaveKeywords: [],
      excludeKeywords: [],
      scanFrequency: "manual",
      isActive: true,
    }
  );

  const updateConfig = useCallback(
    (updates: Partial<import("../types").SearchConfig>) => {
      setConfig((prev) => ({
        ...prev,
        ...updates,
      }));
    },
    [setConfig]
  );

  return { config, setConfig, updateConfig, isClient };
}

/**
 * Hook for managing jobs
 */
export function useJobs() {
  const [jobs, setJobs, isClient] = useLocalStorage<import("../types").Job[]>(
    "jobhunter_jobs",
    []
  );

  const addJobs = useCallback(
    (newJobs: import("../types").Job[]) => {
      setJobs((prev) => {
        // Create a map of existing jobs by hash for deduplication
        const existingHashes = new Set(prev.map((j) => j.hash));
        const uniqueNewJobs = newJobs.filter((j) => !existingHashes.has(j.hash));
        return [...prev, ...uniqueNewJobs];
      });
    },
    [setJobs]
  );

  const updateJob = useCallback(
    (jobId: string, updates: Partial<import("../types").Job>) => {
      setJobs((prev) =>
        prev.map((job) => (job.id === jobId ? { ...job, ...updates } : job))
      );
    },
    [setJobs]
  );

  const clearJobs = useCallback(() => {
    setJobs([]);
  }, [setJobs]);

  return { jobs, setJobs, addJobs, updateJob, clearJobs, isClient };
}

/**
 * Hook for managing saved jobs (applications)
 */
export function useSavedJobs() {
  const [savedJobs, setSavedJobs, isClient] = useLocalStorage<import("../types").SavedJob[]>(
    "jobhunter_saved_jobs",
    []
  );

  const saveJob = useCallback(
    (jobId: string, status: import("../types").ApplicationStatus = "saved") => {
      setSavedJobs((prev) => {
        // Check if already saved
        if (prev.some((sj) => sj.jobId === jobId)) {
          return prev;
        }
        const newSavedJob: import("../types").SavedJob = {
          id: `saved-${Date.now()}`,
          jobId,
          status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return [...prev, newSavedJob];
      });
    },
    [setSavedJobs]
  );

  const updateSavedJob = useCallback(
    (savedJobId: string, updates: Partial<import("../types").SavedJob>) => {
      setSavedJobs((prev) =>
        prev.map((sj) =>
          sj.id === savedJobId
            ? { ...sj, ...updates, updatedAt: new Date().toISOString() }
            : sj
        )
      );
    },
    [setSavedJobs]
  );

  const removeSavedJob = useCallback(
    (savedJobId: string) => {
      setSavedJobs((prev) => prev.filter((sj) => sj.id !== savedJobId));
    },
    [setSavedJobs]
  );

  const updateStatus = useCallback(
    (jobId: string, status: import("../types").ApplicationStatus) => {
      setSavedJobs((prev) =>
        prev.map((sj) =>
          sj.jobId === jobId
            ? {
                ...sj,
                status,
                appliedDate:
                  status === "applied" && !sj.appliedDate
                    ? new Date().toISOString()
                    : sj.appliedDate,
                updatedAt: new Date().toISOString(),
              }
            : sj
        )
      );
    },
    [setSavedJobs]
  );

  return {
    savedJobs,
    setSavedJobs,
    saveJob,
    updateSavedJob,
    removeSavedJob,
    updateStatus,
    isClient,
  };
}

/**
 * Hook for managing cover letters
 */
export function useCoverLetters() {
  const [coverLetters, setCoverLetters, isClient] = useLocalStorage<import("../types").CoverLetter[]>(
    "jobhunter_cover_letters",
    []
  );

  const addCoverLetter = useCallback(
    (jobId: string, content: string) => {
      const newLetter: import("../types").CoverLetter = {
        id: `letter-${Date.now()}`,
        jobId,
        content,
        createdAt: new Date().toISOString(),
      };
      setCoverLetters((prev) => [...prev, newLetter]);
      return newLetter;
    },
    [setCoverLetters]
  );

  const getCoverLetterForJob = useCallback(
    (jobId: string) => {
      return coverLetters.find((cl) => cl.jobId === jobId);
    },
    [coverLetters]
  );

  return { coverLetters, setCoverLetters, addCoverLetter, getCoverLetterForJob, isClient };
}

/**
 * Hook for managing scan history
 */
export function useScanHistory() {
  const [history, setHistory, isClient] = useLocalStorage<import("../types").ScanHistory[]>(
    "jobhunter_scan_history",
    []
  );

  const addScan = useCallback(
    (scan: Omit<import("../types").ScanHistory, "id">) => {
      const newScan: import("../types").ScanHistory = {
        ...scan,
        id: `scan-${Date.now()}`,
      };
      setHistory((prev) => [newScan, ...prev].slice(0, 50)); // Keep last 50 scans
      return newScan;
    },
    [setHistory]
  );

  const updateScan = useCallback(
    (scanId: string, updates: Partial<import("../types").ScanHistory>) => {
      setHistory((prev) =>
        prev.map((s) => (s.id === scanId ? { ...s, ...updates } : s))
      );
    },
    [setHistory]
  );

  return { history, setHistory, addScan, updateScan, isClient };
}

/**
 * Hook to clear all data
 */
export function useClearAllData() {
  const clearAll = useCallback(() => {
    if (typeof window !== "undefined") {
      const keys = [
        "jobhunter_profile",
        "jobhunter_resume",
        "jobhunter_search_config",
        "jobhunter_jobs",
        "jobhunter_saved_jobs",
        "jobhunter_cover_letters",
        "jobhunter_scan_history",
      ];
      keys.forEach((key) => window.localStorage.removeItem(key));
      window.location.reload();
    }
  }, []);

  return { clearAll };
}

/**
 * Export all data as JSON
 */
export function exportData(): string {
  if (typeof window === "undefined") return "{}";

  const data = {
    profile: JSON.parse(window.localStorage.getItem("jobhunter_profile") || "null"),
    resume: JSON.parse(window.localStorage.getItem("jobhunter_resume") || "null"),
    searchConfig: JSON.parse(
      window.localStorage.getItem("jobhunter_search_config") || "null"
    ),
    jobs: JSON.parse(window.localStorage.getItem("jobhunter_jobs") || "[]"),
    savedJobs: JSON.parse(window.localStorage.getItem("jobhunter_saved_jobs") || "[]"),
    coverLetters: JSON.parse(
      window.localStorage.getItem("jobhunter_cover_letters") || "[]"
    ),
    scanHistory: JSON.parse(
      window.localStorage.getItem("jobhunter_scan_history") || "[]"
    ),
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Import data from JSON
 */
export function importData(jsonString: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    const data = JSON.parse(jsonString);

    if (data.profile) {
      window.localStorage.setItem("jobhunter_profile", JSON.stringify(data.profile));
    }
    if (data.resume) {
      window.localStorage.setItem("jobhunter_resume", JSON.stringify(data.resume));
    }
    if (data.searchConfig) {
      window.localStorage.setItem(
        "jobhunter_search_config",
        JSON.stringify(data.searchConfig)
      );
    }
    if (data.jobs) {
      window.localStorage.setItem("jobhunter_jobs", JSON.stringify(data.jobs));
    }
    if (data.savedJobs) {
      window.localStorage.setItem(
        "jobhunter_saved_jobs",
        JSON.stringify(data.savedJobs)
      );
    }
    if (data.coverLetters) {
      window.localStorage.setItem(
        "jobhunter_cover_letters",
        JSON.stringify(data.coverLetters)
      );
    }
    if (data.scanHistory) {
      window.localStorage.setItem(
        "jobhunter_scan_history",
        JSON.stringify(data.scanHistory)
      );
    }

    return true;
  } catch (error) {
    return false;
  }
}
