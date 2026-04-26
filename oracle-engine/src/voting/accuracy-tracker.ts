/**
 * Accuracy Tracker
 * Tracks and analyzes prediction accuracy over time
 */

import {
  AccuracyMetrics,
  PredictionRecord,
  PredictionCategory,
  AgentProfile,
} from '../types';
import {
  calculateBrierScore,
  calculateLogLoss,
  movingAverage,
  clamp,
} from '../utils';

const ALL_CATEGORIES: PredictionCategory[] = ['crypto', 'sports', 'news', 'weather', 'economics'];

export class AccuracyTracker {
  private records: PredictionRecord[] = [];
  private agentRecords: Map<string, PredictionRecord[]> = new Map();
  private readonly minSamples: number;

  constructor(options?: { minSamples?: number }) {
    this.minSamples = options?.minSamples ?? 10;
  }

  /**
   * Record a prediction outcome
   */
  recordOutcome(record: PredictionRecord): void {
    this.records.push(record);

    // Track by category
    if (!this.agentRecords.has(record.category)) {
      this.agentRecords.set(record.category, []);
    }
    this.agentRecords.get(record.category)!.push(record);
  }

  /**
   * Record batch outcomes
   */
  recordOutcomes(records: PredictionRecord[]): void {
    for (const record of records) {
      this.recordOutcome(record);
    }
  }

  /**
   * Get all records
   */
  getRecords(): PredictionRecord[] {
    return [...this.records];
  }

  /**
   * Get records for a specific category
   */
  getRecordsByCategory(category: PredictionCategory): PredictionRecord[] {
    return this.agentRecords.get(category) ?? [];
  }

  /**
   * Get records within a date range
   */
  getRecordsByDateRange(start: Date, end: Date): PredictionRecord[] {
    return this.records.filter(
      (r) => r.resolvedAt >= start && r.resolvedAt <= end
    );
  }

  /**
   * Calculate overall accuracy metrics
   */
  calculateOverallMetrics(): AccuracyMetrics {
    const total = this.records.length;
    const correct = this.records.filter((r) => r.isCorrect).length;
    const confidenceValues = this.records.map((r) => r.confidence);
    const avgConfidence = total > 0
      ? confidenceValues.reduce((a, b) => a + b, 0) / total
      : 0;

    // Calculate Brier score
    const predictions = this.records.map((r) => r.confidence);
    const outcomes = this.records.map((r) => r.isCorrect ? 1 : 0);
    const brierScore = calculateBrierScore(predictions, outcomes);

    return {
      overall: {
        total,
        correct,
        accuracy: total > 0 ? correct / total : 0,
        avgConfidence,
        brierScore,
      },
      byCategory: this.calculateCategoryMetrics(),
      byAgent: this.calculateAgentMetrics(),
      trend: this.calculateTrend(),
    };
  }

  /**
   * Calculate accuracy by category
   */
  private calculateCategoryMetrics(): AccuracyMetrics['byCategory'] {
    const metrics: AccuracyMetrics['byCategory'] = {} as AccuracyMetrics['byCategory'];

    for (const category of ALL_CATEGORIES) {
      const records = this.agentRecords.get(category) ?? [];
      const total = records.length;
      const correct = records.filter((r) => r.isCorrect).length;

      metrics[category] = {
        total,
        correct,
        accuracy: total > 0 ? correct / total : 0,
      };
    }

    return metrics;
  }

  /**
   * Calculate accuracy by agent
   */
  private calculateAgentMetrics(): AccuracyMetrics['byAgent'] {
    // Group records by agent (using predictionId prefix as agent identifier)
    const agentMap: Map<string, PredictionRecord[]> = new Map();

    for (const record of this.records) {
      // Extract agent ID from prediction ID or use a default
      const agentId = this.extractAgentId(record.predictionId) ?? 'default';
      if (!agentMap.has(agentId)) {
        agentMap.set(agentId, []);
      }
      agentMap.get(agentId)!.push(record);
    }

    const metrics: AccuracyMetrics['byAgent'] = {};

    for (const [agentId, records] of Array.from(this.agentRecords.entries())) {
      const total = records.length;
      const correct = records.filter((r) => r.isCorrect).length;
      const avgConfidence = total > 0
        ? records.reduce((sum, r) => sum + r.confidence, 0) / total
        : 0;

      metrics[agentId] = {
        total,
        correct,
        accuracy: total > 0 ? correct / total : 0,
        avgWeight: avgConfidence, // Use confidence as proxy for weight
      };
    }

    return metrics;
  }

  /**
   * Calculate accuracy trend over time
   */
  private calculateTrend(): AccuracyMetrics['trend'] {
    if (this.records.length === 0) return [];

    // Sort by resolution date
    const sorted = [...this.records].sort(
      (a, b) => a.resolvedAt.getTime() - b.resolvedAt.getTime()
    );

    // Group by day
    const dailyMap: Map<string, { total: number; correct: number }> = new Map();

    for (const record of sorted) {
      const dateKey = record.resolvedAt.toISOString().split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { total: 0, correct: 0 });
      }
      const day = dailyMap.get(dateKey)!;
      day.total++;
      if (record.isCorrect) day.correct++;
    }

    // Calculate daily accuracy
    const trend: AccuracyMetrics['trend'] = [];
    for (const [date, data] of Array.from(dailyMap.entries())) {
      trend.push({
        date,
        accuracy: data.total > 0 ? data.correct / data.total : 0,
        total: data.total,
      });
    }

    return trend.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate rolling accuracy with a window
   */
  calculateRollingAccuracy(window: number = 30): number[] {
    if (this.records.length < window) return [];

    const sorted = [...this.records].sort(
      (a, b) => a.resolvedAt.getTime() - b.resolvedAt.getTime()
    );

    const accuracies = sorted.map((r) => r.isCorrect ? 1 : 0);
    return movingAverage(accuracies, window);
  }

  /**
   * Check if accuracy target is met
   */
  isTargetMet(target: number = 0.78): boolean {
    const metrics = this.calculateOverallMetrics();
    return metrics.overall.accuracy >= target && metrics.overall.total >= this.minSamples;
  }

  /**
   * Get confidence calibration
   * Checks if confidence scores match actual accuracy
   */
  getCalibration(): {
    buckets: Array<{ range: string; predicted: number; actual: number; count: number }>;
    isCalibrated: boolean;
  } {
    const buckets = [
      { min: 0, max: 0.2, range: '0-20%', predicted: 0.1 },
      { min: 0.2, max: 0.4, range: '20-40%', predicted: 0.3 },
      { min: 0.4, max: 0.6, range: '40-60%', predicted: 0.5 },
      { min: 0.6, max: 0.8, range: '60-80%', predicted: 0.7 },
      { min: 0.8, max: 1.0, range: '80-100%', predicted: 0.9 },
    ];

    const result = buckets.map((bucket) => {
      const inBucket = this.records.filter(
        (r) => r.confidence >= bucket.min && r.confidence < bucket.max
      );
      const total = inBucket.length;
      const correct = inBucket.filter((r) => r.isCorrect).length;

      return {
        range: bucket.range,
        predicted: bucket.predicted,
        actual: total > 0 ? correct / total : 0,
        count: total,
      };
    });

    // Check if calibrated (predicted ≈ actual within tolerance)
    const isCalibrated = result
      .filter((r) => r.count > 0)
      .every((r) => Math.abs(r.predicted - r.actual) < 0.15);

    return { buckets: result, isCalibrated };
  }

  /**
   * Calculate expected value of predictions
   */
  calculateExpectedValue(): {
    totalEV: number;
    avgEV: number;
    byCategory: Record<string, number>;
  } {
    const totalEV = this.records.reduce((sum, r) => {
      // EV = confidence * (isCorrect ? 1 : -1)
      return sum + r.confidence * (r.isCorrect ? 1 : -1);
    }, 0);

    const avgEV = this.records.length > 0 ? totalEV / this.records.length : 0;

    const byCategory: Record<string, number> = {};
    for (const category of ALL_CATEGORIES) {
      const records = this.agentRecords.get(category) ?? [];
      const ev = records.reduce((sum, r) => {
        return sum + r.confidence * (r.isCorrect ? 1 : -1);
      }, 0);
      byCategory[category] = records.length > 0 ? ev / records.length : 0;
    }

    return { totalEV, avgEV, byCategory };
  }

  /**
   * Get recent performance summary
   */
  getRecentSummary(lastN: number = 50): {
    accuracy: number;
    total: number;
    correct: number;
    avgConfidence: number;
    trend: 'improving' | 'declining' | 'stable';
  } {
    const recent = this.records.slice(-lastN);
    const total = recent.length;
    const correct = recent.filter((r) => r.isCorrect).length;
    const accuracy = total > 0 ? correct / total : 0;
    const avgConfidence = total > 0
      ? recent.reduce((sum, r) => sum + r.confidence, 0) / total
      : 0;

    // Determine trend
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recent.length >= 10) {
      const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
      const secondHalf = recent.slice(Math.floor(recent.length / 2));
      const firstAccuracy = firstHalf.filter((r) => r.isCorrect).length / firstHalf.length;
      const secondAccuracy = secondHalf.filter((r) => r.isCorrect).length / secondHalf.length;
      const diff = secondAccuracy - firstAccuracy;
      if (diff > 0.05) trend = 'improving';
      else if (diff < -0.05) trend = 'declining';
    }

    return { accuracy, total, correct, avgConfidence, trend };
  }

  /**
   * Extract agent ID from prediction ID
   */
  private extractAgentId(predictionId: string): string | null {
    // Simple heuristic: use first part before underscore
    const parts = predictionId.split('_');
    return parts.length > 1 ? parts[0] : null;
  }

  /**
   * Clear all records
   */
  clear(): void {
    this.records = [];
    this.agentRecords.clear();
  }

  /**
   * Get record count
   */
  getRecordCount(): number {
    return this.records.length;
  }
}
