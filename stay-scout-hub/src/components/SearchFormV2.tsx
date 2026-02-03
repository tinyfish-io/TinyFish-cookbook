import { motion } from 'framer-motion';
import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin, Search, Loader2, CalendarIcon, Sparkles } from 'lucide-react';
import { SearchParams, TripPurpose } from '@/types/hotel';
import { cn } from '@/lib/utils';
import { PurposeSelector } from './PurposeSelector';

interface SearchFormV2Props {
  onSearch: (params: SearchParams) => void;
  isSearching: boolean;
}

export function SearchFormV2({ onSearch, isSearching }: SearchFormV2Props) {
  const [city, setCity] = useState('');
  const [purpose, setPurpose] = useState<TripPurpose | null>(null);
  const [customPurpose, setCustomPurpose] = useState('');
  const [checkInDate, setCheckInDate] = useState<Date>();
  const [checkOutDate, setCheckOutDate] = useState<Date>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (city.trim() && (purpose || customPurpose.trim())) {
      onSearch({
        city: city.trim(),
        purpose: purpose || 'custom',
        customPurpose: customPurpose.trim() || undefined,
        checkIn: checkInDate ? format(checkInDate, 'yyyy-MM-dd') : undefined,
        checkOut: checkOutDate ? format(checkOutDate, 'yyyy-MM-dd') : undefined,
      });
    }
  };

  const isValid = city.trim() && (purpose || customPurpose.trim());

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="w-full max-w-4xl mx-auto space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      {/* City Input */}
      <motion.div
        className="bg-card rounded-2xl shadow-xl p-6 border border-border/50"
        whileHover={{ boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.1)' }}
      >
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-primary" />
          Where are you going?
        </label>
        <Input
          type="text"
          placeholder="Enter city name..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
          disabled={isSearching}
          className="h-14 text-lg"
        />
      </motion.div>

      {/* Purpose Selection */}
      <motion.div
        className="bg-card rounded-2xl shadow-xl p-6 border border-border/50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          What's the purpose of your stay?
        </label>
        
        <PurposeSelector
          selected={purpose}
          onSelect={(p) => {
            setPurpose(p);
            setCustomPurpose(''); // Clear custom when preset selected
          }}
          disabled={isSearching}
        />
        
        <div className="mt-4 pt-4 border-t border-border/50">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Or describe your specific situation:
          </label>
          <Textarea
            placeholder="E.g., 'Early morning flight at 6am, need hotel within 15 mins of airport with good breakfast...'"
            value={customPurpose}
            onChange={(e) => {
              setCustomPurpose(e.target.value);
              if (e.target.value.trim()) setPurpose(null); // Clear preset when typing custom
            }}
            disabled={isSearching}
            className="min-h-[80px] resize-none"
          />
        </div>
      </motion.div>

      {/* Optional Dates */}
      <motion.div
        className="bg-card rounded-2xl shadow-xl p-6 border border-border/50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
          <CalendarIcon className="w-4 h-4 text-primary" />
          When? (optional - helps with availability check)
        </label>
        
        <div className="flex flex-wrap gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isSearching}
                className={cn(
                  "h-12 min-w-[140px] justify-start text-left font-normal",
                  !checkInDate && "text-muted-foreground"
                )}
              >
                {checkInDate ? format(checkInDate, "MMM dd, yyyy") : "Check-in date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={checkInDate}
                onSelect={(date) => {
                  setCheckInDate(date);
                  if (date && (!checkOutDate || checkOutDate <= date)) {
                    const nextDay = new Date(date);
                    nextDay.setDate(nextDay.getDate() + 1);
                    setCheckOutDate(nextDay);
                  }
                }}
                disabled={(d) => d < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isSearching}
                className={cn(
                  "h-12 min-w-[140px] justify-start text-left font-normal",
                  !checkOutDate && "text-muted-foreground"
                )}
              >
                {checkOutDate ? format(checkOutDate, "MMM dd, yyyy") : "Check-out date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={checkOutDate}
                onSelect={setCheckOutDate}
                disabled={(d) => d < new Date() || (checkInDate ? d <= checkInDate : false)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </motion.div>

      {/* Submit Button */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            type="submit"
            variant="hero"
            size="xl"
            disabled={isSearching || !isValid}
            className="h-14 min-w-[240px]"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing Areas...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Find Best Areas to Stay
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </motion.form>
  );
}
