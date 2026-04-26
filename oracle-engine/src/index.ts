/**
 * MEEET Oracle Prediction Engine
 * 
 * A multi-source prediction system with agent voting,
 * accuracy tracking, and Supabase integration.
 * 
 * @packageDocumentation
 */

// ─── Main Engine ────────────────────────────────────────────────────────────

export { OraclePredictionEngine } from './engine';

// ─── API Providers ──────────────────────────────────────────────────────────

export { CoinGeckoProvider } from './providers/coingecko';
export { CoinMarketCapProvider } from './providers/coinmarketcap';
export { SportsDataProvider } from './providers/sportsdata';
export { NewsAPIProvider } from './providers/newsapi';

// ─── Voting System ──────────────────────────────────────────────────────────

export { AgentVoter } from './voting/agent-voter';
export { AccuracyTracker } from './voting/accuracy-tracker';

// ─── Supabase Integration ───────────────────────────────────────────────────

export { SupabaseClientWrapper } from './supabase/client';
export { PredictionQueries } from './supabase/queries';
export { SUPABASE_SCHEMA, SEED_DATA } from './supabase/schema';

// ─── Utilities ──────────────────────────────────────────────────────────────

export {
  generateId,
  weightedAverage,
  calculateBrierScore,
  calculateLogLoss,
  normalize,
  exponentialDecay,
  movingAverage,
  detectTrend,
  categoryToMarket,
  createBinaryOptions,
  createMultipleOptions,
  clamp,
  parseDate,
  isPast,
  isWithinHours,
  hoursUntil,
  safeJsonParse,
  retry,
  shannonEntropy,
  consensusStrength,
} from './utils';

// ─── Type Exports ───────────────────────────────────────────────────────────

export type {
  // Prediction types
  Prediction,
  PredictionOption,
  PredictionStatus,
  PredictionCategory,
  PredictionMarket,

  // Source data types
  SourceData,
  CryptoData,
  CoinGeckoResponse,
  CoinMarketCapResponse,
  SportsData,
  SportsStatus,
  SportsOdds,
  SportsDataAPIResponse,
  NewsData,
  NewsSentiment,
  NewsAPIResponse,

  // Voting types
  AgentVote,
  AgentProfile,
  VotingResult,

  // Accuracy types
  PredictionRecord,
  AccuracyMetrics,

  // Database types
  DbPrediction,
  DbAgentVote,
  DbAgentProfile,
  DbPredictionRecord,

  // Configuration and output types
  EngineConfig,
  PredictionResult,
  EngineMetrics,
} from './types';
