/**
 * MEEET Oracle Prediction Engine - Type Definitions
 */

// ─── Prediction Categories ───────────────────────────────────────────────────

export type PredictionCategory = 'crypto' | 'sports' | 'news' | 'weather' | 'economics';

export type PredictionMarket =
  | 'crypto_price'
  | 'crypto_trend'
  | 'sports_outcome'
  | 'sports_score'
  | 'news_event'
  | 'weather_condition'
  | 'economic_indicator';

// ─── Prediction Types ────────────────────────────────────────────────────────

export interface Prediction {
  id: string;
  market: PredictionMarket;
  category: PredictionCategory;
  question: string;
  description: string;
  options: PredictionOption[];
  createdAt: Date;
  resolutionDate: Date;
  status: PredictionStatus;
  resolvedOutcome?: string;
  confidence: number; // 0-1
  sourceData: SourceData;
  metadata: Record<string, unknown>;
}

export interface PredictionOption {
  value: string;
  label: string;
  probability: number; // 0-1
}

export type PredictionStatus = 'pending' | 'active' | 'resolved' | 'cancelled';

// ─── Source Data Interfaces ──────────────────────────────────────────────────

export interface SourceData {
  crypto?: CryptoData[];
  sports?: SportsData[];
  news?: NewsData[];
}

// ─── Crypto Data ─────────────────────────────────────────────────────────────

export interface CryptoData {
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  priceChange7d: number;
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  totalSupply: number;
  ath: number;
  athDate: string;
  atl: number;
  atlDate: string;
  sparkline: number[];
  lastUpdated: Date;
  source: 'coingecko' | 'coinmarketcap';
}

export interface CoinGeckoResponse {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  sparkline_in_7d: { price: number[] };
  last_updated: string;
}

export interface CoinMarketCapResponse {
  data: Array<{
    id: number;
    name: string;
    symbol: string;
    slug: string;
    num_market_pairs: number;
    date_added: string;
    max_supply: number | null;
    circulating_supply: number;
    total_supply: number;
    infinite_supply: boolean;
    platform: null | { id: number; name: string; symbol: string; slug: string; token_address: string };
    cmc_rank: number;
    self_reported_circulating_supply: number | null;
    self_reported_market_cap: number | null;
    quote: {
      USD: {
        price: number;
        volume_24h: number;
        volume_change_24h: number;
        percent_change_1h: number;
        percent_change_24h: number;
        percent_change_7d: number;
        market_cap: number;
        market_cap_dominance: number;
        fully_diluted_market_cap: number;
        last_updated: string;
        ath: number;
        ath_date: string;
        percent_from_ath: number;
        atl: number;
        atl_date: string;
        percent_from_atl: number;
      };
    };
  }>;
  status: {
    timestamp: string;
    error_code: number;
    error_message: string | null;
    elapsed: number;
    credit_count: number;
  };
}

// ─── Sports Data ─────────────────────────────────────────────────────────────

export interface SportsData {
  league: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: SportsStatus;
  startDate: Date;
  venue?: string;
  odds: SportsOdds;
  lastUpdated: Date;
  source: 'sportsdata';
}

export type SportsStatus = 'scheduled' | 'live' | 'completed' | 'postponed' | 'cancelled';

export interface SportsOdds {
  homeWin: number;
  draw: number;
  awayWin: number;
  overUnder?: number;
  spread?: number;
}

export interface SportsDataAPIResponse {
  Response: 'Success' | 'Error';
  Message?: string;
  data: Array<{
    GameId: number;
    Season: number;
    Status: string;
    Date: string;
    HomeTeam: string;
    AwayTeam: string;
    HomeTeamWinner: boolean;
    HomeScore?: number;
    AwayScore?: number;
    HomeOddsMoneyLine?: number;
    AwayOddsMoneyLine?: number;
    OverUnder?: number;
    Spread?: number;
    Venue?: string;
    League?: {
      ID: number;
      Name: string;
      Sport: string;
    };
  }>;
}

// ─── News Data ───────────────────────────────────────────────────────────────

export interface NewsData {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  publishedAt: Date;
  source: string;
  category: string[];
  sentiment: NewsSentiment;
  relevanceScore: number; // 0-1
  lastUpdated: Date;
}

export type NewsSentiment = 'positive' | 'negative' | 'neutral';

export interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: Array<{
    source: { id: string | null; name: string };
    author: string | null;
    title: string;
    description: string | null;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    content: string | null;
  }>;
}

// ─── Agent Voting ────────────────────────────────────────────────────────────

export interface AgentVote {
  agentId: string;
  predictionId: string;
  selectedOption: string;
  confidence: number; // 0-1
  reasoning: string;
  timestamp: Date;
  weight: number; // Dynamic weight based on accuracy
}

export interface AgentProfile {
  agentId: string;
  name: string;
  specialties: PredictionCategory[];
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number; // 0-1
  streak: number;
  lastActive: Date;
  reputation: number;
}

export interface VotingResult {
  predictionId: string;
  consensus: string;
  confidence: number;
  votes: AgentVote[];
  weightedScores: Record<string, number>;
  timestamp: Date;
}

// ─── Accuracy Tracking ──────────────────────────────────────────────────────

export interface PredictionRecord {
  predictionId: string;
  predictedOutcome: string;
  actualOutcome: string;
  confidence: number;
  isCorrect: boolean;
  category: PredictionCategory;
  timestamp: Date;
  resolvedAt: Date;
}

export interface AccuracyMetrics {
  overall: {
    total: number;
    correct: number;
    accuracy: number;
    avgConfidence: number;
    brierScore: number;
  };
  byCategory: Record<PredictionCategory, {
    total: number;
    correct: number;
    accuracy: number;
  }>;
  byAgent: Record<string, {
    total: number;
    correct: number;
    accuracy: number;
    avgWeight: number;
  }>;
  trend: Array<{
    date: string;
    accuracy: number;
    total: number;
  }>;
}

// ─── Supabase Schema Types ───────────────────────────────────────────────────

export interface DbPrediction {
  id: string;
  market: PredictionMarket;
  category: PredictionCategory;
  question: string;
  description: string;
  options: string; // JSON
  status: PredictionStatus;
  resolved_outcome: string | null;
  confidence: number;
  source_data: string; // JSON
  metadata: Record<string, unknown>;
  created_at: string;
  resolution_date: string;
}

export interface DbAgentVote {
  id: string;
  agent_id: string;
  prediction_id: string;
  selected_option: string;
  confidence: number;
  reasoning: string;
  weight: number;
  created_at: string;
}

export interface DbAgentProfile {
  id: string;
  agent_id: string;
  name: string;
  specialties: string[];
  total_predictions: number;
  correct_predictions: number;
  accuracy: number;
  streak: number;
  last_active: string;
  reputation: number;
  created_at: string;
}

export interface DbPredictionRecord {
  id: string;
  prediction_id: string;
  predicted_outcome: string;
  actual_outcome: string;
  confidence: number;
  is_correct: boolean;
  category: PredictionCategory;
  created_at: string;
  resolved_at: string;
}

// ─── Engine Configuration ───────────────────────────────────────────────────

export interface EngineConfig {
  coingeckoApiKey?: string;
  coinmarketcapApiKey?: string;
  sportsdataApiKey?: string;
  newsApiKey?: string;
  supabaseUrl: string;
  supabaseKey: string;
  minConfidence: number;
  minAgents: number;
  accuracyTarget: number;
  voteWeightDecay: number;
  stalePredictionHours: number;
}

// ─── Engine Output ───────────────────────────────────────────────────────────

export interface PredictionResult {
  prediction: Prediction;
  votingResult: VotingResult;
  confidence: number;
  recommendedAction: string;
  riskLevel: 'low' | 'medium' | 'high';
  dataSources: string[];
  timestamp: Date;
}

export interface EngineMetrics {
  totalPredictions: number;
  activePredictions: number;
  resolvedPredictions: number;
  overallAccuracy: number;
  avgConfidence: number;
  agentsActive: number;
  uptime: number;
}
