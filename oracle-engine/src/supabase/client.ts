/**
 * Supabase Client
 * Database operations for the Oracle Prediction Engine
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EngineConfig } from '../types';
import { SUPABASE_SCHEMA } from './schema';

export class SupabaseClientWrapper {
  private client: SupabaseClient;
  private initialized: boolean = false;

  constructor(config: EngineConfig) {
    this.client = createClient(config.supabaseUrl, config.supabaseKey);
  }

  /**
   * Get the raw Supabase client
   */
  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Execute schema SQL via RPC
    const { error } = await this.client.rpc('exec_sql', {
      sql: SUPABASE_SCHEMA,
    });

    // If RPC doesn't exist, we document the schema for manual setup
    if (error) {
      console.warn('Schema initialization via RPC failed. Please apply schema manually.');
      console.warn('Schema SQL:', SUPABASE_SCHEMA.substring(0, 500) + '...');
    }

    this.initialized = true;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { data, error } = await this.client.from('oracle_predictions').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }
}
