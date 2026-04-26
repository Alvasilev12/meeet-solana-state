import { describe, it, expect, beforeEach } from 'vitest';
import { AgentVoter } from '../src/voting/agent-voter';
import { AgentProfile, Prediction, PredictionOption } from '../src/types';

describe('AgentVoter', () => {
  let voter: AgentVoter;
  let testAgents: AgentProfile[];
  let testPrediction: Prediction;
  let testOptions: PredictionOption[];

  beforeEach(() => {
    voter = new AgentVoter({ minConfidence: 0.6, minAgents: 2 });

    testAgents = [
      {
        agentId: 'agent_1',
        name: 'Expert Agent',
        specialties: ['crypto'],
        totalPredictions: 100,
        correctPredictions: 85,
        accuracy: 0.85,
        streak: 5,
        lastActive: new Date(),
        reputation: 900,
      },
      {
        agentId: 'agent_2',
        name: 'Good Agent',
        specialties: ['crypto', 'sports'],
        totalPredictions: 50,
        correctPredictions: 40,
        accuracy: 0.80,
        streak: 3,
        lastActive: new Date(),
        reputation: 700,
      },
      {
        agentId: 'agent_3',
        name: 'New Agent',
        specialties: ['crypto'],
        totalPredictions: 10,
        correctPredictions: 7,
        accuracy: 0.70,
        streak: 1,
        lastActive: new Date(),
        reputation: 300,
      },
    ];

    testOptions = [
      { value: 'yes', label: 'Yes', probability: 0.65 },
      { value: 'no', label: 'No', probability: 0.35 },
    ];

    testPrediction = {
      id: 'pred_123',
      market: 'crypto_price',
      category: 'crypto',
      question: 'Will BTC go up?',
      description: 'Test prediction',
      options: testOptions,
      createdAt: new Date(),
      resolutionDate: new Date(Date.now() + 86400000),
      status: 'active',
      confidence: 0.65,
      sourceData: {},
      metadata: {},
    };

    // Register agents
    for (const agent of testAgents) {
      voter.registerAgent(agent);
    }
  });

  describe('registerAgent', () => {
    it('should register an agent', () => {
      const agents = voter.getAllAgents();
      expect(agents).toHaveLength(3);
    });

    it('should get agent profile by ID', () => {
      const profile = voter.getAgentProfile('agent_1');
      expect(profile).toBeDefined();
      expect(profile?.name).toBe('Expert Agent');
    });

    it('should return undefined for non-existent agent', () => {
      const profile = voter.getAgentProfile('nonexistent');
      expect(profile).toBeUndefined();
    });
  });

  describe('calculateAgentWeight', () => {
    it('should calculate weight based on accuracy', () => {
      const expert = voter.getAgentProfile('agent_1')!;
      const weight = voter['calculateAgentWeight'](expert);

      expect(weight).toBeGreaterThan(0.5);
      expect(weight).toBeLessThanOrEqual(2.0);
    });

    it('should give higher weight to more accurate agents', () => {
      const expert = voter.getAgentProfile('agent_1')!; // 0.85 accuracy
      const newAgent = voter.getAgentProfile('agent_3')!; // 0.70 accuracy

      const expertWeight = voter['calculateAgentWeight'](expert);
      const newWeight = voter['calculateAgentWeight'](newAgent);

      expect(expertWeight).toBeGreaterThan(newWeight);
    });
  });

  describe('castVote', () => {
    it('should cast a vote for a prediction', () => {
      const vote = voter.castVote({
        agentId: 'agent_1',
        predictionId: 'pred_123',
        selectedOption: 'yes',
        confidence: 0.8,
        reasoning: 'Strong bullish signals',
      });

      expect(vote.agentId).toBe('agent_1');
      expect(vote.selectedOption).toBe('yes');
      expect(vote.weight).toBeGreaterThan(0);
      expect(vote.timestamp).toBeInstanceOf(Date);
    });

    it('should throw error for unregistered agent', () => {
      expect(() =>
        voter.castVote({
          agentId: 'unknown_agent',
          predictionId: 'pred_123',
          selectedOption: 'yes',
          confidence: 0.8,
          reasoning: 'Test',
        })
      ).toThrow('Agent unknown_agent not registered');
    });

    it('should store multiple votes for same prediction', () => {
      voter.castVote({
        agentId: 'agent_1',
        predictionId: 'pred_123',
        selectedOption: 'yes',
        confidence: 0.8,
        reasoning: 'Bullish',
      });

      voter.castVote({
        agentId: 'agent_2',
        predictionId: 'pred_123',
        selectedOption: 'no',
        confidence: 0.7,
        reasoning: 'Bearish',
      });

      const votes = voter.getVotes('pred_123');
      expect(votes).toHaveLength(2);
    });
  });

  describe('calculateResult', () => {
    it('should calculate consensus from votes', () => {
      // All agents vote 'yes'
      voter.castVote({
        agentId: 'agent_1',
        predictionId: 'pred_123',
        selectedOption: 'yes',
        confidence: 0.9,
        reasoning: 'Strong buy',
      });
      voter.castVote({
        agentId: 'agent_2',
        predictionId: 'pred_123',
        selectedOption: 'yes',
        confidence: 0.8,
        reasoning: 'Buy',
      });
      voter.castVote({
        agentId: 'agent_3',
        predictionId: 'pred_123',
        selectedOption: 'yes',
        confidence: 0.7,
        reasoning: 'Likely up',
      });

      const result = voter.calculateResult(testPrediction);

      expect(result.consensus).toBe('yes');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.votes).toHaveLength(3);
    });

    it('should return empty result with no votes', () => {
      const result = voter.calculateResult(testPrediction);

      expect(result.consensus).toBe('');
      expect(result.confidence).toBe(0);
      expect(result.votes).toHaveLength(0);
    });

    it('should handle split votes', () => {
      voter.castVote({
        agentId: 'agent_1',
        predictionId: 'pred_123',
        selectedOption: 'yes',
        confidence: 0.9,
        reasoning: 'Buy',
      });
      voter.castVote({
        agentId: 'agent_2',
        predictionId: 'pred_123',
        selectedOption: 'no',
        confidence: 0.8,
        reasoning: 'Sell',
      });

      const result = voter.calculateResult(testPrediction);

      expect(result.votes).toHaveLength(2);
      expect(result.weightedScores).toHaveProperty('yes');
      expect(result.weightedScores).toHaveProperty('no');
    });
  });

  describe('getResultWithRecommendation', () => {
    it('should return recommendation with voting result', () => {
      voter.castVote({
        agentId: 'agent_1',
        predictionId: 'pred_123',
        selectedOption: 'yes',
        confidence: 0.9,
        reasoning: 'Strong buy',
      });
      voter.castVote({
        agentId: 'agent_2',
        predictionId: 'pred_123',
        selectedOption: 'yes',
        confidence: 0.85,
        reasoning: 'Buy',
      });

      const result = voter.getResultWithRecommendation(testPrediction);

      expect(result).toHaveProperty('consensus');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('recommendation');
      expect(result).toHaveProperty('riskLevel');
      expect(['low', 'medium', 'high']).toContain(result.riskLevel);
    });

    it('should indicate high risk with insufficient votes', () => {
      const result = voter.getResultWithRecommendation(testPrediction);

      expect(result.riskLevel).toBe('high');
      expect(result.recommendation).toContain('Insufficient votes');
    });
  });

  describe('calculateEnsemblePrediction', () => {
    it('should calculate ensemble from multiple sources', () => {
      const sources = [
        { source: 'coingecko', predictedOutcome: 'up', confidence: 0.7 },
        { source: 'coinmarketcap', predictedOutcome: 'up', confidence: 0.8 },
        { source: 'newsapi', predictedOutcome: 'down', confidence: 0.4 },
      ];

      const result = voter.calculateEnsemblePrediction(sources);

      expect(result.consensus).toBe('up');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.sources).toContain('coingecko');
      expect(result.sources).toContain('coinmarketcap');
    });

    it('should handle empty sources', () => {
      const result = voter.calculateEnsemblePrediction([]);

      expect(result.consensus).toBe('');
      expect(result.confidence).toBe(0);
      expect(result.sources).toHaveLength(0);
    });
  });

  describe('getAgentRankings', () => {
    it('should rank agents by accuracy', () => {
      const rankings = voter.getAgentRankings();

      expect(rankings).toHaveLength(3);
      expect(rankings[0].accuracy).toBeGreaterThanOrEqual(rankings[1].accuracy);
    });

    it('should exclude agents with no predictions', () => {
      const inactiveAgent: AgentProfile = {
        agentId: 'agent_inactive',
        name: 'Inactive Agent',
        specialties: ['crypto'],
        totalPredictions: 0,
        correctPredictions: 0,
        accuracy: 0,
        streak: 0,
        lastActive: new Date(),
        reputation: 100,
      };

      voter.registerAgent(inactiveAgent);
      const rankings = voter.getAgentRankings();

      expect(rankings.find((a) => a.agentId === 'agent_inactive')).toBeUndefined();
    });
  });

  describe('getVotingStats', () => {
    it('should return voting statistics', () => {
      voter.castVote({
        agentId: 'agent_1',
        predictionId: 'pred_123',
        selectedOption: 'yes',
        confidence: 0.8,
        reasoning: 'Test',
      });

      const stats = voter.getVotingStats();

      expect(stats.totalAgents).toBe(3);
      expect(stats.totalVotes).toBe(1);
      expect(stats.avgConfidence).toBeGreaterThan(0);
    });
  });

  describe('updateAgentProfile', () => {
    it('should update agent profile', () => {
      voter.updateAgentProfile('agent_1', { accuracy: 0.90, streak: 10 });

      const updated = voter.getAgentProfile('agent_1')!;
      expect(updated.accuracy).toBe(0.90);
      expect(updated.streak).toBe(10);
    });
  });
});
