/**
 * MEEET Oracle Prediction Engine - Utility Functions
 */

import { PredictionCategory, PredictionMarket, PredictionOption } from './types';

/**
 * Generate a unique ID for predictions
 */
export function generateId(prefix: string = 'pred'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Calculate the weighted average of an array of numbers
 */
export function weightedAverage(values: number[], weights: number[]): number {
  if (values.length === 0 || values.length !== weights.length) {
    return 0;
  }
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) return 0;
  return values.reduce((sum, v, i) => sum + v * weights[i], 0) / totalWeight;
}

/**
 * Calculate Brier score for probability predictions
 * Lower is better (0 = perfect, 1 = worst)
 */
export function calculateBrierScore(predictions: number[], outcomes: number[]): number {
  if (predictions.length === 0 || predictions.length !== outcomes.length) {
    return 1;
  }
  const sum = predictions.reduce((acc, p, i) => acc + Math.pow(p - outcomes[i], 2), 0);
  return sum / predictions.length;
}

/**
 * Calculate log loss for probability predictions
 */
export function calculateLogLoss(predictions: number[], outcomes: number[]): number {
  if (predictions.length === 0) return Infinity;
  const epsilon = 1e-15;
  const sum = predictions.reduce((acc, p, i) => {
    const clamped = Math.max(epsilon, Math.min(1 - epsilon, p));
    return acc - (outcomes[i] * Math.log(clamped) + (1 - outcomes[i]) * Math.log(1 - clamped));
  }, 0);
  return sum / predictions.length;
}

/**
 * Normalize a value to 0-1 range
 */
export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Calculate exponential decay weight
 */
export function exponentialDecay(initial: number, decay: number, periods: number): number {
  return initial * Math.pow(decay, periods);
}

/**
 * Calculate moving average
 */
export function movingAverage(values: number[], window: number): number[] {
  if (values.length < window) return [];
  const result: number[] = [];
  for (let i = window - 1; i < values.length; i++) {
    const slice = values.slice(i - window + 1, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / window);
  }
  return result;
}

/**
 * Detect trend direction from a series of values
 */
export function detectTrend(values: number[]): 'up' | 'down' | 'neutral' {
  if (values.length < 2) return 'neutral';
  const recent = values.slice(-Math.min(5, values.length));
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const first = values[0];
  const last = values[values.length - 1];
  const change = last - first;
  const threshold = Math.abs(first) * 0.02; // 2% threshold
  if (change > threshold) return 'up';
  if (change < -threshold) return 'down';
  return 'neutral';
}

/**
 * Map category to market type
 */
export function categoryToMarket(category: PredictionCategory): PredictionMarket[] {
  const mapping: Record<PredictionCategory, PredictionMarket[]> = {
    crypto: ['crypto_price', 'crypto_trend'],
    sports: ['sports_outcome', 'sports_score'],
    news: ['news_event'],
    weather: ['weather_condition'],
    economics: ['economic_indicator'],
  };
  return mapping[category] || [];
}

/**
 * Create default prediction options for binary outcomes
 */
export function createBinaryOptions(yesLabel: string = 'Yes', noLabel: string = 'No'): PredictionOption[] {
  return [
    { value: 'yes', label: yesLabel, probability: 0.5 },
    { value: 'no', label: noLabel, probability: 0.5 },
  ];
}

/**
 * Create options for multiple choice outcomes
 */
export function createMultipleOptions(options: string[]): PredictionOption[] {
  const prob = 1 / options.length;
  return options.map((opt) => ({
    value: opt.toLowerCase().replace(/\s+/g, '_'),
    label: opt,
    probability: prob,
  }));
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Parse a date string or return current date
 */
export function parseDate(date: string | Date | undefined): Date {
  if (!date) return new Date();
  if (date instanceof Date) return date;
  return new Date(date);
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}

/**
 * Check if a date is within N hours from now
 */
export function isWithinHours(date: Date, hours: number): boolean {
  const now = Date.now();
  const target = date.getTime();
  const diffMs = Math.abs(target - now);
  return diffMs <= hours * 60 * 60 * 1000;
}

/**
 * Calculate time remaining until a date in hours
 */
export function hoursUntil(date: Date): number {
  const diff = date.getTime() - Date.now();
  return diff / (60 * 60 * 1000);
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, i);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Calculate Shannon entropy for probability distribution
 */
export function shannonEntropy(probabilities: number[]): number {
  const valid = probabilities.filter((p) => p > 0);
  if (valid.length <= 1) return 0;
  return -valid.reduce((sum, p) => sum + p * Math.log2(p), 0);
}

/**
 * Determine consensus strength from vote distribution
 */
export function consensusStrength(voteDistribution: Record<string, number>): {
  strength: number;
  consensus: string;
  entropy: number;
} {
  const total = Object.values(voteDistribution).reduce((a, b) => a + b, 0);
  if (total === 0) return { strength: 0, consensus: '', entropy: 0 };

  const probabilities = Object.values(voteDistribution).map((v) => v / total);
  const entropy = shannonEntropy(probabilities);
  const maxEntropy = Math.log2(Object.keys(voteDistribution).length);
  const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;
  const strength = 1 - normalizedEntropy;

  const consensus = Object.entries(voteDistribution).reduce((a, b) =>
    a[1] > b[1] ? a : b
  )[0];

  return { strength, consensus, entropy };
}
