import type { GeneratedSkill, Settings } from "@/types";
import { STORAGE_KEYS, DEFAULT_SETTINGS } from "@/types";

const MAX_SKILLS = 50;
const MAX_HISTORY = 100;

/**
 * Get all saved skills from localStorage
 */
export function getSkills(): GeneratedSkill[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(STORAGE_KEYS.SKILLS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save a skill to localStorage
 */
export function saveSkill(skill: GeneratedSkill): void {
  if (typeof window === "undefined") return;

  try {
    const skills = getSkills();

    // Check if skill with same topic exists and update it
    const existingIndex = skills.findIndex(
      (s) => s.topic.toLowerCase() === skill.topic.toLowerCase()
    );

    if (existingIndex !== -1) {
      skills[existingIndex] = skill;
    } else {
      skills.unshift(skill);
    }

    // Limit to MAX_SKILLS
    const trimmed = skills.slice(0, MAX_SKILLS);

    localStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(trimmed));
  } catch (error) {
    console.error("Failed to save skill:", error);
  }
}

/**
 * Delete a skill from localStorage
 */
export function deleteSkill(skillId: string): void {
  if (typeof window === "undefined") return;

  try {
    const skills = getSkills().filter((s) => s.id !== skillId);
    localStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(skills));
  } catch (error) {
    console.error("Failed to delete skill:", error);
  }
}

/**
 * Get a single skill by ID
 */
export function getSkill(skillId: string): GeneratedSkill | null {
  const skills = getSkills();
  return skills.find((s) => s.id === skillId) || null;
}

/**
 * History entry for generation attempts
 */
export interface HistoryEntry {
  id: string;
  topic: string;
  timestamp: string;
  success: boolean;
  sourceCount: number;
  duration: number;
}

/**
 * Get generation history
 */
export function getHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Add entry to generation history
 */
export function addToHistory(entry: HistoryEntry): void {
  if (typeof window === "undefined") return;

  try {
    const history = getHistory();
    history.unshift(entry);

    // Limit to MAX_HISTORY
    const trimmed = history.slice(0, MAX_HISTORY);

    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmed));
  } catch (error) {
    console.error("Failed to add to history:", error);
  }
}

/**
 * Clear generation history
 */
export function clearHistory(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([]));
  } catch (error) {
    console.error("Failed to clear history:", error);
  }
}

/**
 * Get user settings
 */
export function getSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) return DEFAULT_SETTINGS;

    const stored = JSON.parse(data);
    // Merge with defaults to handle new settings
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save user settings
 */
export function saveSettings(settings: Partial<Settings>): void {
  if (typeof window === "undefined") return;

  try {
    const current = getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}

/**
 * Clear all localStorage data
 */
export function clearAllData(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEYS.SKILLS);
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  } catch (error) {
    console.error("Failed to clear data:", error);
  }
}

/**
 * Export all skills as JSON string
 */
export function exportSkills(): string {
  const skills = getSkills();
  return JSON.stringify(skills, null, 2);
}

/**
 * Import skills from JSON string
 */
export function importSkills(json: string): number {
  if (typeof window === "undefined") return 0;

  try {
    const imported = JSON.parse(json) as GeneratedSkill[];
    const current = getSkills();

    // Merge, deduplicating by topic
    const topics = new Set(current.map((s) => s.topic.toLowerCase()));
    const newSkills = imported.filter(
      (s) => !topics.has(s.topic.toLowerCase())
    );

    const merged = [...newSkills, ...current].slice(0, MAX_SKILLS);
    localStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(merged));

    return newSkills.length;
  } catch (error) {
    console.error("Failed to import skills:", error);
    throw new Error("Invalid JSON format");
  }
}
