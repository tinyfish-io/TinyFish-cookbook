import { cn } from '@/lib/utils';
import type { Allergen } from '@/types';
import { ALL_ALLERGENS, ALLERGEN_INFO } from '@/lib/allergens';

interface AllergenSelectorProps {
  selected: Allergen[];
  onChange: (allergens: Allergen[]) => void;
  disabled: boolean;
}

export function AllergenSelector({ selected, onChange, disabled }: AllergenSelectorProps) {
  const toggle = (allergen: Allergen) => {
    if (selected.includes(allergen)) {
      onChange(selected.filter(a => a !== allergen));
    } else {
      onChange([...selected, allergen]);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">
        Any allergens or sensitivities?
      </label>
      <p className="text-xs text-muted-foreground">
        Select all that apply. This helps us identify risks specific to you.
      </p>
      <div className="flex flex-wrap gap-2">
        {ALL_ALLERGENS.map((allergen) => {
          const info = ALLERGEN_INFO[allergen];
          const isSelected = selected.includes(allergen);
          return (
            <button
              key={allergen}
              type="button"
              disabled={disabled}
              onClick={() => toggle(allergen)}
              title={info.description}
              className={cn(
                'inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium',
                'border transition-all duration-200 cursor-pointer',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
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
