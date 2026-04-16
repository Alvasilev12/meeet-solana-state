export const STAKING_TIERS = [
  { name: 'Explorer', minStake: 1000, apy: 5 },
  { name: 'Builder', minStake: 10000, apy: 12 },
  { name: 'Architect', minStake: 50000, apy: 20 },
  { name: 'Visionary', minStake: 250000, apy: 30 },
] as const;

export type StakingTier = typeof STAKING_TIERS[number];
