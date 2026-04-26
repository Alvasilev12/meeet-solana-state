/**
 * NewsAPI Provider
 * Fetches news data for world event predictions
 */

import axios, { AxiosInstance } from 'axios';
import { NewsAPIResponse, NewsData, NewsSentiment, EngineConfig } from '../types';
import { retry, parseDate } from '../utils';

const NEWSAPI_BASE_URL = 'https://newsapi.org/v2';

// Sentiment analysis keywords
const POSITIVE_WORDS = [
  'growth', 'gain', 'rise', 'increase', 'profit', 'success', 'bullish',
  'rally', 'surge', 'breakthrough', 'innovation', 'deal', 'partnership',
  'adoption', 'recovery', 'expansion', 'record', 'high', 'upgrade',
  'optimistic', 'positive', 'benefit', 'improve', 'boost', 'win',
];

const NEGATIVE_WORDS = [
  'crash', 'fall', 'drop', 'loss', 'decline', 'bearish', 'scandal',
  'fraud', 'hack', 'breach', 'sanction', 'ban', 'crisis', 'recession',
  'downgrade', 'warning', 'risk', 'threat', 'attack', 'collapse',
  'pessimistic', 'negative', 'harm', 'worsen', 'lose', 'fear',
];

export class NewsAPIProvider {
  private client: AxiosInstance;
  private apiKey?: string;

  constructor(config: EngineConfig) {
    this.apiKey = config.newsApiKey;
    this.client = axios.create({
      baseURL: NEWSAPI_BASE_URL,
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Search for news articles by query
   */
  async search(query: string, options?: {
    pageSize?: number;
    fromDate?: string;
    toDate?: string;
    language?: string;
    sortBy?: 'relevancy' | 'popularity' | 'publishedAt';
  }): Promise<NewsData[]> {
    return retry(async () => {
      const response = await this.client.get('/everything', {
        params: {
          q: query,
          pageSize: options?.pageSize ?? 20,
          from: options?.fromDate,
          to: options?.toDate,
          language: options?.language ?? 'en',
          sortBy: options?.sortBy ?? 'relevancy',
          apiKey: this.apiKey,
        },
      });

      const data = response.data as NewsAPIResponse;
      return (data.articles ?? []).map(this.mapToNewsData);
    });
  }

  /**
   * Get top headlines by country and category
   */
  async getTopHeadlines(options?: {
    country?: string;
    category?: string;
    pageSize?: number;
  }): Promise<NewsData[]> {
    return retry(async () => {
      const response = await this.client.get('/top-headlines', {
        params: {
          country: options?.country ?? 'us',
          category: options?.category,
          pageSize: options?.pageSize ?? 20,
          apiKey: this.apiKey,
        },
      });

      const data = response.data as NewsAPIResponse;
      return (data.articles ?? []).map(this.mapToNewsData);
    });
  }

  /**
   * Get news by topic category
   */
  async getByCategory(category: string, pageSize: number = 20): Promise<NewsData[]> {
    return this.getTopHeadlines({ category, pageSize });
  }

  /**
   * Get crypto-specific news
   */
  async getCryptoNews(pageSize: number = 20): Promise<NewsData[]> {
    return this.search('cryptocurrency OR bitcoin OR ethereum OR crypto', {
      pageSize,
      sortBy: 'publishedAt',
    });
  }

  /**
   * Get sports-specific news
   */
  async getSportsNews(pageSize: number = 20): Promise<NewsData[]> {
    return this.getTopHeadlines({ category: 'sports', pageSize });
  }

  /**
   * Get business/financial news
   */
  async getBusinessNews(pageSize: number = 20): Promise<NewsData[]> {
    return this.getTopHeadlines({ category: 'business', pageSize });
  }

  /**
   * Get technology news
   */
  async getTechnologyNews(pageSize: number = 20): Promise<NewsData[]> {
    return this.getTopHeadlines({ category: 'technology', pageSize });
  }

  /**
   * Analyze sentiment of a collection of articles
   */
  analyzeSentiment(articles: NewsData[]): {
    positive: number;
    negative: number;
    neutral: number;
    overall: NewsSentiment;
    score: number; // -1 to 1
  } {
    const counts = { positive: 0, negative: 0, neutral: 0 };
    let scoreSum = 0;

    for (const article of articles) {
      counts[article.sentiment]++;
      const articleScore = article.sentiment === 'positive' ? 1 : article.sentiment === 'negative' ? -1 : 0;
      scoreSum += articleScore;
    }

    const total = articles.length || 1;
    const overallScore = scoreSum / total;

    return {
      positive: counts.positive,
      negative: counts.negative,
      neutral: counts.neutral,
      overall: overallScore > 0.1 ? 'positive' : overallScore < -0.1 ? 'negative' : 'neutral',
      score: overallScore,
    };
  }

  /**
   * Perform simple sentiment analysis on text
   */
  private analyzeTextSentiment(text: string): { sentiment: NewsSentiment; score: number } {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\W+/);

    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (POSITIVE_WORDS.includes(word)) positiveCount++;
      if (NEGATIVE_WORDS.includes(word)) negativeCount++;
    }

    const total = positiveCount + negativeCount;
    if (total === 0) return { sentiment: 'neutral', score: 0 };

    const score = (positiveCount - negativeCount) / total;
    return {
      sentiment: score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral',
      score,
    };
  }

  /**
   * Calculate relevance score based on query match
   */
  private calculateRelevance(title: string, description: string): number {
    const text = `${title} ${description}`.toLowerCase();
    const keywords = ['crypto', 'bitcoin', 'ethereum', 'defi', 'nft', 'blockchain',
      'sport', 'football', 'soccer', 'basketball', 'tennis', 'game', 'match',
      'election', 'policy', 'regulation', 'economy', 'market'];

    let matchCount = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) matchCount++;
    }

    return Math.min(1, matchCount / 3);
  }

  /**
   * Map API response to NewsData
   */
  private mapToNewsData(data: NewsAPIResponse['articles'][0]): NewsData {
    const fullText = `${data.title} ${data.description ?? ''} ${data.content ?? ''}`;
    const { sentiment, score } = this.analyzeTextSentiment(fullText);

    return {
      title: data.title,
      description: data.description ?? '',
      url: data.url,
      imageUrl: data.urlToImage ?? undefined,
      publishedAt: parseDate(data.publishedAt),
      source: data.source.name,
      category: this.categorizeArticle(data.title, data.description ?? ''),
      sentiment,
      relevanceScore: this.calculateRelevance(data.title, data.description ?? ''),
      lastUpdated: new Date(),
    };
  }

  /**
   * Categorize article based on content
   */
  private categorizeArticle(title: string, description: string): string[] {
    const text = `${title} ${description}`.toLowerCase();
    const categories: string[] = [];

    if (/crypto|bitcoin|ethereum|defi|blockchain|nft/i.test(text)) categories.push('crypto');
    if (/sport|football|soccer|basketball|tennis|game|match|team/i.test(text)) categories.push('sports');
    if (/election|politic|government|law|policy/i.test(text)) categories.push('politics');
    if (/market|stock|economy|trade|business|finance/i.test(text)) categories.push('finance');
    if (/tech|ai|artificial intelligence|software|startup/i.test(text)) categories.push('technology');
    if (/health|medical|disease|virus|pandemic/i.test(text)) categories.push('health');
    if (/war|conflict|military|attack|terror/i.test(text)) categories.push('conflict');

    return categories.length > 0 ? categories : ['general'];
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getTopHeadlines({ pageSize: 1 });
      return true;
    } catch {
      return false;
    }
  }
}
