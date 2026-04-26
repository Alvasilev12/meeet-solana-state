import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CoinGeckoProvider } from '../src/providers/coingecko';
import { EngineConfig } from '../src/types';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
    })),
  },
}));

import axios from 'axios';

const mockConfig: EngineConfig = {
  supabaseUrl: 'https://test.supabase.co',
  supabaseKey: 'test-key',
  coingeckoApiKey: 'test-cg-key',
  minConfidence: 0.6,
  minAgents: 3,
  accuracyTarget: 0.78,
  voteWeightDecay: 0.95,
  stalePredictionHours: 24,
};

describe('CoinGeckoProvider', () => {
  let provider: CoinGeckoProvider;
  let mockGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new CoinGeckoProvider(mockConfig);
    mockGet = (axios.create as ReturnType<typeof vi.fn>).mock.results[0].value.get;
  });

  describe('getPrices', () => {
    it('should fetch prices for multiple symbols', async () => {
      const mockResponse = {
        data: [
          {
            id: 'bitcoin',
            symbol: 'btc',
            name: 'Bitcoin',
            current_price: 95000,
            market_cap: 1800000000000,
            total_volume: 50000000000,
            price_change_percentage_24h: 2.5,
            circulating_supply: 19500000,
            total_supply: 21000000,
            ath: 109000,
            ath_date: '2025-01-01',
            atl: 67,
            atl_date: '2013-07-06',
            sparkline_in_7d: { price: [90000, 92000, 94000, 95000] },
            last_updated: '2025-01-15T12:00:00Z',
          },
        ],
      };

      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await provider.getPrices(['bitcoin']);

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('BTC');
      expect(result[0].name).toBe('Bitcoin');
      expect(result[0].price).toBe(95000);
      expect(result[0].priceChange24h).toBe(2.5);
      expect(result[0].source).toBe('coingecko');
    });

    it('should handle empty response', async () => {
      mockGet.mockResolvedValueOnce({ data: [] });

      const result = await provider.getPrices(['nonexistent']);

      expect(result).toHaveLength(0);
    });

    it('should handle API errors with retry', async () => {
      mockGet
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: [] });

      const result = await provider.getPrices(['bitcoin']);

      expect(result).toHaveLength(0);
      expect(mockGet).toHaveBeenCalledTimes(3);
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      mockGet.mockResolvedValueOnce({ status: 200 });

      const result = await provider.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when API is down', async () => {
      mockGet.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await provider.healthCheck();

      expect(result).toBe(false);
    });
  });
});
