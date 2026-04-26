import { describe, it, expect, beforeEach } from 'vitest';
import { EngineConfig, NewsData } from '../src/types';

// Don't mock axios - the API calls will fail but that's OK for unit tests
// We test the non-network functionality here

import { NewsAPIProvider } from '../src/providers/newsapi';

const mockConfig: EngineConfig = {
  supabaseUrl: 'https://test.supabase.co',
  supabaseKey: 'test-key',
  newsApiKey: 'test-news-key',
  minConfidence: 0.6,
  minAgents: 3,
  accuracyTarget: 0.78,
  voteWeightDecay: 0.95,
  stalePredictionHours: 24,
};

describe('NewsAPIProvider', () => {
  let provider: NewsAPIProvider;

  beforeEach(() => {
    provider = new NewsAPIProvider(mockConfig);
  });

  describe('constructor', () => {
    it('should create provider with config', () => {
      expect(provider).toBeDefined();
    });
  });

  describe('analyzeSentiment', () => {
    it('should analyze sentiment of multiple articles', () => {
      const articles: NewsData[] = [
        {
          title: 'Market shows strong growth and success',
          description: 'Positive gains across all sectors',
          url: 'https://example.com/1',
          publishedAt: new Date(),
          source: 'Test',
          category: ['crypto'],
          sentiment: 'positive',
          relevanceScore: 0.8,
          lastUpdated: new Date(),
        },
        {
          title: 'Crash and loss in tech stocks',
          description: 'Fear and panic selling continues',
          url: 'https://example.com/2',
          publishedAt: new Date(),
          source: 'Test',
          category: ['crypto'],
          sentiment: 'negative',
          relevanceScore: 0.7,
          lastUpdated: new Date(),
        },
        {
          title: 'Market update for today',
          description: 'Trading activity continues as usual',
          url: 'https://example.com/3',
          publishedAt: new Date(),
          source: 'Test',
          category: ['crypto'],
          sentiment: 'neutral',
          relevanceScore: 0.5,
          lastUpdated: new Date(),
        },
      ];

      const sentiment = provider.analyzeSentiment(articles);

      expect(sentiment.positive).toBeGreaterThanOrEqual(0);
      expect(sentiment.negative).toBeGreaterThanOrEqual(0);
      expect(sentiment.neutral).toBeGreaterThanOrEqual(0);
      expect(['positive', 'negative', 'neutral']).toContain(sentiment.overall);
      expect(sentiment.score).toBeGreaterThanOrEqual(-1);
      expect(sentiment.score).toBeLessThanOrEqual(1);
    });

    it('should return neutral for empty articles', () => {
      const sentiment = provider.analyzeSentiment([]);
      expect(sentiment.overall).toBe('neutral');
      expect(sentiment.score).toBe(0);
    });

    it('should detect positive sentiment from keywords', () => {
      const articles: NewsData[] = [
        {
          title: 'Bitcoin breakthrough and growth',
          description: 'Record gains and profit surge',
          url: 'https://example.com/1',
          publishedAt: new Date(),
          source: 'Test',
          category: ['crypto'],
          sentiment: 'positive',
          relevanceScore: 0.9,
          lastUpdated: new Date(),
        },
      ];
      const sentiment = provider.analyzeSentiment(articles);
      expect(sentiment.positive).toBeGreaterThan(0);
    });

    it('should detect negative sentiment from keywords', () => {
      const articles: NewsData[] = [
        {
          title: 'Market crash and fraud scandal',
          description: 'Fear and loss continues',
          url: 'https://example.com/1',
          publishedAt: new Date(),
          source: 'Test',
          category: ['crypto'],
          sentiment: 'negative',
          relevanceScore: 0.9,
          lastUpdated: new Date(),
        },
      ];
      const sentiment = provider.analyzeSentiment(articles);
      expect(sentiment.negative).toBeGreaterThan(0);
    });
  });

  describe('healthCheck', () => {
    it('should return health check result', async () => {
      // This will fail since we have no real API, but should not throw
      const result = await provider.healthCheck();
      expect(typeof result).toBe('boolean');
    });
  });
});
