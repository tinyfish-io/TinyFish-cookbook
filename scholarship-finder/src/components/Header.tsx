import { GraduationCap } from "lucide-react";

export function Header() {
  return (
    <header className="gradient-hero text-primary-foreground py-16 md:py-24">
      <div className="container mx-auto px-4 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
          <GraduationCap className="w-10 h-10" />
        </div>
        
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
          Scholarship Finder
        </h1>
        
        <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto leading-relaxed">
          Discover scholarships tailored to your goals
        </p>

        <p className="text-sm text-primary-foreground/60">
          powered by <span className="font-semibold">mino.ai</span>
        </p>
      </div>
    </header>
  );
}
