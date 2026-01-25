"use client";

import { useMemo } from "react";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { Dashboard } from "@/components/dashboard";
import { useProfile } from "@/lib/hooks/use-local-storage";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { profile, isClient } = useProfile();
  
  // Derive state instead of using useEffect
  const showOnboarding = useMemo(() => {
    return isClient && !profile;
  }, [isClient, profile]);

  // Show loading state during hydration
  if (!isClient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-8">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // Show onboarding if no profile
  if (showOnboarding) {
    return <OnboardingFlow onComplete={() => {}} />;
  }

  // Show dashboard
  return <Dashboard />;
}
