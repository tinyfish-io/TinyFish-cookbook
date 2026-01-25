"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard immediately
    router.push("/dashboard");
  }, [router]);

  // Show minimal loading state while redirecting
  return (
    <div className="min-h-screen bg-[#F4F3F2] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-[#D76228] animate-spin" />
        <p className="text-sm text-[#165762]/60">Loading dashboard...</p>
      </div>
    </div>
  );
}
