/**
 * Agent Voting Algorithm
 * Weighted voting system based on agent historical accuracy
 */

import {
  AgentVote,
  AgentProfile,
  Prediction,
  VotingResult,
  PredictionOption,
} from '../types';
import { clamp, consensusStrength, generateId, weightedAverage } from '../utils';

export class AgentVoter {
  private agents: Map<string, AgentProfile> = new Map();
  private votes: Map<string, AgentVote[]> = new Map(); // predictionId -> votes
  private readonly minConfidence: number;
  private readonly minAgents: number;
  private readonly weightDecay: number;

  constructor(options?: {
    minConfidence?: number;
    minAgents?: number;
    weightDecay?: number;
  }) {
    this.minConfidence = options?.minConfidence ?? 0.6;
    this.minAgents = options?.minAgents ?? 3;
    this.weightDecay = options?.weightDecay ?? 0.95;
  }

  /**
   * Register an agent with the voting system
   */
  registerAgent(profile: AgentProfile): void {
    this.agents.set(profile.agentId, profile);
  }

  /**
   * Update an agent's profile
   */
  updateAgentProfile(agentId: string, updates: Partial<AgentProfile>): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      this.agents.set(agentId, { ...agent, ...updates });
    }
  }

  /**
   * Get agent profile
   */
  getAgentProfile(agentId: string): AgentProfile | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): AgentProfile[] {
    return Array.from(this.agents.values());
  }

  /**
   * Calculate dynamic weight for an agent based on their accuracy
   */
  calculateAgentWeight(agent: AgentProfile): number {
    // Base weight from accuracy (0.3 - 1.0 range)
    const accuracyWeight = 0.3 + agent.accuracy * 0.7;

    // Bonus for streak (up to 1.2x)
    const streakBonus = 1 + Math.min(agent.streak * 0.02, 0.2);

    // Penalty for low experience
    const experienceFactor = Math.min(agent.totalPredictions / 10, 1);
    const experienceWeight = 0.5 + experienceFactor * 0.5;

    // Reputation factor (0.8 - 1.2 range)
    const reputationFactor = 0.8 + Math.min(agent.reputation / 1000, 0.4);

    const weight = accuracyWeight * streakBonus * experienceWeight * reputationFactor;
    return clamp(weight, 0.1, 2.0);
  }

  /**
   * Cast a vote for a prediction
   */
  castVote(vote: Omit<AgentVote, 'weight' | 'timestamp'>): AgentVote {
    const agent = this.agents.get(vote.agentId);
    if (!agent) {
      throw new Error(`Agent ${vote.agentId} not registered`);
    }

    const weight = this.calculateAgentWeight(agent);
    const fullVote: AgentVote = {
      ...vote,
      weight,
      timestamp: new Date(),
    };

    // Store vote
    const existingVotes = this.votes.get(vote.predictionId) ?? [];
    existingVotes.push(fullVote);
    this.votes.set(vote.predictionId, existingVotes);

    return fullVote;
  }

  /**
   * Get all votes for a prediction
   */
  getVotes(predictionId: string): AgentVote[] {
    return this.votes.get(predictionId) ?? [];
  }

  /**
   * Calculate weighted voting result for a prediction
   */
  calculateResult(prediction: Prediction): VotingResult {
    const votes = this.votes.get(prediction.id) ?? [];

    if (votes.length === 0) {
      return this.createEmptyResult(prediction.id);
    }

    // Calculate weighted scores for each option
    const weightedScores: Record<string, number> = {};
    let totalWeight = 0;

    for (const vote of votes) {
      if (!weightedScores[vote.selectedOption]) {
        weightedScores[vote.selectedOption] = 0;
      }
      weightedScores[vote.selectedOption] += vote.weight * vote.confidence;
      totalWeight += vote.weight;
    }

    // Normalize scores to probabilities
    if (totalWeight > 0) {
      for (const option of Object.keys(weightedScores)) {
        weightedScores[option] /= totalWeight;
      }
    }

    // Find consensus
    const consensusOption = Object.entries(weightedScores).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0];

    const consensus = weightedScores[consensusOption];

    // Calculate confidence based on vote distribution
    const { strength } = consensusStrength(
      Object.fromEntries(
        votes.map((v) => [v.selectedOption, v.weight])
      )
    );

    const confidence = clamp(consensus * strength, 0, 1);

    return {
      predictionId: prediction.id,
      consensus: consensusOption,
      confidence,
      votes,
      weightedScores,
      timestamp: new Date(),
    };
  }

  /**
   * Get voting result with recommendation
   */
  getResultWithRecommendation(
    prediction: Prediction
  ): VotingResult & { recommendation: string; riskLevel: string } {
    const result = this.calculateResult(prediction);
    const { recommendation, riskLevel } = this.generateRecommendation(result);

    return { ...result, recommendation, riskLevel };
  }

  /**
   * Generate recommendation based on voting result
   */
  private generateRecommendation(result: VotingResult): {
    recommendation: string;
    riskLevel: 'low' | 'medium' | 'high';
  } {
    if (result.votes.length < this.minAgents) {
      return {
        recommendation: `Insufficient votes (${result.votes.length}/${this.minAgents}). Awaiting more agent input.`,
        riskLevel: 'high',
      };
    }

    if (result.confidence >= 0.8) {
      return {
        recommendation: `Strong consensus: ${result.consensus} (confidence: ${(result.confidence * 100).toFixed(1)}%)`,
        riskLevel: 'low',
      };
    }

    if (result.confidence >= 0.6) {
      return {
        recommendation: `Moderate consensus: ${result.consensus} (confidence: ${(result.confidence * 100).toFixed(1)}%)`,
        riskLevel: 'medium',
      };
    }

    return {
      recommendation: `Weak consensus on ${result.consensus}. High disagreement among agents.`,
      riskLevel: 'high',
    };
  }

  /**
   * Create empty result for predictions without votes
   */
  private createEmptyResult(predictionId: string): VotingResult {
    return {
      predictionId,
      consensus: '',
      confidence: 0,
      votes: [],
      weightedScores: {},
      timestamp: new Date(),
    };
  }

  /**
   * Calculate ensemble prediction from multiple data sources
   */
  calculateEnsemblePrediction(
    sourcePredictions: Array<{
      source: string;
      predictedOutcome: string;
      confidence: number;
    }>
  ): {
    consensus: string;
    confidence: number;
    sources: string[];
  } {
    if (sourcePredictions.length === 0) {
      return { consensus: '', confidence: 0, sources: [] };
    }

    // Weight by confidence
    const scores: Record<string, number> = {};
    let totalWeight = 0;

    for (const pred of sourcePredictions) {
      if (!scores[pred.predictedOutcome]) {
        scores[pred.predictedOutcome] = 0;
      }
      scores[pred.predictedOutcome] += pred.confidence;
      totalWeight += pred.confidence;
    }

    if (totalWeight > 0) {
      for (const option of Object.keys(scores)) {
        scores[option] /= totalWeight;
      }
    }

    const consensus = Object.entries(scores).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0];

    return {
      consensus,
      confidence: scores[consensus],
      sources: sourcePredictions.map((p) => p.source),
    };
  }

  /**
   * Get agent rankings by accuracy
   */
  getAgentRankings(): AgentProfile[] {
    return Array.from(this.agents.values())
      .filter((a) => a.totalPredictions > 0)
      .sort((a, b) => {
        // Sort by accuracy first, then by total predictions
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        return b.totalPredictions - a.totalPredictions;
      });
  }

  /**
   * Get voting statistics
   */
  getVotingStats(): {
    totalAgents: number;
    activeAgents: number;
    totalVotes: number;
    avgConfidence: number;
    avgWeight: number;
  } {
    const agents = this.getAllAgents();
    const allVotes = Array.from(this.votes.values()).flat();

    return {
      totalAgents: agents.length,
      activeAgents: agents.filter((a) => a.totalPredictions > 0).length,
      totalVotes: allVotes.length,
      avgConfidence: allVotes.length > 0
        ? allVotes.reduce((sum, v) => sum + v.confidence, 0) / allVotes.length
        : 0,
      avgWeight: allVotes.length > 0
        ? allVotes.reduce((sum, v) => sum + v.weight, 0) / allVotes.length
        : 0,
    };
  }
}
