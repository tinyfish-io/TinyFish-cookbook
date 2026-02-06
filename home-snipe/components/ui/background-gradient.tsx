"use client";

import { cn } from "@/lib/utils";

interface BackgroundGradientProps {
  className?: string;
  children?: React.ReactNode;
  variant?: "default" | "subtle" | "vibrant";
}

export function BackgroundGradient({ 
  className, 
  children,
  variant = "default" 
}: BackgroundGradientProps) {
  const gradientStyles = {
    default: {
      gradient: "bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.3),transparent)]",
      grid: "bg-[linear-gradient(to_right,hsl(var(--primary)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.05)_1px,transparent_1px)]",
    },
    subtle: {
      gradient: "bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,hsl(var(--primary)/0.15),transparent)]",
      grid: "bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)]",
    },
    vibrant: {
      gradient: "bg-[radial-gradient(ellipse_100%_80%_at_50%_-30%,hsl(var(--primary)/0.4),hsl(var(--secondary)/0.2),transparent)]",
      grid: "bg-[linear-gradient(to_right,hsl(var(--primary)/0.08)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.08)_1px,transparent_1px)]",
    },
  };

  const styles = gradientStyles[variant];

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Gradient overlay */}
      <div className={cn("absolute inset-0 -z-10", styles.gradient)} />
      {/* Grid pattern */}
      <div 
        className={cn(
          "pointer-events-none absolute inset-0 -z-10",
          styles.grid,
          "bg-[size:24px_24px]"
        )} 
      />
      {children}
    </div>
  );
}

export function AgentSectionBackground({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative rounded-2xl overflow-hidden border border-border/50 bg-card", className)}>
      {/* Grid pattern - light gray lines */}
      <div 
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#d1d5db33_1px,transparent_1px),linear-gradient(to_bottom,#d1d5db33_1px,transparent_1px)] bg-[size:40px_40px]" 
      />
      {/* Emerald blur blob - positioned at top right */}
      <div className="absolute -right-20 -top-20 h-[400px] w-[400px] rounded-full bg-emerald-400 opacity-20 blur-[120px]" />
      {/* Secondary accent blob - positioned at bottom left */}
      <div className="absolute -bottom-32 -left-32 h-[300px] w-[300px] rounded-full bg-primary opacity-10 blur-[100px]" />
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

// Full page background gradient (dark mode)
export function BackgroundGradientDark() {
  return (
    <div className="fixed inset-0 -z-10 bg-neutral-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_560px_at_50%_200px,#38bdf8,transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#38bdf820_1px,transparent_1px),linear-gradient(to_bottom,#38bdf820_1px,transparent_1px)] bg-[size:18px_18px]" />
    </div>
  );
}

// Full page background gradient (light mode)
export function BackgroundGradientLight() {
  return (
    <div className="fixed inset-0 -z-10 bg-white overflow-hidden">
      {/* Primary emerald blob - top right */}
      <div className="absolute -top-32 -right-32 h-[600px] w-[600px] rounded-full bg-emerald-400 opacity-30 blur-[100px]" />
      
      {/* Secondary emerald blob - center left */}
      <div className="absolute top-1/3 -left-20 h-[400px] w-[400px] rounded-full bg-emerald-300 opacity-25 blur-[80px]" />
      
      {/* Accent blob - bottom center */}
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-teal-400 opacity-20 blur-[120px]" />
    </div>
  );
}
