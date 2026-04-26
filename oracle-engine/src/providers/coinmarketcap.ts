/**
 * CoinMarketCap API Provider
 * Alternative cryptocurrency data source for cross-validation
 */

import axios, { AxiosInstance } from 'axios';
import { CoinMarketCapResponse, CryptoData, EngineConfig } from '../types';
import { retry, parseDate } from '../utils';

const CMC_BASE_URL = 'https://pro-api.coinmarketcap.com/v1';

export class CoinMarketCapProvider {
  private client: AxiosInstance;
  private apiKey?: string;

  constructor(config: EngineConfig) {
    this.apiKey = config.coinmarketcapApiKey;
    this.client = axios.create({
      baseURL: CMC_BASE_URL,
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(this.apiKey ? { 'X-CMC_PRO_API_KEY': this.apiKey } : {}),
      },
    });
  }

  /**
   * Fetch latest cryptocurrency listings
   */
  async getLatestListings(limit: number = 50): Promise<CryptoData[]> {
    return retry(async () => {
      const response = await this.client.get('/cryptocurrency/listings/latest', {
        params: {
          limit,
          convert: 'USD',
        },
      });

      const data = response.data as CoinMarketCapResponse;
      return data.data.map(this.mapToCryptoData);
    });
  }

  /**
   * Fetch quotes for specific cryptocurrencies
   */
  async getQuotes(symbols: string[]): Promise<CryptoData[]> {
    return retry(async () => {
      const response = await this.client.get('/cryptocurrency/quotes/latest', {
        params: {
          symbol: symbols.join(','),
          convert: 'USD',
        },
      });

      const data = response.data as CoinMarketCapResponse;
      return data.data.map(this.mapToCryptoData);
    });
  }

  /**
   * Fetch quotes by coin IDs
   */
  async getQuotesById(ids: number[]): Promise<CryptoData[]> {
    return retry(async () => {
      const response = await this.client.get('/cryptocurrency/quotes/latest', {
        params: {
          id: ids.join(','),
          convert: 'USD',
        },
      });

      const data = response.data as CoinMarketCapResponse;
      return data.data.map(this.mapToCryptoData);
    });
  }

  /**
   * Fetch market trend data
   */
  async getMarketTrend(symbol: string, interval: string = 'daily'): Promise<{
    prices: number[];
    timestamps: Date[];
  }> {
    return retry(async () => {
      const response = await this.client.get(`/cryptocurrency/quotes/historical`, {
        params: {
          symbol,
          time_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          time_end: new Date().toISOString(),
          interval: `${interval}30m`,
          convert: 'USD',
        },
      });

      const quotes = response.data.data?.quotes ?? [];
      return {
        prices: quotes.map((q: { quote: { USD: { price: number } } }) => q.quote.USD.price),
        timestamps: quotes.map((q: { timestamp: string }) => parseDate(q.timestamp)),
      };
    });
  }

  /**
   * Get global metrics
   */
  async getGlobalMetrics(): Promise<{
    activeCryptocurrencies: number;
    totalMarketCap: number;
    totalVolume: number;
    btcDominance: number;
    ethDominance: number;
  }> {
    return retry(async () => {
      const response = await this.client.get('/global-metrics/quotes/latest');
      const data = response.data.data;
      return {
        activeCryptocurrencies: data.active_cryptocurrencies,
        totalMarketCap: data.quote.USD.total_market_cap,
        totalVolume: data.quote.USD.total_volume_24h,
        btcDominance: data.quote.USD.btc_dominance,
        ethDominance: data.quote.USD.eth_dominance,
      };
    });
  }

  /**
   * Map CMC API response to CryptoData
   */
  private mapToCryptoData(data: CoinMarketCapResponse['data'][0]): CryptoData {
    const quote = data.quote.USD;
    return {
      symbol: data.symbol,
      name: data.name,
      price: quote.price,
      priceChange24h: quote.percent_change_24h ?? 0,
      priceChange7d: quote.percent_change_7d ?? 0,
      marketCap: quote.market_cap ?? 0,
      volume24h: quote.volume_24h ?? 0,
      circulatingSupply: data.circulating_supply ?? 0,
      totalSupply: data.total_supply ?? 0,
      ath: quote.ath ?? 0,
      athDate: quote.ath_date ?? '',
      atl: quote.atl ?? 0,
      atlDate: quote.atl_date ?? '',
      sparkline: [],
      lastUpdated: parseDate(quote.last_updated),
      source: 'coinmarketcap',
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/key/info');
      return true;
    } catch {
      return false;
    }
  }
}
