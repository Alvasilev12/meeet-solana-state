/**
 * SportsData.io API Provider
 * Fetches sports data for match outcome predictions
 */

import axios, { AxiosInstance } from 'axios';
import {
  SportsData,
  SportsDataAPIResponse,
  SportsOdds,
  SportsStatus,
  EngineConfig,
} from '../types';
import { retry, parseDate } from '../utils';

const SPORTSDATA_BASE_URL = 'https://v1.sports.api-sports.io';

export class SportsDataProvider {
  private client: AxiosInstance;
  private apiKey?: string;

  constructor(config: EngineConfig) {
    this.apiKey = config.sportsdataApiKey;
    this.client = axios.create({
      baseURL: SPORTSDATA_BASE_URL,
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(this.apiKey ? { 'x-apisports-key': this.apiKey } : {}),
      },
    });
  }

  /**
   * Fetch upcoming fixtures for a league
   */
  async getUpcomingFixtures(leagueId: number, season: number): Promise<SportsData[]> {
    return retry(async () => {
      const response = await this.client.get('/fixtures', {
        params: {
          league: leagueId,
          season,
          next: 20,
        },
      });

      const data = response.data as SportsDataAPIResponse;
      return (data.data ?? []).map(this.mapToSportsData);
    });
  }

  /**
   * Fetch live fixtures
   */
  async getLiveFixtures(): Promise<SportsData[]> {
    return retry(async () => {
      const response = await this.client.get('/fixtures', {
        params: {
          live: 'all',
        },
      });

      const data = response.data as SportsDataAPIResponse;
      return (data.data ?? []).map(this.mapToSportsData);
    });
  }

  /**
   * Fetch fixtures by date range
   */
  async getFixturesByDate(
    from: string,
    to: string,
    leagueId?: number
  ): Promise<SportsData[]> {
    return retry(async () => {
      const params: Record<string, string | number> = { from, to };
      if (leagueId) params.league = leagueId;

      const response = await this.client.get('/fixtures', { params });
      const data = response.data as SportsDataAPIResponse;
      return (data.data ?? []).map(this.mapToSportsData);
    });
  }

  /**
   * Fetch fixtures for a specific team
   */
  async getTeamFixtures(teamId: number, season: number, leagueId: number): Promise<SportsData[]> {
    return retry(async () => {
      const response = await this.client.get('/fixtures', {
        params: {
          team: teamId,
          season,
          league: leagueId,
          last: 10,
        },
      });

      const data = response.data as SportsDataAPIResponse;
      return (data.data ?? []).map(this.mapToSportsData);
    });
  }

  /**
   * Fetch league standings
   */
  async getStandings(leagueId: number, season: number): Promise<{
    league: { id: number; name: string; country: string };
    standings: Array<{
      rank: number;
      team: { id: number; name: string };
      points: number;
      goalsDiff: number;
      played: number;
      win: number;
      draw: number;
      lose: number;
    }>;
  }> {
    return retry(async () => {
      const response = await this.client.get('/standings', {
        params: { league: leagueId, season },
      });

      const data = response.data as {
        response: Array<{
          league: { id: number; name: string; country: string };
          standings: Array<Array<{
            rank: number;
            team: { id: number; name: string };
            points: number;
            goalsDiff: number;
            played: number;
            win: number;
            draw: number;
            lose: number;
          }>>;
        }>;
      };

      const leagueData = data.response[0];
      return {
        league: leagueData.league,
        standings: leagueData.standings[0] ?? [],
      };
    });
  }

  /**
   * Fetch head-to-head data between two teams
   */
  async getHeadToHead(team1Id: number, team2Id: number): Promise<SportsData[]> {
    return retry(async () => {
      const response = await this.client.get('/fixtures/headtohead', {
        params: {
          h2h: `${team1Id}-${team2Id}`,
          last: 10,
        },
      });

      const data = response.data as SportsDataAPIResponse;
      return (data.data ?? []).map(this.mapToSportsData);
    });
  }

  /**
   * Fetch available leagues
   */
  async getLeagues(sport: string = 'football'): Promise<Array<{
    id: number;
    name: string;
    country: string;
    type: string;
  }>> {
    return retry(async () => {
      const response = await this.client.get('/leagues', {
        params: { sport },
      });

      const data = response.data as {
        response: Array<{
          league: { id: number; name: string; country: string };
          seasons: Array<{ year: number; current: boolean }>;
        }>;
      };

      return (data.response ?? []).map((r) => ({
        id: r.league.id,
        name: r.league.name,
        country: r.league.country,
        type: sport,
      }));
    });
  }

  /**
   * Map API response to SportsData
   */
  private mapToSportsData(data: SportsDataAPIResponse['data'][0]): SportsData {
    const statusMap: Record<string, SportsStatus> = {
      NS: 'scheduled',
      '1H': 'live',
      '2H': 'live',
      HT: 'live',
      ET: 'live',
      P: 'live',
      FT: 'completed',
      AET: 'completed',
      PEN: 'completed',
      POST: 'postponed',
      CANCELLED: 'cancelled',
    };

    const odds: SportsOdds = {
      homeWin: data.HomeOddsMoneyLine ? 100 / (data.HomeOddsMoneyLine + 100) : 0.33,
      draw: 0.33,
      awayWin: data.AwayOddsMoneyLine ? 100 / (data.AwayOddsMoneyLine + 100) : 0.33,
      overUnder: data.OverUnder,
      spread: data.Spread,
    };

    // Normalize odds to sum to 1
    const total = odds.homeWin + odds.draw + odds.awayWin;
    if (total > 0) {
      odds.homeWin /= total;
      odds.draw /= total;
      odds.awayWin /= total;
    }

    return {
      league: data.League?.Name ?? 'Unknown',
      sport: data.League?.Sport ?? 'football',
      homeTeam: data.HomeTeam,
      awayTeam: data.AwayTeam,
      homeScore: data.HomeScore,
      awayScore: data.AwayScore,
      status: statusMap[data.Status] ?? 'scheduled',
      startDate: parseDate(data.Date),
      venue: data.Venue,
      odds,
      lastUpdated: new Date(),
      source: 'sportsdata',
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/leagues', { params: { sport: 'football' } });
      return true;
    } catch {
      return false;
    }
  }
}
