import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SportsDataProvider } from '../src/providers/sportsdata';
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
  sportsdataApiKey: 'test-sports-key',
  minConfidence: 0.6,
  minAgents: 3,
  accuracyTarget: 0.78,
  voteWeightDecay: 0.95,
  stalePredictionHours: 24,
};

describe('SportsDataProvider', () => {
  let provider: SportsDataProvider;
  let mockGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new SportsDataProvider(mockConfig);
    mockGet = (axios.create as ReturnType<typeof vi.fn>).mock.results[0].value.get;
  });

  describe('getUpcomingFixtures', () => {
    it('should fetch upcoming fixtures for a league', async () => {
      const mockResponse = {
        data: {
          response: [
            {
              fixture: {
                id: 123456,
                date: '2025-02-01T15:00:00+00:00',
                status: { short: 'NS' },
              },
              teams: {
                home: { name: 'Manchester United', id: 33 },
                away: { name: 'Liverpool', id: 40 },
              },
              league: { id: 39, name: 'Premier League', sport: 'Football' },
              odds: {
                home_win: 2.5,
                draw: 3.4,
                away_win: 2.8,
              },
            },
          ],
        },
      };

      // Simulate the actual response structure
      mockGet.mockResolvedValueOnce({
        data: {
          data: [
            {
              GameId: 123456,
              Season: 2025,
              Status: 'NS',
              Date: '2025-02-01T15:00:00+00:00',
              HomeTeam: 'Manchester United',
              AwayTeam: 'Liverpool',
              HomeTeamWinner: false,
              HomeOddsMoneyLine: -120,
              AwayOddsMoneyLine: +110,
              OverUnder: 2.5,
              Spread: -0.5,
              Venue: 'Old Trafford',
              League: {
                ID: 39,
                Name: 'Premier League',
                Sport: 'Football',
              },
            },
          ],
          Response: 'Success',
        },
      });

      const result = await provider.getUpcomingFixtures(39, 2025);

      expect(result).toHaveLength(1);
      expect(result[0].homeTeam).toBe('Manchester United');
      expect(result[0].awayTeam).toBe('Liverpool');
      expect(result[0].league).toBe('Premier League');
      expect(result[0].status).toBe('scheduled');
      expect(result[0].source).toBe('sportsdata');
    });

    it('should handle empty fixtures', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          data: [],
          Response: 'Success',
        },
      });

      const result = await provider.getUpcomingFixtures(999, 2025);

      expect(result).toHaveLength(0);
    });
  });

  describe('getLiveFixtures', () => {
    it('should fetch live fixtures', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          data: [
            {
              GameId: 789,
              Season: 2025,
              Status: '1H',
              Date: '2025-01-15T14:00:00+00:00',
              HomeTeam: 'Arsenal',
              AwayTeam: 'Chelsea',
              HomeScore: 1,
              AwayScore: 0,
              League: { ID: 39, Name: 'Premier League', Sport: 'Football' },
            },
          ],
          Response: 'Success',
        },
      });

      const result = await provider.getLiveFixtures();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('live');
      expect(result[0].homeScore).toBe(1);
      expect(result[0].awayScore).toBe(0);
    });
  });

  describe('getHeadToHead', () => {
    it('should fetch head-to-head data', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          data: [
            {
              GameId: 100,
              Season: 2024,
              Status: 'FT',
              Date: '2024-09-15T15:00:00+00:00',
              HomeTeam: 'Manchester United',
              AwayTeam: 'Liverpool',
              HomeScore: 2,
              AwayScore: 1,
              HomeTeamWinner: true,
              League: { ID: 39, Name: 'Premier League', Sport: 'Football' },
            },
            {
              GameId: 101,
              Season: 2024,
              Status: 'FT',
              Date: '2024-03-10T15:00:00+00:00',
              HomeTeam: 'Liverpool',
              AwayTeam: 'Manchester United',
              HomeScore: 4,
              AwayScore: 3,
              HomeTeamWinner: true,
              League: { ID: 39, Name: 'Premier League', Sport: 'Football' },
            },
          ],
          Response: 'Success',
        },
      });

      const result = await provider.getHeadToHead(33, 40);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('completed');
      expect(result[0].homeScore).toBe(2);
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      mockGet.mockResolvedValueOnce({ data: { response: [] } });

      const result = await provider.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when API is down', async () => {
      mockGet.mockRejectedValueOnce(new Error('API error'));

      const result = await provider.healthCheck();

      expect(result).toBe(false);
    });
  });
});
