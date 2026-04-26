# MEEET Oracle Prediction Engine

> A multi-source prediction system with agent voting, accuracy tracking, and Supabase integration for the MEEET Solana ecosystem.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-Vitest-green.svg)](https://vitest.dev/)

## Overview

The MEEET Oracle Prediction Engine is a comprehensive prediction system that:

- **Aggregates data** from multiple APIs (CoinGecko, CoinMarketCap, SportsData, NewsAPI)
- **Generates predictions** across crypto, sports, news, weather, and economics categories
- **Runs agent voting** with weighted consensus based on historical accuracy
- **Tracks accuracy** over time with Brier scores, calibration analysis, and trend monitoring
- **Stores predictions** in Supabase with full resolution tracking
- **Targets 78%+ accuracy** through continuous learning and agent reputation management

## Architecture

```
oracle-engine/
├── src/
│   ├── index.ts              # Main exports
│   ├── engine.ts             # Core prediction engine
│   ├── types.ts              # TypeScript type definitions
│   ├── utils.ts              # Utility functions
│   ├── providers/            # API data providers
│   │   ├── coingecko.ts      # CoinGecko API integration
│   │   ├── coinmarketcap.ts  # CoinMarketCap API integration
│   │   ├── sportsdata.ts     # SportsData.io API integration
│   │   └── newsapi.ts        # NewsAPI integration
│   ├── voting/               # Voting system
│   │   ├── agent-voter.ts    # Agent voting algorithm
│   │   └── accuracy-tracker.ts # Accuracy tracking & metrics
│   └── supabase/             # Database integration
│       ├── client.ts         # Supabase client wrapper
│       ├── queries.ts        # Database queries
│       └── schema.ts         # SQL schema definitions
├── supabase/
│   └── migrations/           # Database migrations
│       └── 20260426000000_oracle_prediction_engine.sql
├── tests/                    # Comprehensive test suite
│   ├── coingecko.test.ts
│   ├── coinmarketcap.test.ts
│   ├── sportsdata.test.ts
│   ├── newsapi.test.ts
│   ├── agent-voter.test.ts
│   ├── accuracy-tracker.test.ts
│   ├── engine.test.ts
│   ├── supabase.test.ts
│   └── utils.test.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm or bun
- Supabase project (free tier works)
- API keys for data sources (optional for testing)

### Installation

```bash
cd oracle-engine
npm install
```

### Configuration

Create a `.env` file:

```env
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Optional - API Keys
COINGECKO_API_KEY=your-coingecko-key
COINMARKETCAP_API_KEY=your-cmc-key
SPORTSDATA_API_KEY=your-sportsdata-key
NEWSAPI_KEY=your-newsapi-key

# Engine Settings
MIN_CONFIDENCE=0.6
MIN_AGENTS=3
ACCURACY_TARGET=0.78
VOTE_WEIGHT_DECAY=0.95
STALE_PREDICTION_HOURS=24
```

### Database Setup

Run the migration in your Supabase SQL editor:

```bash
# Copy the migration file content to Supabase SQL Editor
cat supabase/migrations/20260426000000_oracle_prediction_engine.sql
```

Or use the Supabase CLI:

```bash
supabase db push
```

### Usage

```typescript
import { OraclePredictionEngine } from '@meeet/oracle-engine';

const engine = new OraclePredictionEngine({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_KEY!,
  coingeckoApiKey: process.env.COINGECKO_API_KEY,
  coinmarketcapApiKey: process.env.COINMARKETCAP_API_KEY,
  sportsdataApiKey: process.env.SPORTSDATA_API_KEY,
  newsApiKey: process.env.NEWSAPI_KEY,
  minConfidence: 0.6,
  minAgents: 3,
  accuracyTarget: 0.78,
  voteWeightDecay: 0.95,
  stalePredictionHours: 24,
});

// Initialize
await engine.initialize();

// Generate a crypto prediction
const btcPrediction = await engine.generateCryptoPrediction(
  'BTC',
  100000,
  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
);

// Run agent voting
const result = await engine.runVoting(btcPrediction);
console.log(`Consensus: ${result.votingResult.consensus}`);
console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
console.log(`Risk: ${result.riskLevel}`);

// Check accuracy
const metrics = engine.getAccuracyMetrics();
console.log(`Overall accuracy: ${(metrics.overall.accuracy * 100).toFixed(1)}%`);
console.log(`Target met: ${engine.isAccuracyTargetMet(0.78)}`);
```

## API Reference

### OraclePredictionEngine

Main engine class that orchestrates all components.

#### Constructor

```typescript
new OraclePredictionEngine(config: EngineConfig)
```

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `initialize()` | Initialize engine and register agents | `Promise<void>` |
| `generateCryptoPrediction(symbol, targetPrice, timeframe)` | Generate crypto price prediction | `Promise<Prediction>` |
| `generateSportsPrediction(leagueId, season, matchIndex)` | Generate sports outcome prediction | `Promise<Prediction>` |
| `generateNewsPrediction(query, timeframe)` | Generate news-based prediction | `Promise<Prediction>` |
| `runVoting(prediction)` | Run agent voting for a prediction | `Promise<PredictionResult>` |
| `resolvePrediction(predictionId, actualOutcome)` | Resolve a prediction | `Promise<PredictionRecord>` |
| `getMetrics()` | Get engine metrics | `Promise<EngineMetrics>` |
| `getAccuracyMetrics()` | Get accuracy metrics | `AccuracyMetrics` |
| `isAccuracyTargetMet(target)` | Check if accuracy target is met | `boolean` |
| `healthCheck()` | Check health of all data sources | `Promise<HealthStatus>` |
| `shutdown()` | Shutdown the engine | `void` |

### AgentVoter

Weighted voting system based on agent historical accuracy.

#### Key Methods

| Method | Description |
|--------|-------------|
| `registerAgent(profile)` | Register an agent |
| `castVote(vote)` | Cast a vote for a prediction |
| `calculateResult(prediction)` | Calculate weighted voting result |
| `calculateEnsemblePrediction(sources)` | Ensemble from multiple data sources |
| `getAgentRankings()` | Get agents ranked by accuracy |

### AccuracyTracker

Tracks and analyzes prediction accuracy over time.

#### Key Methods

| Method | Description |
|--------|-------------|
| `recordOutcome(record)` | Record a prediction outcome |
| `calculateOverallMetrics()` | Calculate overall accuracy metrics |
| `isTargetMet(target)` | Check if accuracy target is met |
| `getCalibration()` | Get confidence calibration analysis |
| `calculateExpectedValue()` | Calculate expected value |
| `getRecentSummary(lastN)` | Get recent performance summary |

## Data Sources

### CoinGecko

- Free tier available (no API key needed for basic usage)
- Provides cryptocurrency prices, market data, and sparklines
- Rate limit: 10-50 calls/minute (free), 100+/minute (paid)

### CoinMarketCap

- Free tier with API key
- Provides cryptocurrency listings, quotes, and global metrics
- Rate limit: 10,000 calls/month (free), 30,000+ (paid)

### SportsData.io

- Free tier available
- Provides sports fixtures, odds, and live scores
- Supports multiple sports (football, basketball, baseball, etc.)

### NewsAPI

- Free tier available
- Provides news articles with sentiment analysis
- Rate limit: 100 calls/day (free), 3,000+ (paid)

## Agent Voting Algorithm

The voting system uses a **weighted consensus** approach:

1. **Agent Weight Calculation**: Each agent's vote weight is calculated based on:
   - Historical accuracy (0.3-1.0 range)
   - Current streak (up to 1.2x bonus)
   - Experience factor (based on total predictions)
   - Reputation score (0.8-1.2 range)

2. **Weighted Scoring**: Votes are weighted by both agent weight and vote confidence

3. **Consensus Determination**: The option with the highest weighted score wins

4. **Confidence Calculation**: Based on vote distribution entropy

5. **Risk Assessment**:
   - **Low risk**: Confidence >= 80% with minimum agents
   - **Medium risk**: Confidence >= 60%
   - **High risk**: Low confidence or insufficient votes

## Accuracy Tracking

The engine tracks multiple accuracy metrics:

- **Overall accuracy**: Correct predictions / Total predictions
- **Brier score**: Measures prediction probability accuracy (lower = better)
- **Calibration**: Checks if confidence scores match actual accuracy
- **Category breakdown**: Accuracy by prediction category
- **Agent performance**: Per-agent accuracy and reputation
- **Trend analysis**: Rolling accuracy over time
- **Expected value**: EV = confidence × (correct ? 1 : -1)

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `oracle_predictions` | Prediction questions and status |
| `oracle_agent_votes` | Individual agent votes |
| `oracle_agent_profiles` | Agent performance metrics |
| `oracle_prediction_records` | Resolved outcomes |
| `oracle_source_cache` | Cached API responses |
| `oracle_accuracy_metrics` | Pre-computed metrics |

### Views

| View | Description |
|------|-------------|
| `oracle_active_predictions` | Currently active predictions |
| `oracle_pending_predictions` | Pending predictions |
| `oracle_resolved_with_accuracy` | Resolved with accuracy data |
| `oracle_agent_leaderboard` | Agent rankings |

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Test Coverage Target

- Branches: 80%+
- Functions: 80%+
- Lines: 80%+
- Statements: 80%+

## Development

```bash
# Build
npm run build

# Lint
npm run lint

# Watch mode
npm run dev
```

## Integration with MEEET

The Oracle Engine integrates with the MEEET ecosystem:

- **$MEEET Token**: Used for prediction staking and rewards
- **Solana**: Predictions can be settled on-chain
- **Agent System**: MEEET agents participate in voting
- **Supabase**: Shared database with the main MEEET platform

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request
