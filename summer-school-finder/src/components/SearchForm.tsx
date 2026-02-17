import { useState } from 'react';
import { Search, GraduationCap, MapPin, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SearchFormData } from '@/types/summer-school';

interface SearchFormProps {
  onSearch: (data: SearchFormData) => void;
  isSearching: boolean;
}

const programTypes = [
  'STEM',
  'Arts',
  'Robotics',
  'Coding',
  'Leadership',
  'Business',
  'Music',
  'Sports',
  'Language',
  'Research',
];

const ageGroups = [
  'High School Students',
  'Undergraduate',
  'Postgraduate',
  'Middle School',
  'All Ages',
];

export function SearchForm({ onSearch, isSearching }: SearchFormProps) {
  const [formData, setFormData] = useState<SearchFormData>({
    programType: '',
    targetAge: '',
    location: '',
    duration: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.programType && formData.location) {
      onSearch(formData);
    }
  };

  const isValid = formData.programType && formData.location;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl shadow-card border border-border p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Program Type */}
          <div className="space-y-2">
            <Label htmlFor="programType" className="flex items-center gap-2 text-sm font-medium">
              <GraduationCap className="w-4 h-4 text-primary" />
              Program Type / Focus
            </Label>
            <Select
              value={formData.programType}
              onValueChange={(value) => setFormData({ ...formData, programType: value })}
            >
              <SelectTrigger id="programType" className="h-12">
                <SelectValue placeholder="Select program type" />
              </SelectTrigger>
              <SelectContent>
                {programTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Age */}
          <div className="space-y-2">
            <Label htmlFor="targetAge" className="flex items-center gap-2 text-sm font-medium">
              <Users className="w-4 h-4 text-primary" />
              Target Age / Grade
            </Label>
            <Select
              value={formData.targetAge}
              onValueChange={(value) => setFormData({ ...formData, targetAge: value })}
            >
              <SelectTrigger id="targetAge" className="h-12">
                <SelectValue placeholder="Select age group" />
              </SelectTrigger>
              <SelectContent>
                {ageGroups.map((age) => (
                  <SelectItem key={age} value={age}>
                    {age}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="w-4 h-4 text-primary" />
              Location / Country
            </Label>
            <Input
              id="location"
              placeholder="e.g., USA, Singapore, Europe, Online"
              className="h-12"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration" className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="w-4 h-4 text-primary" />
              Duration / Dates
            </Label>
            <Input
              id="duration"
              placeholder="e.g., 2 weeks in July 2026, Summer 2026"
              className="h-12"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Button
            type="submit"
            size="lg"
            disabled={!isValid || isSearching}
            className="gradient-orange text-primary-foreground h-14 px-10 text-lg font-semibold shadow-orange hover:opacity-90 transition-opacity"
          >
            {isSearching ? (
              <>
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-3" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-5 h-5 mr-3" />
                Find Summer Schools
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
