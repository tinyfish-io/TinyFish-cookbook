export const PLANS = {
  free: { scansPerMonth: 5, name: 'Free' },
  pro: { scansPerMonth: 50, name: 'Pro' },
  team: { scansPerMonth: 500, name: 'Team' },
} as const;

export type PlanId = keyof typeof PLANS;
