import { useState } from 'react';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { ExamType } from '@/types/tutor';

interface LocationInputProps {
  exam: ExamType;
  onSearch: (location: string) => void;
  isLoading: boolean;
}

export function LocationInput({ exam, onSearch, isLoading }: LocationInputProps) {
  const [location, setLocation] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (location.trim()) {
      onSearch(location.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto animate-fade-in">
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-3">
          {exam}
        </span>
        <h3 className="text-lg text-muted-foreground">Enter your location to find tutors nearby</h3>
      </div>
      
      <div className="flex gap-3">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Enter pincode or city"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="pl-11 h-12 text-base"
            disabled={isLoading}
          />
        </div>
        <Button 
          type="submit" 
          size="lg" 
          className="h-12 px-6 gap-2"
          disabled={!location.trim() || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Searching
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Search
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
