/**
 * CoinGecko API Provider
 * Fetches cryptocurrency market data for predictions
 */

import axios, { AxiosInstance } from 'axios';
import { CoinGeckoResponse, CryptoData, EngineConfig } from '../types';
import { retry, parseDate } from '../utils';

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

export class CoinGeckoProvider {
  private client: AxiosInstance;
  private apiKey?: string;

  constructor(config: EngineConfig) {
    this.apiKey = config.coingeckoApiKey;
    this.client = axios.create({
      baseURL: COINGECKO_BASE_URL,
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(this.apiKey ? { 'x-cg-demo-api-key': this.apiKey } : {}),
      },
    });
  }

  /**
   * Fetch current prices for multiple cryptocurrencies
   */
  async getPrices(symbols: string[], vsCurrency: string = 'usd'): Promise<CryptoData[]> {
    return retry(async () => {
      const response = await this.client.get('/coins/markets', {
        params: {
          vs_currency: vsCurrency,
          ids: symbols.join(','),
          order: 'market_cap_desc',
          per_page: symbols.length,
          page: 1,
          sparkline: true,
          price_change_percentage: '1h,24h,7d',
        },
      });

      const data = response.data as CoinGeckoResponse[];
      return data.map(this.mapToCryptoData);
    });
  }

  /**
   * Fetch single coin data
   */
  async getCoinData(symbol: string): Promise<CryptoData> {
    return retry(async () => {
      const response = await this.client.get(`/coins/${symbol}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: true,
        },
      });

      const data = response.data as CoinGeckoResponse;
      return this.mapToCryptoData(data);
    });
  }

  /**
   * Fetch price change data for trend analysis
   */
  async getPriceChange(symbol: string, days: number = 7): Promise<number[]> {
    return retry(async () => {
      const response = await this.client.get(`/coins/${symbol}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days,
          interval: days <= 1 ? undefined : 'daily',
        },
      });

      return response.data.prices.map((p: [number, number]) => p[1]);
    });
  }

  /**
   * Fetch top cryptocurrencies by market cap
   */
  async getTopCoins(limit: number = 50, vsCurrency: string = 'usd'): Promise<CryptoData[]> {
    return this.getPrices(
      Array.from({ length: limit }, (_, i) => `coin-${i + 1}`),
      vsCurrency
    );
  }

  /**
   * Get exchange rates
   */
  async getExchangeRates(): Promise<Record<string, number>> {
    return retry(async () => {
      const response = await this.client.get('/exchange_rates');
      const rates = response.data.rates;
      const result: Record<string, number> = {};
      for (const [key, value] of Object.entries(rates)) {
        const v = value as { value: number };
        result[key] = v.value;
      }
      return result;
    });
  }

  /**
   * Map CoinGecko API response to CryptoData
   */
  private mapToCryptoData(data: CoinGeckoResponse): CryptoData {
    return {
      symbol: data.symbol.toUpperCase(),
      name: data.name,
      price: data.current_price,
      priceChange24h: data.price_change_percentage_24h ?? 0,
      priceChange7d: 0, // API doesn't return 7d directly in markets endpoint
      marketCap: data.market_cap ?? 0,
      volume24h: data.total_volume ?? 0,
      circulatingSupply: data.circulating_supply ?? 0,
      totalSupply: data.total_supply ?? 0,
      ath: data.ath ?? 0,
      athDate: data.ath_date ?? '',
      atl: data.atl ?? 0,
      atlDate: data.atl_date ?? '',
      sparkline: data.sparkline_in_7d?.price ?? [],
      lastUpdated: parseDate(data.last_updated),
      source: 'coingecko',
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/ping');
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
