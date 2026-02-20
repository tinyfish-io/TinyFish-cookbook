"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  User,
  Search,
  Download,
  Upload,
  Trash2,
  FileText,
  Clock,
  AlertCircle,
  Check,
  RefreshCw,
  MapPin,
  MessageSquare,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { UserProfile, SearchConfig } from "@/lib/types";
import { MAJOR_CITIES, SENIORITY_LEVELS } from "@/lib/constants";
import { exportData, importData, useClearAllData } from "@/lib/hooks/use-local-storage";

interface SettingsPanelProps {
  profile: UserProfile | null;
  searchConfig: SearchConfig;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onUpdateSearchConfig: (updates: Partial<SearchConfig>) => void;
  onRescan: () => void;
  lastScanAt?: string;
  isScanning?: boolean;
}

export function SettingsPanel({
  profile,
  searchConfig,
  onUpdateProfile,
  onUpdateSearchConfig,
  onRescan,
  lastScanAt,
  isScanning,
}: SettingsPanelProps) {
  const [showClearDialog, setShowClearDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { clearAll } = useClearAllData();

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jobhunter-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported successfully");
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (importData(content)) {
        toast.success("Data imported successfully. Reloading...");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error("Failed to import data. Invalid file format.");
      }
    };
    reader.readAsText(file);
  };

  const handleClearAll = () => {
    clearAll();
    toast.success("All data cleared");
    setShowClearDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-burnt-orange" />
            <CardTitle>Profile</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={profile.fullName}
                    onChange={(e) =>
                      onUpdateProfile({ fullName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={profile.email}
                    onChange={(e) => onUpdateProfile({ email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Title</Label>
                  <Input
                    value={profile.currentTitle}
                    onChange={(e) =>
                      onUpdateProfile({ currentTitle: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Years of Experience</Label>
                  <Input
                    type="number"
                    value={profile.yearsExperience}
                    onChange={(e) =>
                      onUpdateProfile({
                        yearsExperience: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select
                    value={profile.location}
                    onValueChange={(v) => onUpdateProfile({ location: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MAJOR_CITIES.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Seniority Level</Label>
                  <Select
                    value={profile.seniorityLevel}
                    onValueChange={(v) =>
                      onUpdateProfile({
                        seniorityLevel: v as UserProfile["seniorityLevel"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SENIORITY_LEVELS).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Skills</Label>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Preferred Job Titles</Label>
                <div className="flex flex-wrap gap-2">
                  {profile.preferredTitles.map((title) => (
                    <Badge key={title} className="bg-deep-teal text-white">
                      {title}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">
              No profile set up yet. Complete the onboarding to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Job Search Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-burnt-orange" />
            <CardTitle>What Jobs Are You Looking For?</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Describe the type of jobs you want to find. Be specific about roles, industries, technologies, or any preferences.
          </p>
          <Textarea
            placeholder="e.g., I'm looking for senior software engineering roles at tech companies. I prefer remote positions working with React, TypeScript, and Node.js. Open to startups or larger companies with good work-life balance."
            value={searchConfig.jobSearchPrompt || ""}
            onChange={(e) =>
              onUpdateSearchConfig({ jobSearchPrompt: e.target.value })
            }
            className="min-h-[120px] resize-none"
          />
        </CardContent>
      </Card>

      {/* Search Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-burnt-orange" />
            <CardTitle>Search Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Remote Preference</Label>
              <Select
                value={searchConfig.remotePreference}
                onValueChange={(v) =>
                  onUpdateSearchConfig({
                    remotePreference: v as SearchConfig["remotePreference"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="remote-only">Remote Only</SelectItem>
                  <SelectItem value="hybrid-ok">Hybrid OK</SelectItem>
                  <SelectItem value="onsite-only">On-site Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Minimum Salary</Label>
              <Input
                type="number"
                placeholder="e.g., 100000"
                value={searchConfig.salaryMinimum || ""}
                onChange={(e) =>
                  onUpdateSearchConfig({
                    salaryMinimum: parseInt(e.target.value) || undefined,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Job Types</Label>
            <div className="flex flex-wrap gap-4">
              {(["full-time", "part-time", "contract", "internship"] as const).map(
                (type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={type}
                      checked={searchConfig.jobTypes.includes(type)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          onUpdateSearchConfig({
                            jobTypes: [...searchConfig.jobTypes, type],
                          });
                        } else {
                          onUpdateSearchConfig({
                            jobTypes: searchConfig.jobTypes.filter(
                              (t) => t !== type
                            ),
                          });
                        }
                      }}
                    />
                    <Label htmlFor={type} className="capitalize">
                      {type}
                    </Label>
                  </div>
                )
              )}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Last Scan</p>
              <p className="text-sm text-muted-foreground">
                {lastScanAt
                  ? new Date(lastScanAt).toLocaleString()
                  : "Never scanned"}
              </p>
            </div>
            <Button
              onClick={onRescan}
              disabled={isScanning}
              className="bg-burnt-orange hover:bg-burnt-orange/90"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Scan Now
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-burnt-orange" />
            <CardTitle>Data Management</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your data is stored locally in your browser. Export to back up your
            data or transfer to another device.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Data
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />

            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setShowClearDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Clear confirmation dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear All Data?</DialogTitle>
            <DialogDescription>
              This will permanently delete your profile, saved jobs, cover
              letters, and all other data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearAll}>
              Clear All Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
