import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LocationInputProps {
  onSearch: (location: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function LocationInput({ onSearch, isLoading, disabled }: LocationInputProps) {
  const [location, setLocation] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (location.trim() && !isLoading) {
      onSearch(location.trim());
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row gap-3 w-full max-w-xl mx-auto"
    >
      <div className="relative flex-1">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Enter city or ZIP code (e.g., San Francisco, CA or 94086)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={disabled || isLoading}
          className="pl-12 h-14 text-base rounded-xl border-2 focus:border-primary transition-colors"
        />
      </div>
      <Button
        type="submit"
        disabled={!location.trim() || isLoading || disabled}
        className="h-14 px-8 rounded-xl font-semibold text-base bg-primary hover:bg-primary/90 transition-all duration-300"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Searching...
          </>
        ) : (
          <>
            <Search className="w-5 h-5 mr-2" />
            Compare Loans
          </>
        )}
      </Button>
    </motion.form>
  );
}
