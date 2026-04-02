export type AppState = "idle" | "generating" | "done" | "error";
export type WindowId = "fishposts" | "recent_memes";
export type ScreenPhase = "booting" | "login" | "desktop";

export interface ProgressEvent {
  type: "progress" | "done" | "error";
  message?: string;
  percent?: number;
  memeUrl?: string;
  pageUrl?: string;
  textContent?: string[];
  textTitle?: string;
  mode?: string;
  error?: string;
}

export interface WindowState {
  x: number;
  y: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  preMaxPos?: { x: number; y: number };
}
