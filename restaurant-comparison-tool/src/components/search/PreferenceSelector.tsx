import { cn } from '@/lib/utils';
import type { DietaryPreference } from '@/types';
import { ALL_PREFERENCES, PREFERENCE_INFO } from '@/lib/allergens';

interface PreferenceSelectorProps {
  selected: DietaryPreference[];
  onChange: (preferences: DietaryPreference[]) => void;
  disabled: boolean;
}

export function PreferenceSelector({ selected, onChange, disabled }: PreferenceSelectorProps) {
  const toggle = (preference: DietaryPreference) => {
    if (selected.includes(preference)) {
      onChange(selected.filter(p => p !== preference));
    } else {
      onChange([...selected, preference]);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">
        Optional preferences
      </label>
      <div className="flex flex-wrap gap-2">
        {ALL_PREFERENCES.map((pref) => {
          const info = PREFERENCE_INFO[pref];
          const isSelected = selected.includes(pref);
          return (
            <button
              key={pref}
              type="button"
              disabled={disabled}
              onClick={() => toggle(pref)}
              title={info.description}
              className={cn(
                'inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium',
                'border transition-all duration-200 cursor-pointer',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isSelected
                  ? 'bg-accent text-accent-foreground border-accent shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:border-accent/50 hover:text-foreground'
              )}
            >
              {info.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
