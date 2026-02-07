import { useState } from 'react';
import { Shield, MapPin, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { RestaurantInput } from './RestaurantInput';
import { AllergenSelector } from './AllergenSelector';
import { PreferenceSelector } from './PreferenceSelector';
import type { Allergen, DietaryPreference, SearchParams } from '@/types';

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  isSearching: boolean;
}

export function SearchForm({ onSearch, isSearching }: SearchFormProps) {
  const [city, setCity] = useState('');
  const [restaurants, setRestaurants] = useState<string[]>(['', '']);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [preferences, setPreferences] = useState<DietaryPreference[]>([]);

  const filledRestaurants = restaurants.filter(r => r.trim().length > 0);
  const isValid = city.trim().length > 0 && filledRestaurants.length >= 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSearching) return;
    onSearch({
      city: city.trim(),
      restaurants: filledRestaurants,
      allergens,
      preferences,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          SafeDine
        </h1>
        <p className="text-muted-foreground text-lg">
          Compare restaurant safety before you dine
        </p>
      </div>

      <Card className="shadow-lg border-border/50">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Where are you dining?
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="City, region, or zip code"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={isSearching}
                  className="pl-10"
                />
              </div>
            </div>

            <Separator />

            <RestaurantInput
              restaurants={restaurants}
              onChange={setRestaurants}
              disabled={isSearching}
            />

            <Separator />

            <AllergenSelector
              selected={allergens}
              onChange={setAllergens}
              disabled={isSearching}
            />

            <Separator />

            <PreferenceSelector
              selected={preferences}
              onChange={setPreferences}
              disabled={isSearching}
            />

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={!isValid || isSearching}
            >
              <Search className="w-5 h-5 mr-2" />
              {isSearching ? 'Analyzing...' : 'Compare Restaurant Safety'}
            </Button>

            {!isValid && city.trim().length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Enter at least 2 restaurant names to compare
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
