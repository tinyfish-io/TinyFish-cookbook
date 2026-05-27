"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Plus, ArrowRight, Edit2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";
import { SENIORITY_LEVELS, COMMON_SKILLS, MAJOR_CITIES } from "@/lib/constants";

interface ProfileFormProps {
  initialData: Partial<UserProfile>;
  onSubmit: (profile: UserProfile) => void;
}

export function ProfileForm({ initialData, onSubmit }: ProfileFormProps) {
  const [profile, setProfile] = useState<Partial<UserProfile>>({
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
    ...initialData,
  });

  const [newSkill, setNewSkill] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [editingField, setEditingField] = useState<string | null>(null);

  const updateField = <K extends keyof UserProfile>(
    field: K,
    value: UserProfile[K]
  ) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const addSkill = (skill: string) => {
    if (skill && !profile.skills?.includes(skill)) {
      updateField("skills", [...(profile.skills || []), skill]);
    }
    setNewSkill("");
  };

  const removeSkill = (skill: string) => {
    updateField(
      "skills",
      profile.skills?.filter((s) => s !== skill) || []
    );
  };

  const addPreferredTitle = (title: string) => {
    if (title && !profile.preferredTitles?.includes(title)) {
      updateField("preferredTitles", [...(profile.preferredTitles || []), title]);
    }
    setNewTitle("");
  };

  const removePreferredTitle = (title: string) => {
    updateField(
      "preferredTitles",
      profile.preferredTitles?.filter((t) => t !== title) || []
    );
  };

  const handleSubmit = () => {
    const now = new Date().toISOString();
    const completeProfile: UserProfile = {
      fullName: profile.fullName || "",
      email: profile.email || "",
      location: profile.location || "",
      currentTitle: profile.currentTitle || "",
      yearsExperience: profile.yearsExperience || 0,
      skills: profile.skills || [],
      industries: profile.industries || [],
      education: profile.education || "",
      preferredTitles: profile.preferredTitles || [],
      seniorityLevel: profile.seniorityLevel || "mid",
      summary: profile.summary || "",
      createdAt: now,
      updatedAt: now,
    };
    onSubmit(completeProfile);
  };

  const suggestedSkills = COMMON_SKILLS.filter(
    (skill) => !profile.skills?.includes(skill)
  ).slice(0, 8);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-3xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-burnt-orange/10 text-burnt-orange text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          AI-Parsed Profile
        </div>
        <h2 className="text-2xl font-medium">Review your profile</h2>
        <p className="text-muted-foreground">
          We&apos;ve extracted this information from your resume. Feel free to edit
          anything.
        </p>
      </div>

      {/* Basic Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={profile.fullName || ""}
              onChange={(e) => updateField("fullName", e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email || ""}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="john@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentTitle">Current Title</Label>
            <Input
              id="currentTitle"
              value={profile.currentTitle || ""}
              onChange={(e) => updateField("currentTitle", e.target.value)}
              placeholder="Software Engineer"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Select
              value={profile.location || ""}
              onValueChange={(value) => updateField("location", value)}
            >
              <SelectTrigger id="location">
                <SelectValue placeholder="Select location" />
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
            <Label htmlFor="experience">Years of Experience</Label>
            <Input
              id="experience"
              type="number"
              min="0"
              max="50"
              value={profile.yearsExperience || 0}
              onChange={(e) =>
                updateField("yearsExperience", parseInt(e.target.value) || 0)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="seniority">Seniority Level</Label>
            <Select
              value={profile.seniorityLevel || "mid"}
              onValueChange={(value) =>
                updateField(
                  "seniorityLevel",
                  value as UserProfile["seniorityLevel"]
                )
              }
            >
              <SelectTrigger id="seniority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SENIORITY_LEVELS).map(([key, { label, description }]) => (
                  <SelectItem key={key} value={key}>
                    <div>
                      <div className="font-medium">{label}</div>
                      <div className="text-xs text-muted-foreground">
                        {description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Skills Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Skills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current skills */}
          <div className="flex flex-wrap gap-2">
            {profile.skills?.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="px-3 py-1 text-sm group cursor-pointer hover:bg-destructive/10"
                onClick={() => removeSkill(skill)}
              >
                {skill}
                <X className="w-3 h-3 ml-2 opacity-50 group-hover:opacity-100" />
              </Badge>
            ))}
            {(!profile.skills || profile.skills.length === 0) && (
              <p className="text-sm text-muted-foreground">
                No skills added yet
              </p>
            )}
          </div>

          {/* Add skill input */}
          <div className="flex gap-2">
            <Input
              placeholder="Add a skill..."
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill(newSkill);
                }
              }}
              className="max-w-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => addSkill(newSkill)}
              disabled={!newSkill}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Suggested skills */}
          {suggestedSkills.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Suggested skills to add:
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedSkills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className="px-3 py-1 text-sm cursor-pointer hover:bg-accent"
                    onClick={() => addSkill(skill)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferred Titles Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Job Titles You&apos;re Looking For</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            These are the job titles we&apos;ll search for. Add or remove titles
            based on what you&apos;re interested in.
          </p>

          {/* Current titles */}
          <div className="flex flex-wrap gap-2">
            {profile.preferredTitles?.map((title) => (
              <Badge
                key={title}
                className="px-3 py-1.5 text-sm bg-deep-teal text-white group cursor-pointer hover:bg-destructive"
                onClick={() => removePreferredTitle(title)}
              >
                {title}
                <X className="w-3 h-3 ml-2 opacity-70 group-hover:opacity-100" />
              </Badge>
            ))}
            {(!profile.preferredTitles || profile.preferredTitles.length === 0) && (
              <p className="text-sm text-muted-foreground">
                No preferred titles added yet
              </p>
            )}
          </div>

          {/* Add title input */}
          <div className="flex gap-2">
            <Input
              placeholder="Add a job title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addPreferredTitle(newTitle);
                }
              }}
              className="max-w-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => addPreferredTitle(newTitle)}
              disabled={!newTitle}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Professional Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={profile.summary || ""}
            onChange={(e) => updateField("summary", e.target.value)}
            placeholder="A brief 2-3 sentence summary of your professional background..."
            className="min-h-[100px]"
          />
          <p className="text-xs text-muted-foreground">
            This helps us match you with relevant opportunities.
          </p>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSubmit}
          className="bg-burnt-orange hover:bg-burnt-orange/90 text-lg px-8 py-6"
          disabled={
            !profile.fullName ||
            !profile.currentTitle ||
            !profile.preferredTitles?.length
          }
        >
          Continue to Dashboard
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}
