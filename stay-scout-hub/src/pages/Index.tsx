import { SearchFormV2 } from '@/components/SearchFormV2';
import { AreaResultsSection } from '@/components/AreaResultsSection';
import { useAreaSearch } from '@/hooks/useAreaSearch';
import { Brain, MapPin, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { TRIP_PURPOSES } from '@/types/hotel';
import { useState } from 'react';

const Index = () => {
  const { search, isSearching, results, error } = useAreaSearch();
  const [searchContext, setSearchContext] = useState<{ 
    city?: string; 
    purpose?: string;
    checkIn?: string;
    checkOut?: string;
  }>({});

  const handleSearch = (params: Parameters<typeof search>[0]) => {
    const purposeLabel = params.purpose === 'custom' 
      ? params.customPurpose 
      : TRIP_PURPOSES.find(p => p.id === params.purpose)?.label;
    
    setSearchContext({ 
      city: params.city, 
      purpose: purposeLabel,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
    });
    search(params);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center shadow-glow">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-xl font-bold font-display">StayScout</span>
              <p className="text-xs text-muted-foreground">AI-Powered Location Intelligence</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground hidden sm:block">
            Pre-Booking Decision Engine
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
          >
            <Sparkles className="w-4 h-4" />
            Not a booking site — a decision-making tool
          </motion.div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display mb-4">
            <span className="text-gradient">Where</span> should you stay?
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tell us your trip purpose, and AI agents will research neighborhoods, 
            analyze reviews, and explain <span className="text-foreground font-medium">why</span> each 
            area is or isn't right for you.
          </p>
        </motion.div>

        {/* How It Works */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {[
            { icon: MapPin, title: 'Describe Your Trip', desc: 'Business, exam, sightseeing, or anything else' },
            { icon: Brain, title: 'AI Agents Research', desc: 'Explore maps, reviews, and local context' },
            { icon: Sparkles, title: 'Get Reasoning', desc: 'Understand tradeoffs before you book' },
          ].map((step, i) => (
            <div key={i} className="text-center p-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <step.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
              <p className="text-xs text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </motion.div>

        <SearchFormV2 onSearch={handleSearch} isSearching={isSearching} />

        {error && (
          <div className="mt-8 p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-center text-destructive">
            {error}
          </div>
        )}

        <AreaResultsSection 
          results={results} 
          isSearching={isSearching} 
          city={searchContext.city}
          purpose={searchContext.purpose}
          checkIn={searchContext.checkIn}
          checkOut={searchContext.checkOut}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>StayScout — Pre-booking intelligence for smarter travel decisions</p>
          <p className="mt-2 text-xs">Powered by Gemini AI & Mino Browser Agents</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
