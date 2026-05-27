"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, FileText, CheckCircle2 } from "lucide-react";
import { ResumeUpload } from "./resume-upload";
import { ProfileForm } from "./profile-form";
import { useProfile, useResume } from "@/lib/hooks/use-local-storage";
import type { UserProfile } from "@/lib/types";
import type { ParsedResume } from "@/lib/ai/client";
import { cn } from "@/lib/utils";

interface OnboardingFlowProps {
  onComplete: () => void;
}

type OnboardingStep = "upload" | "profile";

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>("upload");
  const [parsedData, setParsedData] = useState<Partial<UserProfile> | null>(null);
  const { setProfile } = useProfile();
  const { setResume } = useResume();

  const handleResumeParsed = (
    data: ParsedResume,
    rawText: string,
    fileName?: string
  ) => {
    // Convert ParsedResume to Partial<UserProfile> format (null -> undefined)
    const parsedProfile: Partial<UserProfile> = {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone ?? undefined,
      location: data.location,
      currentTitle: data.currentTitle,
      yearsExperience: data.yearsExperience,
      skills: data.skills,
      industries: data.industries,
      education: data.education,
      preferredTitles: data.preferredTitles,
      seniorityLevel: data.seniorityLevel,
      summary: data.summary,
    };
    
    // Save resume
    setResume({
      rawText,
      parsedData: parsedProfile,
      fileName,
      uploadedAt: new Date().toISOString(),
    });

    // Convert parsed data to profile format
    setParsedData({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone || undefined,
      location: data.location,
      currentTitle: data.currentTitle,
      yearsExperience: data.yearsExperience,
      skills: data.skills,
      industries: data.industries,
      education: data.education,
      preferredTitles: data.preferredTitles,
      seniorityLevel: data.seniorityLevel,
      summary: data.summary,
    });

    setStep("profile");
  };

  const handleProfileSubmit = (profile: UserProfile) => {
    setProfile(profile);
    onComplete();
  };

  const steps = [
    { id: "upload", label: "Upload Resume", icon: FileText },
    { id: "profile", label: "Review Profile", icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-burnt-orange flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">Job Hunter</h1>
              <p className="text-xs text-muted-foreground">
                AI-Powered Job Search
              </p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {steps.map((s, index) => {
              const Icon = s.icon;
              const isActive = s.id === step;
              const isComplete =
                steps.findIndex((st) => st.id === step) > index;

              return (
                <div key={s.id} className="flex items-center">
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors",
                      isActive && "bg-burnt-orange/10 text-burnt-orange",
                      isComplete && "bg-match-excellent/10 text-match-excellent",
                      !isActive && !isComplete && "text-muted-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium hidden sm:inline">
                      {s.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        "w-8 h-0.5 mx-2",
                        isComplete ? "bg-match-excellent" : "bg-muted"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Welcome message */}
              <div className="text-center space-y-3 max-w-xl mx-auto">
                <h2 className="text-3xl font-medium">
                  Let&apos;s find your perfect role
                </h2>
                <p className="text-lg text-muted-foreground">
                  Upload your resume and our AI will automatically match you
                  with jobs across 15+ job boards.
                </p>
              </div>

              {/* Upload component */}
              <ResumeUpload onParsed={handleResumeParsed} />

              {/* Features preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 max-w-3xl mx-auto">
                {[
                  {
                    title: "AI Resume Analysis",
                    description:
                      "We extract your skills, experience, and preferences automatically",
                  },
                  {
                    title: "10+ Job Boards",
                    description:
                      "Search the best job boards for your location simultaneously",
                  },
                  {
                    title: "Smart Matching",
                    description:
                      "Get match scores and see why each job is a good fit",
                  },
                ].map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="text-center space-y-2"
                  >
                    <div className="w-12 h-12 rounded-full bg-deep-teal/10 flex items-center justify-center mx-auto">
                      <span className="text-deep-teal font-semibold">
                        {index + 1}
                      </span>
                    </div>
                    <h3 className="font-medium">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {step === "profile" && parsedData && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ProfileForm
                initialData={parsedData}
                onSubmit={handleProfileSubmit}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <p className="text-center text-sm text-muted-foreground">
            Your data stays in your browser. Nothing is sent to any server
            except for AI analysis.
          </p>
        </div>
      </footer>
    </div>
  );
}
