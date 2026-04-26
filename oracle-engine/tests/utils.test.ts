import { describe, it, expect } from 'vitest';
import {
  generateId,
  weightedAverage,
  calculateBrierScore,
  calculateLogLoss,
  normalize,
  exponentialDecay,
  movingAverage,
  detectTrend,
  categoryToMarket,
  createBinaryOptions,
  createMultipleOptions,
  clamp,
  parseDate,
  isPast,
  isWithinHours,
  hoursUntil,
  safeJsonParse,
  shannonEntropy,
  consensusStrength,
} from '../src/utils';
import { PredictionCategory } from '../src/types';

describe('Utils', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId('test');
      const id2 = generateId('test');

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^test_[a-z0-9]+_[a-z0-9]+$/);
    });

    it('should use default prefix', () => {
      const id = generateId();
      expect(id).toMatch(/^pred_[a-z0-9]+_[a-z0-9]+$/);
    });
  });

  describe('weightedAverage', () => {
    it('should calculate weighted average', () => {
      const result = weightedAverage([10, 20, 30], [1, 2, 3]);
      expect(result).toBeCloseTo(23.33, 2);
    });

    it('should return 0 for empty arrays', () => {
      expect(weightedAverage([], [])).toBe(0);
    });

    it('should handle zero weights', () => {
      expect(weightedAverage([10, 20], [0, 0])).toBe(0);
    });

    it('should handle mismatched lengths', () => {
      expect(weightedAverage([10, 20], [1])).toBe(0);
    });
  });

  describe('calculateBrierScore', () => {
    it('should calculate Brier score', () => {
      const predictions = [0.9, 0.8, 0.3];
      const outcomes = [1, 1, 0];
      const result = calculateBrierScore(predictions, outcomes);

      // (0.9-1)^2 + (0.8-1)^2 + (0.3-0)^2 = 0.01 + 0.04 + 0.09 = 0.14 / 3
      expect(result).toBeCloseTo(0.0467, 4);
    });

    it('should return 1 for empty arrays', () => {
      expect(calculateBrierScore([], [])).toBe(1);
    });

    it('should return 0 for perfect predictions', () => {
      expect(calculateBrierScore([1, 1], [1, 1])).toBe(0);
    });
  });

  describe('calculateLogLoss', () => {
    it('should calculate log loss', () => {
      const predictions = [0.9, 0.1];
      const outcomes = [1, 0];
      const result = calculateLogLoss(predictions, outcomes);

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(0.5);
    });

    it('should return Infinity for empty arrays', () => {
      expect(calculateLogLoss([], [])).toBe(Infinity);
    });
  });

  describe('normalize', () => {
    it('should normalize value to 0-1 range', () => {
      expect(normalize(50, 0, 100)).toBe(0.5);
      expect(normalize(0, 0, 100)).toBe(0);
      expect(normalize(100, 0, 100)).toBe(1);
    });

    it('should clamp values outside range', () => {
      expect(normalize(150, 0, 100)).toBe(1);
      expect(normalize(-50, 0, 100)).toBe(0);
    });

    it('should handle min equals max', () => {
      expect(normalize(50, 50, 50)).toBe(0.5);
    });
  });

  describe('exponentialDecay', () => {
    it('should calculate exponential decay', () => {
      expect(exponentialDecay(1, 0.5, 1)).toBe(0.5);
      expect(exponentialDecay(1, 0.5, 2)).toBe(0.25);
      expect(exponentialDecay(100, 0.95, 10)).toBeCloseTo(59.87, 2);
    });
  });

  describe('movingAverage', () => {
    it('should calculate moving average', () => {
      const values = [1, 2, 3, 4, 5];
      const result = movingAverage(values, 3);

      expect(result).toHaveLength(3);
      expect(result[0]).toBe(2); // (1+2+3)/3
      expect(result[1]).toBe(3); // (2+3+4)/3
      expect(result[2]).toBe(4); // (3+4+5)/3
    });

    it('should return empty array with insufficient data', () => {
      expect(movingAverage([1, 2], 5)).toHaveLength(0);
    });
  });

  describe('detectTrend', () => {
    it('should detect uptrend', () => {
      expect(detectTrend([100, 102, 104, 106, 108])).toBe('up');
    });

    it('should detect downtrend', () => {
      expect(detectTrend([100, 98, 96, 94, 92])).toBe('down');
    });

    it('should detect neutral trend', () => {
      expect(detectTrend([100, 100.5, 99.5, 100, 100])).toBe('neutral');
    });

    it('should return neutral for single value', () => {
      expect(detectTrend([100])).toBe('neutral');
    });
  });

  describe('categoryToMarket', () => {
    it('should map crypto to crypto markets', () => {
      const markets = categoryToMarket('crypto' as PredictionCategory);
      expect(markets).toContain('crypto_price');
      expect(markets).toContain('crypto_trend');
    });

    it('should map sports to sports markets', () => {
      const markets = categoryToMarket('sports' as PredictionCategory);
      expect(markets).toContain('sports_outcome');
      expect(markets).toContain('sports_score');
    });

    it('should map news to news markets', () => {
      const markets = categoryToMarket('news' as PredictionCategory);
      expect(markets).toContain('news_event');
    });
  });

  describe('createBinaryOptions', () => {
    it('should create binary options with defaults', () => {
      const options = createBinaryOptions();

      expect(options).toHaveLength(2);
      expect(options[0].value).toBe('yes');
      expect(options[1].value).toBe('no');
      expect(options[0].probability).toBe(0.5);
    });

    it('should create binary options with custom labels', () => {
      const options = createBinaryOptions('Up', 'Down');

      expect(options[0].label).toBe('Up');
      expect(options[1].label).toBe('Down');
    });
  });

  describe('createMultipleOptions', () => {
    it('should create multiple choice options', () => {
      const options = createMultipleOptions(['A', 'B', 'C']);

      expect(options).toHaveLength(3);
      expect(options[0].value).toBe('a');
      expect(options[1].value).toBe('b');
      expect(options[2].value).toBe('c');
      expect(options[0].probability).toBeCloseTo(1 / 3);
    });
  });

  describe('clamp', () => {
    it('should clamp value within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('parseDate', () => {
    it('should parse date string', () => {
      const date = parseDate('2025-01-15T12:00:00Z');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2025);
    });

    it('should return current date for undefined', () => {
      const before = new Date();
      const date = parseDate(undefined);
      const after = new Date();

      expect(date.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(date.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should return Date instance as-is', () => {
      const input = new Date('2025-01-15');
      const result = parseDate(input);
      expect(result).toBe(input);
    });
  });

  describe('isPast', () => {
    it('should return true for past dates', () => {
      expect(isPast(new Date(Date.now() - 86400000))).toBe(true);
    });

    it('should return false for future dates', () => {
      expect(isPast(new Date(Date.now() + 86400000))).toBe(false);
    });
  });

  describe('isWithinHours', () => {
    it('should return true for dates within range', () => {
      const future = new Date(Date.now() + 2 * 3600000);
      expect(isWithinHours(future, 3)).toBe(true);
    });

    it('should return false for dates outside range', () => {
      const future = new Date(Date.now() + 5 * 3600000);
      expect(isWithinHours(future, 3)).toBe(false);
    });
  });

  describe('hoursUntil', () => {
    it('should calculate hours until date', () => {
      const future = new Date(Date.now() + 24 * 3600000);
      const hours = hoursUntil(future);

      expect(hours).toBeCloseTo(24, 0);
    });

    it('should return negative for past dates', () => {
      const past = new Date(Date.now() - 24 * 3600000);
      expect(hoursUntil(past)).toBeLessThan(0);
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const result = safeJsonParse('{"key": "value"}', {});
      expect(result).toEqual({ key: 'value' });
    });

    it('should return fallback for invalid JSON', () => {
      const result = safeJsonParse('invalid json', { default: true });
      expect(result).toEqual({ default: true });
    });
  });

  describe('shannonEntropy', () => {
    it('should calculate Shannon entropy', () => {
      // Uniform distribution: log2(2) = 1
      const entropy = shannonEntropy([0.5, 0.5]);
      expect(entropy).toBeCloseTo(1, 4);
    });

    it('should return 0 for single outcome', () => {
      expect(shannonEntropy([1])).toBe(0);
    });

    it('should return 0 for empty array', () => {
      expect(shannonEntropy([])).toBe(0);
    });
  });

  describe('consensusStrength', () => {
    it('should calculate consensus strength', () => {
      const result = consensusStrength({ yes: 80, no: 20 });

      expect(result.consensus).toBe('yes');
      expect(result.strength).toBeGreaterThan(0);
      expect(result.strength).toBeLessThanOrEqual(1);
      expect(result.entropy).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty distribution', () => {
      const result = consensusStrength({});

      expect(result.strength).toBe(0);
      expect(result.consensus).toBe('');
    });

    it('should return low strength for equal distribution', () => {
      const result = consensusStrength({ yes: 50, no: 50 });

      expect(result.strength).toBeLessThan(0.5);
    });
  });
});
