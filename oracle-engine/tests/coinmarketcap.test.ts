import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CoinMarketCapProvider } from '../src/providers/coinmarketcap';
import { EngineConfig } from '../src/types';

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
  coinmarketcapApiKey: 'test-cmc-key',
  minConfidence: 0.6,
  minAgents: 3,
  accuracyTarget: 0.78,
  voteWeightDecay: 0.95,
  stalePredictionHours: 24,
};

describe('CoinMarketCapProvider', () => {
  let provider: CoinMarketCapProvider;
  let mockGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new CoinMarketCapProvider(mockConfig);
    mockGet = (axios.create as ReturnType<typeof vi.fn>).mock.results[0].value.get;
  });

  describe('getLatestListings', () => {
    it('should fetch latest cryptocurrency listings', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 1,
              name: 'Bitcoin',
              symbol: 'BTC',
              slug: 'bitcoin',
              circulating_supply: 19500000,
              total_supply: 21000000,
              quote: {
                USD: {
                  price: 95000,
                  volume_24h: 50000000000,
                  percent_change_24h: 2.5,
                  percent_change_7d: 5.0,
                  market_cap: 1800000000000,
                  ath: 109000,
                  ath_date: '2025-01-01T00:00:00Z',
                  atl: 67,
                  atl_date: '2013-07-06T00:00:00Z',
                  last_updated: '2025-01-15T12:00:00Z',
                },
              },
            },
          ],
          status: {
            timestamp: '2025-01-15T12:00:00Z',
            error_code: 0,
            error_message: null,
            elapsed: 10,
            credit_count: 1,
          },
        },
      };

      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await provider.getLatestListings(1);

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('BTC');
      expect(result[0].name).toBe('Bitcoin');
      expect(result[0].price).toBe(95000);
      expect(result[0].priceChange24h).toBe(2.5);
      expect(result[0].priceChange7d).toBe(5.0);
      expect(result[0].source).toBe('coinmarketcap');
    });
  });

  describe('getQuotes', () => {
    it('should fetch quotes for specific symbols', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 1027,
              name: 'Ethereum',
              symbol: 'ETH',
              slug: 'ethereum',
              circulating_supply: 120000000,
              total_supply: 120000000,
              quote: {
                USD: {
                  price: 3500,
                  volume_24h: 20000000000,
                  percent_change_24h: -1.2,
                  percent_change_7d: 3.5,
                  market_cap: 420000000000,
                  ath: 4800,
                  ath_date: '2024-11-10T00:00:00Z',
                  atl: 0.43,
                  atl_date: '2015-10-20T00:00:00Z',
                  last_updated: '2025-01-15T12:00:00Z',
                },
              },
            },
          ],
          status: {
            timestamp: '2025-01-15T12:00:00Z',
            error_code: 0,
            error_message: null,
            elapsed: 5,
            credit_count: 1,
          },
        },
      };

      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await provider.getQuotes(['ETH']);

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('ETH');
      expect(result[0].price).toBe(3500);
    });
  });

  describe('getGlobalMetrics', () => {
    it('should fetch global market metrics', async () => {
      const mockResponse = {
        data: {
          data: {
            active_cryptocurrencies: 15000,
            quote: {
              USD: {
                total_market_cap: 3500000000000,
                total_volume_24h: 150000000000,
                btc_dominance: 54.2,
                eth_dominance: 18.5,
              },
            },
          },
        },
      };

      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await provider.getGlobalMetrics();

      expect(result.activeCryptocurrencies).toBe(15000);
      expect(result.totalMarketCap).toBe(3500000000000);
      expect(result.btcDominance).toBe(54.2);
      expect(result.ethDominance).toBe(18.5);
    });
  });

  describe('healthCheck', () => {
    it('should return true when API key is valid', async () => {
      mockGet.mockResolvedValueOnce({ data: {} });

      const result = await provider.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when API key is invalid', async () => {
      mockGet.mockRejectedValueOnce(new Error('Invalid API key'));

      const result = await provider.healthCheck();

      expect(result).toBe(false);
    });
  });
});
