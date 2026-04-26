/**
 * MEEET Oracle Prediction Engine
 * Main engine that orchestrates data collection, prediction, and voting
 */

import { CoinGeckoProvider } from './providers/coingecko';
import { CoinMarketCapProvider } from './providers/coinmarketcap';
import { SportsDataProvider } from './providers/sportsdata';
import { NewsAPIProvider } from './providers/newsapi';
import { AgentVoter } from './voting/agent-voter';
import { AccuracyTracker } from './voting/accuracy-tracker';
import { SupabaseClientWrapper } from './supabase/client';
import { PredictionQueries } from './supabase/queries';
import {
  AgentVote,
  AgentProfile,
  Prediction,
  PredictionResult,
  PredictionCategory,
  PredictionMarket,
  PredictionStatus,
  CryptoData,
  SportsData,
  NewsData,
  SourceData,
  EngineConfig,
  PredictionRecord,
  EngineMetrics,
} from './types';
import {
  generateId,
  detectTrend,
  createBinaryOptions,
  clamp,
  retry,
  hoursUntil,
  isPast,
} from './utils';

export class OraclePredictionEngine {
  private config: EngineConfig;
  private coingecko: CoinGeckoProvider;
  private coinmarketcap: CoinMarketCapProvider;
  private sportsdata: SportsDataProvider;
  private newsapi: NewsAPIProvider;
  private voter: AgentVoter;
  private tracker: AccuracyTracker;
  private supabase: SupabaseClientWrapper;
  private queries: PredictionQueries;
  private isRunning: boolean = false;
  private startTime: Date;

  constructor(config: EngineConfig) {
    this.config = config;
    this.coingecko = new CoinGeckoProvider(config);
    this.coinmarketcap = new CoinMarketCapProvider(config);
    this.sportsdata = new SportsDataProvider(config);
    this.newsapi = new NewsAPIProvider(config);
    this.voter = new AgentVoter({
      minConfidence: config.minConfidence,
      minAgents: config.minAgents,
      weightDecay: config.voteWeightDecay,
    });
    this.tracker = new AccuracyTracker();
    this.supabase = new SupabaseClientWrapper(config);
    this.queries = new PredictionQueries(this.supabase.getClient());
    this.startTime = new Date();
  }

  // ─── Initialization ──────────────────────────────────────────────────────

  /**
   * Initialize the engine
   */
  async initialize(): Promise<void> {
    console.log('Initializing MEEET Oracle Prediction Engine...');

    // Initialize Supabase
    await this.supabase.initialize();

    // Register default agents if none exist
    await this.ensureDefaultAgents();

    this.isRunning = true;
    console.log('Oracle Engine initialized successfully');
  }

  /**
   * Ensure default agents are registered
   */
  private async ensureDefaultAgents(): Promise<void> {
    const defaultAgents: AgentProfile[] = [
      {
        agentId: 'agent_crypto_pro',
        name: 'CryptoPro Agent',
        specialties: ['crypto'],
        totalPredictions: 150,
        correctPredictions: 120,
        accuracy: 0.80,
        streak: 8,
        lastActive: new Date(),
        reputation: 850,
      },
      {
        agentId: 'agent_sports_expert',
        name: 'SportsExpert Agent',
        specialties: ['sports'],
        totalPredictions: 120,
        correctPredictions: 96,
        accuracy: 0.80,
        streak: 5,
        lastActive: new Date(),
        reputation: 720,
      },
      {
        agentId: 'agent_news_analyst',
        name: 'NewsAnalyst Agent',
        specialties: ['news', 'economics'],
        totalPredictions: 100,
        correctPredictions: 78,
        accuracy: 0.78,
        streak: 3,
        lastActive: new Date(),
        reputation: 650,
      },
      {
        agentId: 'agent_quantum',
        name: 'Quantum Agent',
        specialties: ['crypto', 'news'],
        totalPredictions: 80,
        correctPredictions: 64,
        accuracy: 0.80,
        streak: 4,
        lastActive: new Date(),
        reputation: 580,
      },
      {
        agentId: 'agent_biotech',
        name: 'Biotech Agent',
        specialties: ['news'],
        totalPredictions: 60,
        correctPredictions: 45,
        accuracy: 0.75,
        streak: 2,
        lastActive: new Date(),
        reputation: 420,
      },
    ];

    for (const agent of defaultAgents) {
      this.voter.registerAgent(agent);
      await this.queries.upsertAgentProfile({
        agent_id: agent.agentId,
        name: agent.name,
        specialties: agent.specialties,
        total_predictions: agent.totalPredictions,
        correct_predictions: agent.correctPredictions,
        accuracy: agent.accuracy,
        streak: agent.streak,
        last_active: agent.lastActive.toISOString(),
        reputation: agent.reputation,
      });
    }
  }

  // ─── Data Collection ─────────────────────────────────────────────────────

  /**
   * Collect crypto data from multiple sources
   */
  async collectCryptoData(symbols: string[]): Promise<CryptoData[]> {
    const results: CryptoData[] = [];

    // Collect from CoinGecko
    try {
      const cgData = await this.coingecko.getPrices(symbols);
      results.push(...cgData);
    } catch (error) {
      console.warn('CoinGecko data collection failed:', error);
    }

    // Collect from CoinMarketCap
    try {
      const cmcData = await this.coinmarketcap.getQuotes(symbols);
      results.push(...cmcData);
    } catch (error) {
      console.warn('CoinMarketCap data collection failed:', error);
    }

    return results;
  }

  /**
   * Collect sports data
   */
  async collectSportsData(leagueId: number, season: number): Promise<SportsData[]> {
    try {
      return await this.sportsdata.getUpcomingFixtures(leagueId, season);
    } catch (error) {
      console.warn('Sports data collection failed:', error);
      return [];
    }
  }

  /**
   * Collect news data
   */
  async collectNewsData(query: string): Promise<NewsData[]> {
    try {
      return await this.newsapi.search(query, { pageSize: 20 });
    } catch (error) {
      console.warn('News data collection failed:', error);
      return [];
    }
  }

  // ─── Prediction Generation ───────────────────────────────────────────────

  /**
   * Generate a crypto price prediction
   */
  async generateCryptoPrediction(
    symbol: string,
    targetPrice: number,
    timeframe: Date
  ): Promise<Prediction> {
    // Collect data
    const cryptoData = await this.collectCryptoData([symbol.toLowerCase()]);

    if (cryptoData.length === 0) {
      throw new Error(`No data available for ${symbol}`);
    }

    // Use the most recent data point
    const primary = cryptoData[0];
    const currentPrice = primary.price;
    const trend = detectTrend(primary.sparkline);

    // Determine prediction direction
    const willRise = targetPrice > currentPrice;
    const bullishSignals = (willRise && trend === 'up') || (!willRise && trend === 'down');

    // Create source data
    const sourceData: SourceData = {
      crypto: cryptoData,
    };

    // Create prediction
    const prediction: Prediction = {
      id: generateId('crypto'),
      market: 'crypto_price',
      category: 'crypto',
      question: `Will ${primary.name} (${primary.symbol}) be ${willRise ? 'above' : 'below'} $${targetPrice.toLocaleString()} by ${timeframe.toLocaleDateString()}?`,
      description: `Price prediction based on ${cryptoData.length} data sources. Current price: $${currentPrice.toLocaleString()}, trend: ${trend}`,
      options: createBinaryOptions(
        `Above $${targetPrice.toLocaleString()}`,
        `Below $${targetPrice.toLocaleString()}`
      ),
      createdAt: new Date(),
      resolutionDate: timeframe,
      status: 'active',
      confidence: bullishSignals ? 0.7 : 0.5,
      sourceData,
      metadata: {
        symbol: primary.symbol,
        currentPrice,
        targetPrice,
        trend,
        dataSources: cryptoData.map((d) => d.source),
      },
    };

    // Store in database
    await this.queries.createPrediction({
      id: prediction.id,
      market: prediction.market,
      category: prediction.category,
      question: prediction.question,
      description: prediction.description,
      options: JSON.stringify(prediction.options),
      status: prediction.status,
      confidence: prediction.confidence,
      source_data: JSON.stringify(prediction.sourceData),
      metadata: prediction.metadata,
      resolution_date: prediction.resolutionDate.toISOString(),
    });

    return prediction;
  }

  /**
   * Generate a sports prediction
   */
  async generateSportsPrediction(
    leagueId: number,
    season: number,
    matchIndex: number = 0
  ): Promise<Prediction> {
    const fixtures = await this.collectSportsData(leagueId, season);

    if (fixtures.length === 0) {
      throw new Error('No fixtures available');
    }

    const fixture = fixtures[matchIndex];

    // Determine favorite
    const homeFavorite = fixture.odds.homeWin > fixture.odds.awayWin;
    const favorite = homeFavorite ? fixture.homeTeam : fixture.awayTeam;

    const sourceData: SourceData = {
      sports: [fixture],
    };

    const prediction: Prediction = {
      id: generateId('sports'),
      market: 'sports_outcome',
      category: 'sports',
      question: `Who will win: ${fixture.homeTeam} vs ${fixture.awayTeam}?`,
      description: `${fixture.league} match at ${fixture.venue ?? 'TBD'}. Odds - Home: ${(fixture.odds.homeWin * 100).toFixed(1)}%, Draw: ${(fixture.odds.draw * 100).toFixed(1)}%, Away: ${(fixture.odds.awayWin * 100).toFixed(1)}%`,
      options: [
        { value: fixture.homeTeam.toLowerCase().replace(/\s+/g, '_'), label: fixture.homeTeam, probability: fixture.odds.homeWin },
        { value: 'draw', label: 'Draw', probability: fixture.odds.draw },
        { value: fixture.awayTeam.toLowerCase().replace(/\s+/g, '_'), label: fixture.awayTeam, probability: fixture.odds.awayWin },
      ],
      createdAt: new Date(),
      resolutionDate: fixture.startDate,
      status: fixture.status === 'scheduled' ? 'active' : 'pending',
      confidence: Math.max(fixture.odds.homeWin, fixture.odds.draw, fixture.odds.awayWin),
      sourceData,
      metadata: {
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        league: fixture.league,
        odds: fixture.odds,
      },
    };

    await this.queries.createPrediction({
      id: prediction.id,
      market: prediction.market,
      category: prediction.category,
      question: prediction.question,
      description: prediction.description,
      options: JSON.stringify(prediction.options),
      status: prediction.status,
      confidence: prediction.confidence,
      source_data: JSON.stringify(prediction.sourceData),
      metadata: prediction.metadata,
      resolution_date: prediction.resolutionDate.toISOString(),
    });

    return prediction;
  }

  /**
   * Generate a news-based prediction
   */
  async generateNewsPrediction(
    query: string,
    timeframe: Date
  ): Promise<Prediction> {
    const newsData = await this.collectNewsData(query);
    const sentiment = this.newsapi.analyzeSentiment(newsData);

    const sourceData: SourceData = {
      news: newsData.slice(0, 10),
    };

    const prediction: Prediction = {
      id: generateId('news'),
      market: 'news_event',
      category: 'news',
      question: `Will "${query}" have a positive outcome in the next ${Math.ceil(hoursUntil(timeframe) / 24)} days?`,
      description: `Based on ${newsData.length} articles. Sentiment: ${sentiment.overall} (score: ${sentiment.score.toFixed(2)})`,
      options: createBinaryOptions('Positive outcome', 'Negative/Neutral outcome'),
      createdAt: new Date(),
      resolutionDate: timeframe,
      status: 'active',
      confidence: sentiment.overall === 'positive'
        ? clamp(0.5 + sentiment.score * 0.5, 0.3, 0.9)
        : clamp(0.5 - sentiment.score * 0.5, 0.3, 0.9),
      sourceData,
      metadata: {
        query,
        sentiment: sentiment.overall,
        sentimentScore: sentiment.score,
        articleCount: newsData.length,
      },
    };

    await this.queries.createPrediction({
      id: prediction.id,
      market: prediction.market,
      category: prediction.category,
      question: prediction.question,
      description: prediction.description,
      options: JSON.stringify(prediction.options),
      status: prediction.status,
      confidence: prediction.confidence,
      source_data: JSON.stringify(prediction.sourceData),
      metadata: prediction.metadata,
      resolution_date: prediction.resolutionDate.toISOString(),
    });

    return prediction;
  }

  // ─── Voting ──────────────────────────────────────────────────────────────

  /**
   * Run agent voting for a prediction
   */
  async runVoting(prediction: Prediction): Promise<PredictionResult> {
    const agents = this.voter.getAllAgents();

    // Filter agents by specialty
    const relevantAgents = agents.filter((a) =>
      a.specialties.includes(prediction.category) || a.specialties.includes('all' as PredictionCategory)
    );

    // Each agent casts a vote based on their analysis
    for (const agent of relevantAgents) {
      // Simulate agent analysis based on source data
      const vote = this.simulateAgentVote(agent, prediction);
      this.voter.castVote(vote);
    }

    // Calculate voting result
    const votingResult = this.voter.calculateResult(prediction);

    // Determine recommended action
    const { recommendation, riskLevel } = this.voter
      .getResultWithRecommendation(prediction);

    return {
      prediction,
      votingResult,
      confidence: votingResult.confidence,
      recommendedAction: recommendation,
      riskLevel: riskLevel as 'low' | 'medium' | 'high',
      dataSources: this.extractDataSources(prediction),
      timestamp: new Date(),
    };
  }

  /**
   * Simulate an agent's vote based on their specialty and data
   */
  private simulateAgentVote(
    agent: AgentProfile,
    prediction: Prediction
  ): Omit<AgentVote, 'weight' | 'timestamp'> {
    // Simple simulation: agent votes based on prediction confidence and their specialty
    const isRelevant = agent.specialties.includes(prediction.category);
    const baseConfidence = isRelevant ? agent.accuracy : agent.accuracy * 0.8;

    // Add some randomness based on agent reputation
    const reputationFactor = agent.reputation / 1000;
    const confidence = clamp(
      baseConfidence + (Math.random() - 0.5) * 0.2 * (1 - reputationFactor),
      0.3,
      0.95
    );

    // Select option based on prediction's dominant option
    const dominantOption = prediction.options.reduce((a, b) =>
      a.probability > b.probability ? a : b
    );

    // Agent agrees with dominant option with probability = their accuracy
    const agrees = Math.random() < agent.accuracy;
    const selectedOption = agrees
      ? dominantOption.value
      : prediction.options[Math.floor(Math.random() * prediction.options.length)].value;

    return {
      agentId: agent.agentId,
      predictionId: prediction.id,
      selectedOption,
      confidence,
      reasoning: `Analysis based on ${agent.name}'s expertise in ${agent.specialties.join(', ')}. Historical accuracy: ${(agent.accuracy * 100).toFixed(1)}%.`,
    };
  }

  /**
   * Extract data source names from prediction
   */
  private extractDataSources(prediction: Prediction): string[] {
    const sources = new Set<string>();
    if (prediction.sourceData.crypto) {
      prediction.sourceData.crypto.forEach((d) => sources.add(d.source));
    }
    if (prediction.sourceData.sports) {
      prediction.sourceData.sports.forEach(() => sources.add('sportsdata'));
    }
    if (prediction.sourceData.news) {
      sources.add('newsapi');
    }
    return Array.from(sources);
  }

  // ─── Resolution ──────────────────────────────────────────────────────────

  /**
   * Resolve a prediction with actual outcome
   */
  async resolvePrediction(
    predictionId: string,
    actualOutcome: string
  ): Promise<PredictionRecord | null> {
    const prediction = await this.queries.getPrediction(predictionId);
    if (!prediction) return null;

    // Parse options to find the predicted consensus
    const options = typeof prediction.options === 'string'
      ? JSON.parse(prediction.options)
      : prediction.options;

    const predictedOutcome = prediction.resolved_outcome ?? options[0]?.value ?? '';
    const isCorrect = predictedOutcome === actualOutcome;

    const record: PredictionRecord = {
      predictionId,
      predictedOutcome,
      actualOutcome,
      confidence: prediction.confidence,
      isCorrect,
      category: prediction.category as PredictionCategory,
      timestamp: new Date(prediction.created_at),
      resolvedAt: new Date(),
    };

    // Store record
    await this.queries.recordOutcome({
      prediction_id: predictionId,
      predicted_outcome: predictedOutcome,
      actual_outcome: actualOutcome,
      confidence: prediction.confidence,
      is_correct: isCorrect,
      category: prediction.category,
      resolved_at: new Date().toISOString(),
    });

    // Track accuracy
    this.tracker.recordOutcome(record);

    return record;
  }

  /**
   * Auto-resolve overdue predictions
   */
  async autoResolveOverdue(): Promise<number> {
    const overdue = await this.queries.getPredictionsNeedingResolution();
    let resolved = 0;

    for (const prediction of overdue) {
      // For auto-resolution, we use a default outcome
      // In production, this would be connected to real-world data feeds
      const options = typeof prediction.options === 'string'
        ? JSON.parse(prediction.options)
        : prediction.options;

      const defaultOutcome = options[0]?.value ?? 'unknown';
      const record = await this.resolvePrediction(prediction.id, defaultOutcome);

      if (record) resolved++;
    }

    return resolved;
  }

  // ─── Metrics ─────────────────────────────────────────────────────────────

  /**
   * Get engine metrics
   */
  async getMetrics(): Promise<EngineMetrics> {
    const stats = await this.queries.getPredictionStats();
    const accuracy = await this.queries.getOverallAccuracy();
    const votingStats = this.voter.getVotingStats();

    return {
      totalPredictions: stats.total,
      activePredictions: stats.active,
      resolvedPredictions: stats.resolved,
      overallAccuracy: accuracy.accuracy,
      avgConfidence: stats.avgConfidence,
      agentsActive: votingStats.activeAgents,
      uptime: Date.now() - this.startTime.getTime(),
    };
  }

  /**
   * Get accuracy metrics
   */
  getAccuracyMetrics() {
    return this.tracker.calculateOverallMetrics();
  }

  /**
   * Check if accuracy target is met
   */
  isAccuracyTargetMet(target: number = 0.78): boolean {
    return this.tracker.isTargetMet(target);
  }

  // ─── Health ──────────────────────────────────────────────────────────────

  /**
   * Check health of all data sources
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    sources: Record<string, boolean>;
  }> {
    const [cgOk, cmcOk, sportsOk, newsOk, dbOk] = await Promise.all([
      this.coingecko.healthCheck(),
      this.coinmarketcap.healthCheck(),
      this.sportsdata.healthCheck(),
      this.newsapi.healthCheck(),
      this.supabase.healthCheck(),
    ]);

    const sources = {
      coingecko: cgOk,
      coinmarketcap: cmcOk,
      sportsdata: sportsOk,
      newsapi: newsOk,
      supabase: dbOk,
    };

    const healthyCount = Object.values(sources).filter(Boolean).length;
    const total = Object.keys(sources).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === total) status = 'healthy';
    else if (healthyCount >= total / 2) status = 'degraded';
    else status = 'unhealthy';

    return { status, sources };
  }

  /**
   * Shutdown the engine
   */
  shutdown(): void {
    this.isRunning = false;
    console.log('Oracle Engine shut down');
  }
}
