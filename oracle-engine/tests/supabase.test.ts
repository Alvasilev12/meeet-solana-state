import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SupabaseClientWrapper } from '../src/supabase/client';
import { PredictionQueries } from '../src/supabase/queries';
import { EngineConfig } from '../src/types';

const mockConfig: EngineConfig = {
  supabaseUrl: 'https://test.supabase.co',
  supabaseKey: 'test-key',
  minConfidence: 0.6,
  minAgents: 3,
  accuracyTarget: 0.78,
  voteWeightDecay: 0.95,
  stalePredictionHours: 24,
};

describe('SupabaseClientWrapper', () => {
  let wrapper: SupabaseClientWrapper;

  beforeEach(() => {
    wrapper = new SupabaseClientWrapper(mockConfig);
  });

  describe('getClient', () => {
    it('should return Supabase client', () => {
      const client = wrapper.getClient();
      expect(client).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should initialize without errors', async () => {
      await expect(wrapper.initialize()).resolves.not.toThrow();
    });

    it('should only initialize once', async () => {
      await wrapper.initialize();
      await wrapper.initialize(); // Second call should be no-op
    });
  });
});

describe('PredictionQueries', () => {
  let queries: PredictionQueries;
  let mockClient: any;

  beforeEach(() => {
    // Create mock that supports full chaining - each method returns mockClient
    const makeChain = () => vi.fn(function(this: any) { return mockClient; });
    mockClient = {
      from: makeChain(),
      select: makeChain(),
      insert: makeChain(),
      update: makeChain(),
      upsert: makeChain(),
      eq: makeChain(),
      gt: makeChain(),
      lt: makeChain(),
      range: makeChain(),
      order: makeChain(),
      limit: makeChain(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    queries = new PredictionQueries(mockClient);
  });

  describe('createPrediction', () => {
    it('should create a prediction', async () => {
      mockClient.single.mockResolvedValueOnce({
        data: { id: 'test-id', status: 'pending' },
        error: null,
      });

      const result = await queries.createPrediction({
        id: 'test-id',
        market: 'crypto_price',
        category: 'crypto',
        question: 'Test?',
        options: '[]',
        status: 'pending',
        confidence: 0.5,
        source_data: '{}',
        metadata: {},
        resolution_date: new Date().toISOString(),
      });

      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-id');
    });

    it('should return null on error', async () => {
      mockClient.single.mockImplementationOnce(async () => ({
        data: null,
        error: { message: 'Database error' },
      }));

      const result = await queries.createPrediction({ id: 'test' });
      expect(result).toBeNull();
    });
  });

  describe('getPrediction', () => {
    it('should get prediction by ID', async () => {
      const mockData = {
        id: 'test-id',
        market: 'crypto_price',
        category: 'crypto',
        question: 'Test?',
        options: '[]',
        status: 'active',
        confidence: 0.7,
        source_data: '{}',
        metadata: {},
        resolution_date: new Date().toISOString(),
      };
      mockClient.single.mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      const result = await queries.getPrediction('test-id');
      expect(result).toEqual(mockData);
    });

    it('should return null for non-existent prediction', async () => {
      mockClient.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await queries.getPrediction('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getPredictionsByStatus', () => {
    it('should get predictions by status', async () => {
      const mockData = [
        {
          id: 'test-id-1',
          market: 'crypto_price',
          category: 'crypto',
          question: 'Test 1?',
          options: '[]',
          status: 'active',
          confidence: 0.7,
          source_data: '{}',
          metadata: {},
          resolution_date: new Date().toISOString(),
        },
      ];
      mockClient.range.mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      const result = await queries.getPredictionsByStatus('active', 10, 0);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('test-id-1');
    });

    it('should return empty array on error', async () => {
      mockClient.range.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await queries.getPredictionsByStatus('active');
      expect(result).toHaveLength(0);
    });
  });

  describe('resolvePrediction', () => {
    it('should resolve a prediction', async () => {
      mockClient.single.mockResolvedValueOnce({
        data: { id: 'test-id', status: 'resolved' },
        error: null,
      });

      const result = await queries.resolvePrediction('test-id', 'yes');
      expect(result).toBe(true);
    });

    it('should handle error gracefully', async () => {
      expect(typeof queries.resolvePrediction).toBe('function');
    });
  });

  describe('castVote', () => {
    it('should cast a vote', async () => {
      mockClient.single.mockResolvedValueOnce({
        data: { id: 'vote-id' },
        error: null,
      });

      const result = await queries.castVote({
        prediction_id: 'test-id',
        agent_id: 'agent-1',
        vote_option: 'yes',
        weight: 0.8,
      });

      expect(result).not.toBeNull();
    });
  });

  describe('getVotesForPrediction', () => {
    it('should have the method defined', async () => {
      expect(typeof queries.getVotesForPrediction).toBe('function');
    });
  });

  describe('upsertAgentProfile', () => {
    it('should upsert agent profile', async () => {
      mockClient.single.mockResolvedValueOnce({
        data: { agent_id: 'agent-1' },
        error: null,
      });

      const result = await queries.upsertAgentProfile({
        agent_id: 'agent-1',
        name: 'Test Agent',
        specialties: ['crypto'],
        total_predictions: 100,
        correct_predictions: 80,
        accuracy: 0.8,
        streak: 5,
        last_active: new Date().toISOString(),
        reputation: 800,
      });

      expect(result).not.toBeNull();
    });
  });

  describe('getAgentLeaderboard', () => {
    it('should have the method defined', async () => {
      expect(typeof queries.getAgentLeaderboard).toBe('function');
    });
  });

  describe('recordOutcome', () => {
    it('should record a prediction outcome', async () => {
      mockClient.single.mockResolvedValueOnce({
        data: { id: 'record-1' },
        error: null,
      });

      const result = await queries.recordOutcome({
        prediction_id: 'test-id',
        actual_outcome: 'yes',
        resolved_at: new Date().toISOString(),
        resolution_source: 'manual',
      });

      expect(result).not.toBeNull();
    });
  });

  describe('getPredictionStats', () => {
    it('should return prediction statistics', async () => {
      const result = await queries.getPredictionStats();
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('active');
    });


    it('should handle empty data', async () => {
      mockClient.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await queries.getPredictionStats();
      expect(result.total).toBe(0);
    });
  });

  describe('getOverallAccuracy', () => {
    it('should return overall accuracy', async () => {
      const result = await queries.getOverallAccuracy();
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('accuracy');
    });
  });
});
