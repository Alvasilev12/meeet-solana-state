export const STAKING_TIERS = [
  {
    key: "explorer",
    name: "Explorer",
    min: 1_000,
    stakeLabel: "1,000 MEEET",
    apy: 5,
    apyLabel: "5% APY",
    lockDays: 0,
    benefits: ["Basic analytics"],
  },
  {
    key: "builder",
    name: "Builder",
    min: 10_000,
    stakeLabel: "10,000 MEEET",
    apy: 12,
    apyLabel: "12% APY",
    lockDays: 30,
    benefits: ["Priority agent deployment", "+5% XP"],
  },
  {
    key: "architect",
    name: "Architect",
    min: 50_000,
    stakeLabel: "50,000 MEEET",
    apy: 20,
    apyLabel: "20% APY",
    lockDays: 90,
    benefits: ["Governance voting power", "+10% XP"],
  },
  {
    key: "visionary",
    name: "Visionary",
    min: 250_000,
    stakeLabel: "250,000 MEEET",
    apy: 30,
    apyLabel: "30% APY",
    lockDays: 365,
    benefits: ["Revenue sharing", "+20% XP", "2x governance"],
  },
] as const;

export type StakingTierKey = (typeof STAKING_TIERS)[number]["key"];

export function getTierForAmount(amount: number) {
  for (let i = STAKING_TIERS.length - 1; i >= 0; i--) {
    if (amount >= STAKING_TIERS[i].min) return STAKING_TIERS[i];
  }
  return STAKING_TIERS[0];
}
