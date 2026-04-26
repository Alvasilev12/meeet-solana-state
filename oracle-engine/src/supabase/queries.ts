/**
 * Supabase Database Queries
 * Type-safe database operations for the Oracle Prediction Engine
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  DbPrediction,
  DbAgentVote,
  DbAgentProfile,
  DbPredictionRecord,
  Prediction,
  PredictionStatus,
  PredictionCategory,
  AgentVote,
  AgentProfile,
  PredictionRecord,
} from '../types';

export class PredictionQueries {
  constructor(private client: SupabaseClient) {}

  // ─── Predictions ──────────────────────────────────────────────────────────

  /**
   * Create a new prediction
   */
  async createPrediction(data: Partial<DbPrediction>): Promise<DbPrediction | null> {
    const { data: result, error } = await this.client
      .from('oracle_predictions')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('Error creating prediction:', error);
      return null;
    }
    return result;
  }

  /**
   * Get prediction by ID
   */
  async getPrediction(id: string): Promise<DbPrediction | null> {
    const { data, error } = await this.client
      .from('oracle_predictions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Get predictions by status
   */
  async getPredictionsByStatus(
    status: PredictionStatus,
    limit: number = 50,
    offset: number = 0
  ): Promise<DbPrediction[]> {
    const { data, error } = await this.client
      .from('oracle_predictions')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return [];
    return data ?? [];
  }

  /**
   * Get predictions by category
   */
  async getPredictionsByCategory(
    category: PredictionCategory,
    limit: number = 50
  ): Promise<DbPrediction[]> {
    const { data, error } = await this.client
      .from('oracle_predictions')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return [];
    return data ?? [];
  }

  /**
   * Update prediction
   */
  async updatePrediction(
    id: string,
    updates: Partial<DbPrediction>
  ): Promise<DbPrediction | null> {
    const { data, error } = await this.client
      .from('oracle_predictions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Resolve a prediction
   */
  async resolvePrediction(
    id: string,
    outcome: string,
    confidence: number
  ): Promise<boolean> {
    const { error } = await this.client
      .from('oracle_predictions')
      .update({
        status: 'resolved',
        resolved_outcome: outcome,
        confidence,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return !error;
  }

  /**
   * Get predictions needing resolution
   */
  async getPredictionsNeedingResolution(): Promise<DbPrediction[]> {
    const { data, error } = await this.client
      .from('oracle_predictions')
      .select('*')
      .eq('status', 'active')
      .lt('resolution_date', new Date().toISOString())
      .order('resolution_date', { ascending: true });

    if (error) return [];
    return data ?? [];
  }

  // ─── Agent Votes ──────────────────────────────────────────────────────────

  /**
   * Cast an agent vote
   */
  async castVote(data: Omit<DbAgentVote, 'id' | 'created_at'>): Promise<DbAgentVote | null> {
    const { data: result, error } = await this.client
      .from('oracle_agent_votes')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('Error casting vote:', error);
      return null;
    }
    return result;
  }

  /**
   * Get votes for a prediction
   */
  async getVotesForPrediction(predictionId: string): Promise<DbAgentVote[]> {
    const { data, error } = await this.client
      .from('oracle_agent_votes')
      .select('*')
      .eq('prediction_id', predictionId)
      .order('created_at', { ascending: true });

    if (error) return [];
    return data ?? [];
  }

  /**
   * Get votes by agent
   */
  async getVotesByAgent(agentId: string, limit: number = 50): Promise<DbAgentVote[]> {
    const { data, error } = await this.client
      .from('oracle_agent_votes')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return [];
    return data ?? [];
  }

  // ─── Agent Profiles ───────────────────────────────────────────────────────

  /**
   * Create or update agent profile
   */
  async upsertAgentProfile(data: Omit<DbAgentProfile, 'id' | 'created_at'>): Promise<DbAgentProfile | null> {
    const { data: result, error } = await this.client
      .from('oracle_agent_profiles')
      .upsert(data, { onConflict: 'agent_id' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting agent profile:', error);
      return null;
    }
    return result;
  }

  /**
   * Get agent profile
   */
  async getAgentProfile(agentId: string): Promise<DbAgentProfile | null> {
    const { data, error } = await this.client
      .from('oracle_agent_profiles')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Get agent leaderboard
   */
  async getAgentLeaderboard(limit: number = 20): Promise<DbAgentProfile[]> {
    const { data, error } = await this.client
      .from('oracle_agent_profiles')
      .select('*')
      .gt('total_predictions', 0)
      .order('accuracy', { ascending: false })
      .limit(limit);

    if (error) return [];
    return data ?? [];
  }

  /**
   * Update agent accuracy
   */
  async updateAgentAccuracy(
    agentId: string,
    totalPredictions: number,
    correctPredictions: number
  ): Promise<boolean> {
    const accuracy = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;

    const { error } = await this.client
      .from('oracle_agent_profiles')
      .update({
        total_predictions: totalPredictions,
        correct_predictions: correctPredictions,
        accuracy,
        last_active: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('agent_id', agentId);

    return !error;
  }

  // ─── Prediction Records ───────────────────────────────────────────────────

  /**
   * Record a prediction outcome
   */
  async recordOutcome(data: Omit<DbPredictionRecord, 'id' | 'created_at'>): Promise<DbPredictionRecord | null> {
    const { data: result, error } = await this.client
      .from('oracle_prediction_records')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('Error recording outcome:', error);
      return null;
    }
    return result;
  }

  /**
   * Get prediction records by category
   */
  async getRecordsByCategory(
    category: PredictionCategory,
    limit: number = 100
  ): Promise<DbPredictionRecord[]> {
    const { data, error } = await this.client
      .from('oracle_prediction_records')
      .select('*')
      .eq('category', category)
      .order('resolved_at', { ascending: false })
      .limit(limit);

    if (error) return [];
    return data ?? [];
  }

  /**
   * Get all prediction records
   */
  async getAllRecords(limit: number = 500): Promise<DbPredictionRecord[]> {
    const { data, error } = await this.client
      .from('oracle_prediction_records')
      .select('*')
      .order('resolved_at', { ascending: false })
      .limit(limit);

    if (error) return [];
    return data ?? [];
  }

  // ─── Statistics ───────────────────────────────────────────────────────────

  /**
   * Get prediction statistics
   */
  async getPredictionStats(): Promise<{
    total: number;
    active: number;
    resolved: number;
    pending: number;
    avgConfidence: number;
  }> {
    const { data: allPredictions, error } = await this.client
      .from('oracle_predictions')
      .select('status, confidence');

    if (error) {
      return { total: 0, active: 0, resolved: 0, pending: 0, avgConfidence: 0 };
    }

    const predictions = allPredictions ?? [];
    return {
      total: predictions.length,
      active: predictions.filter((p) => p.status === 'active').length,
      resolved: predictions.filter((p) => p.status === 'resolved').length,
      pending: predictions.filter((p) => p.status === 'pending').length,
      avgConfidence: predictions.length > 0
        ? predictions.reduce((sum, p) => sum + (p.confidence ?? 0), 0) / predictions.length
        : 0,
    };
  }

  /**
   * Get overall accuracy
   */
  async getOverallAccuracy(): Promise<{
    total: number;
    correct: number;
    accuracy: number;
  }> {
    const { data: records, error } = await this.client
      .from('oracle_prediction_records')
      .select('is_correct');

    if (error) {
      return { total: 0, correct: 0, accuracy: 0 };
    }

    const allRecords = records ?? [];
    const correct = allRecords.filter((r) => r.is_correct).length;

    return {
      total: allRecords.length,
      correct,
      accuracy: allRecords.length > 0 ? correct / allRecords.length : 0,
    };
  }
}
