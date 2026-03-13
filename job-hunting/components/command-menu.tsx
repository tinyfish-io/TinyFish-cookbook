"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Briefcase,
  Bookmark,
  Kanban,
  Settings,
  FileText,
  Download,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { Job } from "@/lib/types";
import { exportData } from "@/lib/hooks/use-local-storage";
import { toast } from "sonner";

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFindJobs: () => void;
  onGoToTab: (tab: string) => void;
  jobs: Job[];
  onJobClick: (job: Job) => void;
}

export function CommandMenu({
  open,
  onOpenChange,
  onFindJobs,
  onGoToTab,
  jobs,
  onJobClick,
}: CommandMenuProps) {
  const { theme, setTheme } = useTheme();
  const [search, setSearch] = useState("");

  // Filter jobs by search
  const filteredJobs = search
    ? jobs
        .filter(
          (j) =>
            j.title.toLowerCase().includes(search.toLowerCase()) ||
            j.company.toLowerCase().includes(search.toLowerCase())
        )
        .slice(0, 5)
    : [];

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jobhunter-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported");
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Type a command or search jobs..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Quick actions */}
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              onFindJobs();
              onOpenChange(false);
            }}
          >
            <Search className="w-4 h-4 mr-2" />
            Find New Jobs
          </CommandItem>
          <CommandItem onSelect={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setTheme(theme === "dark" ? "light" : "dark");
              onOpenChange(false);
            }}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 mr-2" />
            ) : (
              <Moon className="w-4 h-4 mr-2" />
            )}
            Toggle {theme === "dark" ? "Light" : "Dark"} Mode
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => {
              onGoToTab("feed");
              onOpenChange(false);
            }}
          >
            <Briefcase className="w-4 h-4 mr-2" />
            Go to Job Feed
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onGoToTab("saved");
              onOpenChange(false);
            }}
          >
            <Bookmark className="w-4 h-4 mr-2" />
            Go to Saved Jobs
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onGoToTab("applications");
              onOpenChange(false);
            }}
          >
            <Kanban className="w-4 h-4 mr-2" />
            Go to Applications
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onGoToTab("settings");
              onOpenChange(false);
            }}
          >
            <Settings className="w-4 h-4 mr-2" />
            Go to Settings
          </CommandItem>
        </CommandGroup>

        {/* Job search results */}
        {filteredJobs.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Jobs">
              {filteredJobs.map((job) => (
                <CommandItem
                  key={job.id}
                  onSelect={() => {
                    onJobClick(job);
                    onOpenChange(false);
                  }}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{job.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {job.company}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        job.matchScore >= 80
                          ? "text-match-excellent"
                          : job.matchScore >= 50
                          ? "text-match-good"
                          : "text-match-poor"
                      }`}
                    >
                      {job.matchScore}%
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
