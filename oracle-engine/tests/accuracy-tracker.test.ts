import { describe, it, expect, beforeEach } from 'vitest';
import { AccuracyTracker } from '../src/voting/accuracy-tracker';
import { PredictionRecord, PredictionCategory } from '../src/types';

describe('AccuracyTracker', () => {
  let tracker: AccuracyTracker;

  const createRecord = (
    category: PredictionCategory,
    isCorrect: boolean,
    confidence: number = 0.7,
    daysAgo: number = 0
  ): PredictionRecord => ({
    predictionId: `pred_${category}_${isCorrect ? 'c' : 'w'}_${Date.now()}`,
    predictedOutcome: isCorrect ? 'correct' : 'wrong',
    actualOutcome: 'correct',
    confidence,
    isCorrect,
    category,
    timestamp: new Date(Date.now() - daysAgo * 86400000),
    resolvedAt: new Date(Date.now() - daysAgo * 86400000),
  });

  beforeEach(() => {
    tracker = new AccuracyTracker({ minSamples: 5 });
  });

  describe('recordOutcome', () => {
    it('should record a prediction outcome', () => {
      const record = createRecord('crypto', true);
      tracker.recordOutcome(record);

      expect(tracker.getRecordCount()).toBe(1);
    });

    it('should record multiple outcomes', () => {
      const records = [
        createRecord('crypto', true),
        createRecord('sports', false),
        createRecord('news', true),
      ];

      tracker.recordOutcomes(records);

      expect(tracker.getRecordCount()).toBe(3);
    });
  });

  describe('calculateOverallMetrics', () => {
    it('should calculate correct overall accuracy', () => {
      // Add 10 records: 8 correct, 2 wrong
      for (let i = 0; i < 8; i++) {
        tracker.recordOutcome(createRecord('crypto', true, 0.8));
      }
      for (let i = 0; i < 2; i++) {
        tracker.recordOutcome(createRecord('crypto', false, 0.6));
      }

      const metrics = tracker.calculateOverallMetrics();

      expect(metrics.overall.total).toBe(10);
      expect(metrics.overall.correct).toBe(8);
      expect(metrics.overall.accuracy).toBeCloseTo(0.8, 2);
      expect(metrics.overall.brierScore).toBeLessThan(0.3);
    });

    it('should handle empty records', () => {
      const metrics = tracker.calculateOverallMetrics();

      expect(metrics.overall.total).toBe(0);
      expect(metrics.overall.accuracy).toBe(0);
      expect(metrics.overall.brierScore).toBe(1);
    });

    it('should calculate metrics by category', () => {
      for (let i = 0; i < 5; i++) {
        tracker.recordOutcome(createRecord('crypto', true));
      }
      for (let i = 0; i < 3; i++) {
        tracker.recordOutcome(createRecord('sports', true));
      }
      for (let i = 0; i < 2; i++) {
        tracker.recordOutcome(createRecord('sports', false));
      }

      const metrics = tracker.calculateOverallMetrics();

      expect(metrics.byCategory.crypto.total).toBe(5);
      expect(metrics.byCategory.crypto.accuracy).toBe(1);
      expect(metrics.byCategory.sports.total).toBe(5);
      expect(metrics.byCategory.sports.accuracy).toBe(0.6);
    });
  });

  describe('isTargetMet', () => {
    it('should return true when accuracy target is met', () => {
      for (let i = 0; i < 10; i++) {
        tracker.recordOutcome(createRecord('crypto', true, 0.85));
      }

      expect(tracker.isTargetMet(0.78)).toBe(true);
    });

    it('should return false when accuracy target is not met', () => {
      for (let i = 0; i < 10; i++) {
        tracker.recordOutcome(createRecord('crypto', i < 5, 0.5));
      }

      expect(tracker.isTargetMet(0.78)).toBe(false);
    });

    it('should return false with insufficient samples', () => {
      tracker.recordOutcome(createRecord('crypto', true));

      expect(tracker.isTargetMet(0.78)).toBe(false);
    });
  });

  describe('getCalibration', () => {
    it('should calculate calibration buckets', () => {
      // Add records with varying confidence levels
      for (let i = 0; i < 3; i++) {
        tracker.recordOutcome(createRecord('crypto', true, 0.1));
      }
      for (let i = 0; i < 3; i++) {
        tracker.recordOutcome(createRecord('crypto', true, 0.5));
      }
      for (let i = 0; i < 4; i++) {
        tracker.recordOutcome(createRecord('crypto', true, 0.9));
      }

      const calibration = tracker.getCalibration();

      expect(calibration.buckets).toHaveLength(5);
      expect(calibration.buckets[0].range).toBe('0-20%');
      expect(calibration.buckets[4].range).toBe('80-100%');
    });
  });

  describe('calculateExpectedValue', () => {
    it('should calculate expected value', () => {
      tracker.recordOutcome(createRecord('crypto', true, 0.8));
      tracker.recordOutcome(createRecord('crypto', false, 0.6));

      const ev = tracker.calculateExpectedValue();

      expect(ev.totalEV).toBeCloseTo(0.8 * 1 + 0.6 * (-1), 2);
      expect(ev.avgEV).toBeCloseTo((0.8 - 0.6) / 2, 2);
    });
  });

  describe('getRecentSummary', () => {
    it('should return recent performance summary', () => {
      for (let i = 0; i < 20; i++) {
        tracker.recordOutcome(createRecord('crypto', i < 15, 0.75));
      }

      const summary = tracker.getRecentSummary(20);

      expect(summary.total).toBe(20);
      expect(summary.correct).toBe(15);
      expect(summary.accuracy).toBeCloseTo(0.75, 2);
      expect(['improving', 'declining', 'stable']).toContain(summary.trend);
    });

    it('should handle empty tracker', () => {
      const summary = tracker.getRecentSummary(10);

      expect(summary.total).toBe(0);
      expect(summary.accuracy).toBe(0);
    });
  });

  describe('calculateRollingAccuracy', () => {
    it('should calculate rolling accuracy with window', () => {
      // Add 35 records
      for (let i = 0; i < 35; i++) {
        tracker.recordOutcome(createRecord('crypto', i % 2 === 0, 0.7));
      }

      const rolling = tracker.calculateRollingAccuracy(10);

      expect(rolling.length).toBeGreaterThan(0);
      rolling.forEach((acc) => {
        expect(acc).toBeGreaterThanOrEqual(0);
        expect(acc).toBeLessThanOrEqual(1);
      });
    });

    it('should return empty array with insufficient data', () => {
      tracker.recordOutcome(createRecord('crypto', true));

      const rolling = tracker.calculateRollingAccuracy(30);

      expect(rolling).toHaveLength(0);
    });
  });

  describe('getRecordsByCategory', () => {
    it('should return records for specific category', () => {
      for (let i = 0; i < 3; i++) {
        tracker.recordOutcome(createRecord('crypto', true));
      }
      for (let i = 0; i < 2; i++) {
        tracker.recordOutcome(createRecord('sports', true));
      }

      const cryptoRecords = tracker.getRecordsByCategory('crypto');
      const sportsRecords = tracker.getRecordsByCategory('sports');

      expect(cryptoRecords).toHaveLength(3);
      expect(sportsRecords).toHaveLength(2);
    });
  });

  describe('getRecordsByDateRange', () => {
    it('should return records within date range', () => {
      const now = new Date();
      tracker.recordOutcome(createRecord('crypto', true, 0.7, 0)); // today
      tracker.recordOutcome(createRecord('crypto', true, 0.7, 5)); // 5 days ago
      tracker.recordOutcome(createRecord('crypto', true, 0.7, 15)); // 15 days ago

      const start = new Date(now.getTime() - 7 * 86400000);
      const end = new Date(now.getTime() + 86400000);

      const records = tracker.getRecordsByDateRange(start, end);

      expect(records).toHaveLength(2);
    });
  });

  describe('clear', () => {
    it('should clear all records', () => {
      tracker.recordOutcome(createRecord('crypto', true));
      tracker.recordOutcome(createRecord('sports', true));

      tracker.clear();

      expect(tracker.getRecordCount()).toBe(0);
    });
  });
});
