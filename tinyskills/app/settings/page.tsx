"use client";

import { useEffect, useState } from "react";
import {
  getSettings,
  saveSettings,
  clearAllData,
  exportSkills,
  importSkills,
} from "@/lib/storage";
import type { Settings, SourceType } from "@/types";
import { DEFAULT_SETTINGS, SOURCE_CONFIG } from "@/types";
import {
  History,
  Settings as SettingsIcon,
  ArrowLeft,
  Download,
  Upload,
  Trash2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  const updateSetting = <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveSettings(settings);
    setHasChanges(false);
    toast.success("Settings saved");
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    setHasChanges(false);
    toast.success("Settings reset to defaults");
  };

  const handleExport = () => {
    const json = exportSkills();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "skillforge-export.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Skills exported");
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const count = importSkills(text);
        toast.success(`Imported ${count} new skills`);
      } catch {
        toast.error("Failed to import - invalid file format");
      }
    };
    input.click();
  };

  const handleClearAll = () => {
    if (
      confirm(
        "Are you sure you want to clear all data? This cannot be undone."
      )
    ) {
      clearAllData();
      setSettings(DEFAULT_SETTINGS);
      toast.success("All data cleared");
    }
  };

  const toggleDefaultSource = (source: SourceType) => {
    const current = settings.defaultSources;
    const updated = current.includes(source)
      ? current.filter((s) => s !== source)
      : [...current, source];
    updateSetting("defaultSources", updated);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <span className="text-white font-mono text-sm font-semibold">SF</span>
          </div>
          <span className="font-semibold text-lg tracking-tight">SkillForge</span>
        </div>
        <nav className="flex items-center gap-1">
          <Link
            href="/history"
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <History className="w-4 h-4" />
          </Link>
          <Link
            href="/settings"
            className="p-2 rounded-md text-foreground bg-muted"
          >
            <SettingsIcon className="w-4 h-4" />
          </Link>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-8">
          <p className="section-label mb-2">Preferences</p>
          <h1 className="text-3xl font-semibold tracking-tight text-secondary">Settings</h1>
        </div>

        <div className="space-y-8">
          {/* Default Sources */}
          <section className="bg-white border border-border rounded-lg p-6">
            <h2 className="font-medium mb-1">Default Sources</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Select which sources are enabled by default
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SOURCE_CONFIG) as SourceType[]).map((source) => {
                const isEnabled = settings.defaultSources.includes(source);
                return (
                  <button
                    key={source}
                    onClick={() => toggleDefaultSource(source)}
                    className={`
                      px-3 py-2 rounded-md text-sm font-medium transition-all
                      ${isEnabled
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                      }
                    `}
                  >
                    {SOURCE_CONFIG[source].label}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <label className="text-sm text-muted-foreground">Sources per type:</label>
              <select
                value={settings.maxSourcesPerType}
                onChange={(e) =>
                  updateSetting("maxSourcesPerType", Number(e.target.value))
                }
                className="bg-muted border-0 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </div>
          </section>

          {/* Browser Settings */}
          <section className="bg-white border border-border rounded-lg p-6">
            <h2 className="font-medium mb-1">Browser Settings</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Configure how Mino interacts with websites
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Stealth Mode</p>
                  <p className="text-xs text-muted-foreground">
                    Use for bot-protected sites
                  </p>
                </div>
                <button
                  onClick={() =>
                    updateSetting(
                      "browserProfile",
                      settings.browserProfile === "stealth" ? "lite" : "stealth"
                    )
                  }
                  className={`
                    w-10 h-6 rounded-full transition-colors relative
                    ${settings.browserProfile === "stealth" ? "bg-primary" : "bg-muted"}
                  `}
                >
                  <span
                    className={`
                      absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform
                      ${settings.browserProfile === "stealth" ? "left-5" : "left-1"}
                    `}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Enable Proxy</p>
                  <p className="text-xs text-muted-foreground">
                    Route through a proxy server
                  </p>
                </div>
                <button
                  onClick={() => updateSetting("enableProxy", !settings.enableProxy)}
                  className={`
                    w-10 h-6 rounded-full transition-colors relative
                    ${settings.enableProxy ? "bg-primary" : "bg-muted"}
                  `}
                >
                  <span
                    className={`
                      absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform
                      ${settings.enableProxy ? "left-5" : "left-1"}
                    `}
                  />
                </button>
              </div>

              {settings.enableProxy && (
                <div className="flex items-center gap-3 pl-4">
                  <label className="text-sm text-muted-foreground">Country:</label>
                  <select
                    value={settings.proxyCountry}
                    onChange={(e) => updateSetting("proxyCountry", e.target.value)}
                    className="bg-muted border-0 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary"
                  >
                    <option value="US">United States</option>
                    <option value="GB">United Kingdom</option>
                    <option value="CA">Canada</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="JP">Japan</option>
                    <option value="AU">Australia</option>
                  </select>
                </div>
              )}
            </div>
          </section>

          {/* Storage */}
          <section className="bg-white border border-border rounded-lg p-6">
            <h2 className="font-medium mb-1">Storage</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Manage your saved data
            </p>

            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium">Auto-save Skills</p>
                <p className="text-xs text-muted-foreground">
                  Automatically save generated skills
                </p>
              </div>
              <button
                onClick={() => updateSetting("autoSave", !settings.autoSave)}
                className={`
                  w-10 h-6 rounded-full transition-colors relative
                  ${settings.autoSave ? "bg-primary" : "bg-muted"}
                `}
              >
                <span
                  className={`
                    absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform
                    ${settings.autoSave ? "left-5" : "left-1"}
                  `}
                />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export Skills
              </button>
              <button
                onClick={handleImport}
                className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Import Skills
              </button>
              <button
                onClick={handleClearAll}
                className="flex items-center gap-2 px-3 py-2 bg-red-50 text-destructive rounded-md text-sm font-medium hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear All Data
              </button>
            </div>
          </section>

          {/* Save/Reset */}
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={handleReset}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Reset to defaults
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                ${hasChanges
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
                }
              `}
            >
              <Check className="w-4 h-4" />
              Save Changes
            </button>
          </div>

          {hasChanges && (
            <p className="text-xs text-amber-600 text-center">
              You have unsaved changes
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
