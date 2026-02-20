import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MIN_RESTAURANTS, MAX_RESTAURANTS } from '@/lib/constants';

interface RestaurantInputProps {
  restaurants: string[];
  onChange: (restaurants: string[]) => void;
  disabled: boolean;
}

export function RestaurantInput({ restaurants, onChange, disabled }: RestaurantInputProps) {
  const updateAt = (index: number, value: string) => {
    const updated = [...restaurants];
    updated[index] = value;
    onChange(updated);
  };

  const addRestaurant = () => {
    if (restaurants.length < MAX_RESTAURANTS) {
      onChange([...restaurants, '']);
    }
  };

  const removeAt = (index: number) => {
    if (restaurants.length > MIN_RESTAURANTS) {
      onChange(restaurants.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">
        Which restaurants are you considering? ({MIN_RESTAURANTS}-{MAX_RESTAURANTS})
      </label>
      <div className="space-y-2">
        {restaurants.map((name, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-6 text-right shrink-0">
              {index + 1}.
            </span>
            <Input
              placeholder={`Restaurant name`}
              value={name}
              onChange={(e) => updateAt(index, e.target.value)}
              disabled={disabled}
              className="flex-1"
            />
            {restaurants.length > MIN_RESTAURANTS && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeAt(index)}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      {restaurants.length < MAX_RESTAURANTS && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={addRestaurant}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add another restaurant
        </Button>
      )}
    </div>
  );
}
