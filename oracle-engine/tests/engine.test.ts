import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EngineConfig } from '../src/types';

// Mock all provider modules before importing the engine
const mockCoinGeckoInstance = {
  getPrices: vi.fn().mockResolvedValue([
    {
      symbol: 'BTC', name: 'Bitcoin', price: 95000, priceChange24h: 2.5,
      priceChange7d: 5.0, marketCap: 1800000000000, volume24h: 50000000000,
      circulatingSupply: 19500000, totalSupply: 21000000, ath: 109000,
      athDate: '2025-01-01', atl: 67, atlDate: '2013-07-06',
      sparkline: [90000, 92000, 94000, 95000], lastUpdated: new Date(), source: 'coingecko',
    },
  ]),
  healthCheck: vi.fn().mockResolvedValue(true),
};

const mockCoinMarketCapInstance = {
  getQuotes: vi.fn().mockResolvedValue([
    {
      symbol: 'BTC', name: 'Bitcoin', price: 95200, priceChange24h: 2.7,
      priceChange7d: 5.2, marketCap: 1810000000000, volume24h: 51000000000,
      circulatingSupply: 19500000, totalSupply: 21000000, ath: 109000,
      athDate: '2025-01-01', atl: 67, atlDate: '2013-07-06',
      sparkline: [], lastUpdated: new Date(), source: 'coinmarketcap',
    },
  ]),
  healthCheck: vi.fn().mockResolvedValue(true),
};

const mockSportsDataInstance = {
  getUpcomingFixtures: vi.fn().mockResolvedValue([
    {
      league: 'Premier League', sport: 'Football',
      homeTeam: 'Manchester United', awayTeam: 'Liverpool',
      homeScore: undefined, awayScore: undefined, status: 'scheduled',
      startDate: new Date(Date.now() + 86400000), venue: 'Old Trafford',
      odds: { homeWin: 0.4, draw: 0.3, awayWin: 0.3 },
      lastUpdated: new Date(), source: 'sportsdata',
    },
  ]),
  healthCheck: vi.fn().mockResolvedValue(true),
};

const mockNewsApiInstance = {
  search: vi.fn().mockResolvedValue([
    {
      title: 'Bitcoin reaches new high', description: 'BTC surges past $95K',
      url: 'https://example.com', publishedAt: new Date(), source: 'CryptoNews',
      category: ['crypto'], sentiment: 'positive', relevanceScore: 0.8,
      lastUpdated: new Date(),
    },
  ]),
  analyzeSentiment: vi.fn().mockReturnValue({
    positive: 1, negative: 0, neutral: 0, overall: 'positive', score: 1,
  }),
  healthCheck: vi.fn().mockResolvedValue(true),
};

const mockSupabaseInstance = {
  initialize: vi.fn().mockResolvedValue(undefined),
  getClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
  healthCheck: vi.fn().mockResolvedValue(true),
};

const mockQueriesInstance = {
  createPrediction: vi.fn().mockResolvedValue({ id: 'test-id' }),
  getPrediction: vi.fn().mockResolvedValue(null),
  getPredictionsByStatus: vi.fn().mockResolvedValue([]),
  getPredictionsByCategory: vi.fn().mockResolvedValue([]),
  updatePrediction: vi.fn().mockResolvedValue(null),
  resolvePrediction: vi.fn().mockResolvedValue(true),
  getPredictionsNeedingResolution: vi.fn().mockResolvedValue([]),
  castVote: vi.fn().mockResolvedValue(null),
  getVotesForPrediction: vi.fn().mockResolvedValue([]),
  upsertAgentProfile: vi.fn().mockResolvedValue(null),
  getAgentProfile: vi.fn().mockResolvedValue(null),
  getAgentLeaderboard: vi.fn().mockResolvedValue([]),
  recordOutcome: vi.fn().mockResolvedValue(null),
  getAllRecords: vi.fn().mockResolvedValue([]),
  getPredictionStats: vi.fn().mockResolvedValue({
    total: 0, active: 0, resolved: 0, pending: 0, avgConfidence: 0,
  }),
  getOverallAccuracy: vi.fn().mockResolvedValue({
    total: 0, correct: 0, accuracy: 0,
  }),
};

vi.mock('../src/providers/coingecko', () => ({
  CoinGeckoProvider: class {
    constructor() { Object.assign(this, mockCoinGeckoInstance); }
  },
}));

vi.mock('../src/providers/coinmarketcap', () => ({
  CoinMarketCapProvider: class {
    constructor() { Object.assign(this, mockCoinMarketCapInstance); }
  },
}));

vi.mock('../src/providers/sportsdata', () => ({
  SportsDataProvider: class {
    constructor() { Object.assign(this, mockSportsDataInstance); }
  },
}));

vi.mock('../src/providers/newsapi', () => ({
  NewsAPIProvider: class {
    constructor() { Object.assign(this, mockNewsApiInstance); }
  },
}));

vi.mock('../src/supabase/client', () => ({
  SupabaseClientWrapper: class {
    constructor() { Object.assign(this, mockSupabaseInstance); }
  },
}));

vi.mock('../src/supabase/queries', () => ({
  PredictionQueries: class {
    constructor() { Object.assign(this, mockQueriesInstance); }
  },
}));

// Import engine AFTER mocks are set up
import { OraclePredictionEngine } from '../src/engine';

const mockConfig: EngineConfig = {
  supabaseUrl: 'https://test.supabase.co',
  supabaseKey: 'test-key',
  coingeckoApiKey: 'test-cg-key',
  coinmarketcapApiKey: 'test-cmc-key',
  sportsdataApiKey: 'test-sports-key',
  newsApiKey: 'test-news-key',
  minConfidence: 0.6,
  minAgents: 2,
  accuracyTarget: 0.78,
  voteWeightDecay: 0.95,
  stalePredictionHours: 24,
};

describe('OraclePredictionEngine', () => {
  let engine: OraclePredictionEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new OraclePredictionEngine(mockConfig);
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await engine.initialize();
      expect(true).toBe(true);
    });
  });

  describe('collectCryptoData', () => {
    it('should collect crypto data from multiple sources', async () => {
      await engine.initialize();
      const data = await engine.collectCryptoData(['btc']);
      expect(data.length).toBeGreaterThanOrEqual(1);
      expect(data[0].symbol).toBe('BTC');
      expect(data[0].price).toBeGreaterThan(0);
    });
  });

  describe('collectSportsData', () => {
    it('should collect sports data', async () => {
      await engine.initialize();
      const data = await engine.collectSportsData(39, 2025);
      expect(data).toHaveLength(1);
      expect(data[0].homeTeam).toBe('Manchester United');
      expect(data[0].awayTeam).toBe('Liverpool');
    });
  });

  describe('collectNewsData', () => {
    it('should collect news data', async () => {
      await engine.initialize();
      const data = await engine.collectNewsData('bitcoin');
      expect(data).toHaveLength(1);
      expect(data[0].title).toContain('Bitcoin');
    });
  });

  describe('generateCryptoPrediction', () => {
    it('should generate a crypto price prediction', async () => {
      await engine.initialize();
      const timeframe = new Date(Date.now() + 30 * 86400000);
      const prediction = await engine.generateCryptoPrediction('BTC', 100000, timeframe);
      expect(prediction.market).toBe('crypto_price');
      expect(prediction.category).toBe('crypto');
      expect(prediction.question).toContain('Bitcoin');
      expect(prediction.options).toHaveLength(2);
      expect(prediction.status).toBe('active');
    });
  });

  describe('generateSportsPrediction', () => {
    it('should generate a sports prediction', async () => {
      await engine.initialize();
      const prediction = await engine.generateSportsPrediction(39, 2025);
      expect(prediction.market).toBe('sports_outcome');
      expect(prediction.category).toBe('sports');
      expect(prediction.question).toContain('Manchester United');
      expect(prediction.options).toHaveLength(3);
    });

    it('should throw error when no fixtures available', async () => {
      await engine.initialize();
      const sportsdata = (engine as any).sportsdata;
      sportsdata.getUpcomingFixtures.mockResolvedValueOnce([]);
      await expect(
        engine.generateSportsPrediction(999, 2025)
      ).rejects.toThrow('No fixtures available');
    });
  });

  describe('generateNewsPrediction', () => {
    it('should generate a news-based prediction', async () => {
      await engine.initialize();
      const timeframe = new Date(Date.now() + 7 * 86400000);
      const prediction = await engine.generateNewsPrediction('Bitcoin regulation', timeframe);
      expect(prediction.market).toBe('news_event');
      expect(prediction.category).toBe('news');
      expect(prediction.options).toHaveLength(2);
    });
  });

  describe('runVoting', () => {
    it('should run voting for a prediction', async () => {
      await engine.initialize();
      const prediction = {
        id: 'test_pred',
        market: 'crypto_price' as const,
        category: 'crypto' as const,
        question: 'Test question?',
        description: 'Test',
        options: [
          { value: 'yes', label: 'Yes', probability: 0.6 },
          { value: 'no', label: 'No', probability: 0.4 },
        ],
        createdAt: new Date(),
        resolutionDate: new Date(Date.now() + 86400000),
        status: 'active' as const,
        confidence: 0.6,
        sourceData: {},
        metadata: {},
      };
      const result = await engine.runVoting(prediction);
      expect(result).toHaveProperty('prediction');
      expect(result).toHaveProperty('votingResult');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('recommendedAction');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('dataSources');
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      await engine.initialize();
      const health = await engine.healthCheck();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('sources');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });

  describe('getMetrics', () => {
    it('should return engine metrics', async () => {
      await engine.initialize();
      const metrics = await engine.getMetrics();
      expect(metrics).toHaveProperty('totalPredictions');
      expect(metrics).toHaveProperty('activePredictions');
      expect(metrics).toHaveProperty('resolvedPredictions');
      expect(metrics).toHaveProperty('overallAccuracy');
      expect(metrics).toHaveProperty('agentsActive');
      expect(metrics).toHaveProperty('uptime');
    });
  });

  describe('getAccuracyMetrics', () => {
    it('should return accuracy metrics', async () => {
      await engine.initialize();
      const metrics = engine.getAccuracyMetrics();
      expect(metrics).toHaveProperty('overall');
      expect(metrics).toHaveProperty('byCategory');
      expect(metrics).toHaveProperty('byAgent');
      expect(metrics).toHaveProperty('trend');
    });
  });

  describe('isAccuracyTargetMet', () => {
    it('should check if accuracy target is met', async () => {
      await engine.initialize();
      const met = engine.isAccuracyTargetMet(0.78);
      expect(typeof met).toBe('boolean');
    });
  });

  describe('shutdown', () => {
    it('should shutdown without errors', async () => {
      await engine.initialize();
      expect(() => engine.shutdown()).not.toThrow();
    });
  });
});
