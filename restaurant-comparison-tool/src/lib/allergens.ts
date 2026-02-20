import type { Allergen, DietaryPreference } from '@/types';

export const ALLERGEN_INFO: Record<Allergen, { label: string; description: string }> = {
  peanuts: { label: 'Peanuts', description: 'Peanuts and peanut oil' },
  tree_nuts: { label: 'Tree Nuts', description: 'Almonds, cashews, walnuts, etc.' },
  shellfish: { label: 'Shellfish', description: 'Shrimp, crab, lobster' },
  fish: { label: 'Fish', description: 'Fish and fish sauce' },
  milk: { label: 'Milk', description: 'Dairy, cheese, cream' },
  lactose: { label: 'Lactose', description: 'Lactose-containing dairy' },
  eggs: { label: 'Eggs', description: 'Eggs and egg-based ingredients' },
  wheat: { label: 'Wheat', description: 'Wheat and wheat flour' },
  gluten: { label: 'Gluten', description: 'Wheat, barley, rye' },
  soy: { label: 'Soy', description: 'Soy, soy sauce, tofu' },
  sesame: { label: 'Sesame', description: 'Sesame seeds and sesame oil' },
  mustard: { label: 'Mustard', description: 'Mustard' },
  celery: { label: 'Celery', description: 'Celery and celeriac' },
  sulfites: { label: 'Sulfites', description: 'Sulfites and sulfur dioxide' },
};

export const ALL_ALLERGENS = Object.keys(ALLERGEN_INFO) as Allergen[];

export const PREFERENCE_INFO: Record<DietaryPreference, { label: string; description: string }> = {
  vegetarian: { label: 'Vegetarian', description: 'Vegetarian-friendly options' },
  vegan: { label: 'Vegan', description: 'Vegan-friendly options' },
  halal: { label: 'Halal', description: 'Halal certified options' },
  kosher: { label: 'Kosher', description: 'Kosher certified options' },
  low_spice: { label: 'Low Spice', description: 'Mild/non-spicy options' },
  hygiene_sensitive: { label: 'Hygiene Sensitive', description: 'High cleanliness standards' },
  family_friendly: { label: 'Family Friendly', description: 'Kids menu, atmosphere' },
  late_night: { label: 'Late Night', description: 'Late-night dining hours' },
};

export const ALL_PREFERENCES = Object.keys(PREFERENCE_INFO) as DietaryPreference[];
