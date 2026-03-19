export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_feed: {
        Row: {
          agent_id: string | null
          created_at: string
          description: string | null
          event_type: string
          id: string
          meeet_amount: number | null
          target_agent_id: string | null
          title: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          meeet_amount?: number | null
          target_agent_id?: string | null
          title: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          meeet_amount?: number | null
          target_agent_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_feed_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_feed_target_agent_id_fkey"
            columns: ["target_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_feed_target_agent_id_fkey"
            columns: ["target_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_earnings: {
        Row: {
          agent_id: string
          amount_meeet: number | null
          created_at: string | null
          id: string
          quest_id: string | null
          source: string
          user_id: string
        }
        Insert: {
          agent_id: string
          amount_meeet?: number | null
          created_at?: string | null
          id?: string
          quest_id?: string | null
          source: string
          user_id: string
        }
        Update: {
          agent_id?: string
          amount_meeet?: number | null
          created_at?: string | null
          id?: string
          quest_id?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_earnings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_earnings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_earnings_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_impact: {
        Row: {
          agent_id: string
          id: string
          metric_type: string
          metric_value: number | null
          period: string | null
          recorded_at: string | null
        }
        Insert: {
          agent_id: string
          id?: string
          metric_type: string
          metric_value?: number | null
          period?: string | null
          recorded_at?: string | null
        }
        Update: {
          agent_id?: string
          id?: string
          metric_type?: string
          metric_value?: number | null
          period?: string | null
          recorded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_impact_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_impact_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_messages: {
        Row: {
          channel: string
          content: string
          created_at: string
          from_agent_id: string
          id: string
          to_agent_id: string | null
        }
        Insert: {
          channel?: string
          content: string
          created_at?: string
          from_agent_id: string
          id?: string
          to_agent_id?: string | null
        }
        Update: {
          channel?: string
          content?: string
          created_at?: string
          from_agent_id?: string
          id?: string
          to_agent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_from_agent_id_fkey"
            columns: ["from_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_from_agent_id_fkey"
            columns: ["from_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_to_agent_id_fkey"
            columns: ["to_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_to_agent_id_fkey"
            columns: ["to_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_plans: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_usdc: number | null
          quests_per_day: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price_usdc?: number | null
          quests_per_day?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_usdc?: number | null
          quests_per_day?: number | null
        }
        Relationships: []
      }
      agent_strategies: {
        Row: {
          agent_class: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price_usdc: number | null
          strategy_config: Json | null
        }
        Insert: {
          agent_class?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price_usdc?: number | null
          strategy_config?: Json | null
        }
        Update: {
          agent_class?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_usdc?: number | null
          strategy_config?: Json | null
        }
        Relationships: []
      }
      agent_subscriptions: {
        Row: {
          agent_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          plan_id: string | null
          started_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan_id?: string | null
          started_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan_id?: string | null
          started_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_subscriptions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_subscriptions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "agent_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          attack: number
          balance_meeet: number
          class: Database["public"]["Enums"]["agent_class"]
          country_code: string | null
          created_at: string
          defense: number
          discoveries_count: number
          hp: number
          id: string
          kills: number
          lat: number | null
          level: number
          lng: number | null
          max_hp: number
          name: string
          nation_code: string | null
          pos_x: number
          pos_y: number
          quests_completed: number
          reputation: number
          status: Database["public"]["Enums"]["agent_status"]
          territories_held: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          attack?: number
          balance_meeet?: number
          class?: Database["public"]["Enums"]["agent_class"]
          country_code?: string | null
          created_at?: string
          defense?: number
          discoveries_count?: number
          hp?: number
          id?: string
          kills?: number
          lat?: number | null
          level?: number
          lng?: number | null
          max_hp?: number
          name: string
          nation_code?: string | null
          pos_x?: number
          pos_y?: number
          quests_completed?: number
          reputation?: number
          status?: Database["public"]["Enums"]["agent_status"]
          territories_held?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          attack?: number
          balance_meeet?: number
          class?: Database["public"]["Enums"]["agent_class"]
          country_code?: string | null
          created_at?: string
          defense?: number
          discoveries_count?: number
          hp?: number
          id?: string
          kills?: number
          lat?: number | null
          level?: number
          lng?: number | null
          max_hp?: number
          name?: string
          nation_code?: string | null
          pos_x?: number
          pos_y?: number
          quests_completed?: number
          reputation?: number
          status?: Database["public"]["Enums"]["agent_status"]
          territories_held?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "agents_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "agents_nation_code_fkey"
            columns: ["nation_code"]
            isOneToOne: false
            referencedRelation: "nations"
            referencedColumns: ["code"]
          },
        ]
      }
      ai_generated_content: {
        Row: {
          agent_id: string
          content: string
          content_type: string
          context: string | null
          created_at: string
          id: string
          is_published: boolean | null
        }
        Insert: {
          agent_id: string
          content: string
          content_type?: string
          context?: string | null
          created_at?: string
          id?: string
          is_published?: boolean | null
        }
        Update: {
          agent_id?: string
          content?: string
          content_type?: string
          context?: string | null
          created_at?: string
          id?: string
          is_published?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_generated_content_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generated_content_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      alliances: {
        Row: {
          agent_a_id: string
          agent_b_id: string
          alliance_type: string
          created_at: string
          expires_at: string | null
          id: string
          message: string | null
          proposed_by: string
          status: Database["public"]["Enums"]["alliance_status"]
          updated_at: string
        }
        Insert: {
          agent_a_id: string
          agent_b_id: string
          alliance_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string | null
          proposed_by: string
          status?: Database["public"]["Enums"]["alliance_status"]
          updated_at?: string
        }
        Update: {
          agent_a_id?: string
          agent_b_id?: string
          alliance_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string | null
          proposed_by?: string
          status?: Database["public"]["Enums"]["alliance_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alliances_agent_a_id_fkey"
            columns: ["agent_a_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alliances_agent_a_id_fkey"
            columns: ["agent_a_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alliances_agent_b_id_fkey"
            columns: ["agent_b_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alliances_agent_b_id_fkey"
            columns: ["agent_b_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alliances_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alliances_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      cis_history: {
        Row: {
          calculated_at: string
          cis_score: number
          citizen_count: number
          discoveries_7d: number
          id: string
          nation_code: string | null
          quests_7d: number
        }
        Insert: {
          calculated_at?: string
          cis_score?: number
          citizen_count?: number
          discoveries_7d?: number
          id?: string
          nation_code?: string | null
          quests_7d?: number
        }
        Update: {
          calculated_at?: string
          cis_score?: number
          citizen_count?: number
          discoveries_7d?: number
          id?: string
          nation_code?: string | null
          quests_7d?: number
        }
        Relationships: [
          {
            foreignKeyName: "cis_history_nation_code_fkey"
            columns: ["nation_code"]
            isOneToOne: false
            referencedRelation: "nations"
            referencedColumns: ["code"]
          },
        ]
      }
      countries: {
        Row: {
          bbox_max_lat: number | null
          bbox_max_lng: number | null
          bbox_min_lat: number | null
          bbox_min_lng: number | null
          capital_lat: number
          capital_lng: number
          code: string
          continent: string
          created_at: string | null
          flag_emoji: string
          id: string
          name_en: string
          name_ru: string
          population: number | null
        }
        Insert: {
          bbox_max_lat?: number | null
          bbox_max_lng?: number | null
          bbox_min_lat?: number | null
          bbox_min_lng?: number | null
          capital_lat: number
          capital_lng: number
          code: string
          continent: string
          created_at?: string | null
          flag_emoji: string
          id?: string
          name_en: string
          name_ru: string
          population?: number | null
        }
        Update: {
          bbox_max_lat?: number | null
          bbox_max_lng?: number | null
          bbox_min_lat?: number | null
          bbox_min_lng?: number | null
          capital_lat?: number
          capital_lng?: number
          code?: string
          continent?: string
          created_at?: string | null
          flag_emoji?: string
          id?: string
          name_en?: string
          name_ru?: string
          population?: number | null
        }
        Relationships: []
      }
      deployed_agents: {
        Row: {
          agent_id: string | null
          created_at: string | null
          deployed_at: string | null
          id: string
          plan_id: string | null
          quests_completed: number | null
          status: string | null
          stopped_at: string | null
          strategy_id: string | null
          total_earned_meeet: number | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          deployed_at?: string | null
          id?: string
          plan_id?: string | null
          quests_completed?: number | null
          status?: string | null
          stopped_at?: string | null
          strategy_id?: string | null
          total_earned_meeet?: number | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          deployed_at?: string | null
          id?: string
          plan_id?: string | null
          quests_completed?: number | null
          status?: string | null
          stopped_at?: string | null
          strategy_id?: string | null
          total_earned_meeet?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployed_agents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployed_agents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployed_agents_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "agent_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployed_agents_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "agent_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      discoveries: {
        Row: {
          agent_id: string | null
          agents: Json | null
          created_at: string
          domain: string
          id: string
          impact_score: number
          is_approved: boolean
          is_cited: boolean
          nations: Json | null
          proposed_steps: string | null
          quest_id: string | null
          result_hash: string | null
          solana_tx: string | null
          synthesis_text: string | null
          title: string
          upvotes: number
          view_count: number
        }
        Insert: {
          agent_id?: string | null
          agents?: Json | null
          created_at?: string
          domain?: string
          id?: string
          impact_score?: number
          is_approved?: boolean
          is_cited?: boolean
          nations?: Json | null
          proposed_steps?: string | null
          quest_id?: string | null
          result_hash?: string | null
          solana_tx?: string | null
          synthesis_text?: string | null
          title: string
          upvotes?: number
          view_count?: number
        }
        Update: {
          agent_id?: string | null
          agents?: Json | null
          created_at?: string
          domain?: string
          id?: string
          impact_score?: number
          is_approved?: boolean
          is_cited?: boolean
          nations?: Json | null
          proposed_steps?: string | null
          quest_id?: string | null
          result_hash?: string | null
          solana_tx?: string | null
          synthesis_text?: string | null
          title?: string
          upvotes?: number
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "discoveries_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discoveries_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discoveries_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          agent_id: string
          arbiters: string[] | null
          created_at: string
          id: string
          quest_id: string
          reason: string
          requester_id: string
          resolution: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          updated_at: string
          votes_agent: number | null
          votes_requester: number | null
        }
        Insert: {
          agent_id: string
          arbiters?: string[] | null
          created_at?: string
          id?: string
          quest_id: string
          reason: string
          requester_id: string
          resolution?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
          votes_agent?: number | null
          votes_requester?: number | null
        }
        Update: {
          agent_id?: string
          arbiters?: string[] | null
          created_at?: string
          id?: string
          quest_id?: string
          reason?: string
          requester_id?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
          votes_agent?: number | null
          votes_requester?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      duels: {
        Row: {
          burn_amount: number | null
          challenger_agent_id: string
          challenger_damage: number | null
          challenger_roll: number | null
          created_at: string
          defender_agent_id: string
          defender_damage: number | null
          defender_roll: number | null
          expires_at: string
          id: string
          resolved_at: string | null
          stake_meeet: number
          status: Database["public"]["Enums"]["duel_status"]
          tax_amount: number | null
          winner_agent_id: string | null
        }
        Insert: {
          burn_amount?: number | null
          challenger_agent_id: string
          challenger_damage?: number | null
          challenger_roll?: number | null
          created_at?: string
          defender_agent_id: string
          defender_damage?: number | null
          defender_roll?: number | null
          expires_at?: string
          id?: string
          resolved_at?: string | null
          stake_meeet?: number
          status?: Database["public"]["Enums"]["duel_status"]
          tax_amount?: number | null
          winner_agent_id?: string | null
        }
        Update: {
          burn_amount?: number | null
          challenger_agent_id?: string
          challenger_damage?: number | null
          challenger_roll?: number | null
          created_at?: string
          defender_agent_id?: string
          defender_damage?: number | null
          defender_roll?: number | null
          expires_at?: string
          id?: string
          resolved_at?: string | null
          stake_meeet?: number
          status?: Database["public"]["Enums"]["duel_status"]
          tax_amount?: number | null
          winner_agent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duels_challenger_agent_id_fkey"
            columns: ["challenger_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_challenger_agent_id_fkey"
            columns: ["challenger_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_defender_agent_id_fkey"
            columns: ["defender_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_defender_agent_id_fkey"
            columns: ["defender_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_winner_agent_id_fkey"
            columns: ["winner_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_winner_agent_id_fkey"
            columns: ["winner_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_members: {
        Row: {
          agent_id: string
          guild_id: string
          id: string
          joined_at: string
          role: string | null
        }
        Insert: {
          agent_id: string
          guild_id: string
          id?: string
          joined_at?: string
          role?: string | null
        }
        Update: {
          agent_id?: string
          guild_id?: string
          id?: string
          joined_at?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guild_members_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_members_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_members_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      guilds: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          master_id: string
          member_count: number | null
          name: string
          territory_id: string | null
          total_earnings: number | null
          treasury_meeet: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          master_id: string
          member_count?: number | null
          name: string
          territory_id?: string | null
          total_earnings?: number | null
          treasury_meeet?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          master_id?: string
          member_count?: number | null
          name?: string
          territory_id?: string | null
          total_earnings?: number | null
          treasury_meeet?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guilds_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      herald_issues: {
        Row: {
          body: string
          created_at: string
          daily_stats: Json | null
          headline: string
          id: string
          issue_date: string
          main_event: string | null
          president_quote: string | null
          top_agents: Json | null
        }
        Insert: {
          body: string
          created_at?: string
          daily_stats?: Json | null
          headline: string
          id?: string
          issue_date?: string
          main_event?: string | null
          president_quote?: string | null
          top_agents?: Json | null
        }
        Update: {
          body?: string
          created_at?: string
          daily_stats?: Json | null
          headline?: string
          id?: string
          issue_date?: string
          main_event?: string | null
          president_quote?: string | null
          top_agents?: Json | null
        }
        Relationships: []
      }
      laws: {
        Row: {
          created_at: string
          description: string
          id: string
          proposer_id: string
          quorum: number | null
          stake_meeet: number | null
          status: Database["public"]["Enums"]["law_status"]
          threshold_pct: number | null
          title: string
          updated_at: string
          veto_reason: string | null
          vetoed_at: string | null
          vetoed_by: string | null
          voter_count: number | null
          votes_no: number | null
          votes_yes: number | null
          voting_ends_at: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          proposer_id: string
          quorum?: number | null
          stake_meeet?: number | null
          status?: Database["public"]["Enums"]["law_status"]
          threshold_pct?: number | null
          title: string
          updated_at?: string
          veto_reason?: string | null
          vetoed_at?: string | null
          vetoed_by?: string | null
          voter_count?: number | null
          votes_no?: number | null
          votes_yes?: number | null
          voting_ends_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          proposer_id?: string
          quorum?: number | null
          stake_meeet?: number | null
          status?: Database["public"]["Enums"]["law_status"]
          threshold_pct?: number | null
          title?: string
          updated_at?: string
          veto_reason?: string | null
          vetoed_at?: string | null
          vetoed_by?: string | null
          voter_count?: number | null
          votes_no?: number | null
          votes_yes?: number | null
          voting_ends_at?: string | null
        }
        Relationships: []
      }
      nation_citizenships: {
        Row: {
          agent_id: string
          ghost_mode_until: string | null
          id: string
          is_ghost_mode: boolean
          joined_at: string
          nation_code: string
          tier: string
        }
        Insert: {
          agent_id: string
          ghost_mode_until?: string | null
          id?: string
          is_ghost_mode?: boolean
          joined_at?: string
          nation_code: string
          tier?: string
        }
        Update: {
          agent_id?: string
          ghost_mode_until?: string | null
          id?: string
          is_ghost_mode?: boolean
          joined_at?: string
          nation_code?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "nation_citizenships_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nation_citizenships_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nation_citizenships_nation_code_fkey"
            columns: ["nation_code"]
            isOneToOne: false
            referencedRelation: "nations"
            referencedColumns: ["code"]
          },
        ]
      }
      nations: {
        Row: {
          ai_doctrine: string | null
          capital_lat: number | null
          capital_lng: number | null
          cis_score: number
          citizen_count: number
          code: string
          continent: string | null
          created_at: string
          flag_emoji: string
          geo_bounds: Json | null
          name_en: string
          name_ru: string | null
          treasury_meeet: number
          updated_at: string
        }
        Insert: {
          ai_doctrine?: string | null
          capital_lat?: number | null
          capital_lng?: number | null
          cis_score?: number
          citizen_count?: number
          code: string
          continent?: string | null
          created_at?: string
          flag_emoji?: string
          geo_bounds?: Json | null
          name_en: string
          name_ru?: string | null
          treasury_meeet?: number
          updated_at?: string
        }
        Update: {
          ai_doctrine?: string | null
          capital_lat?: number | null
          capital_lng?: number | null
          cis_score?: number
          citizen_count?: number
          code?: string
          continent?: string | null
          created_at?: string
          flag_emoji?: string
          geo_bounds?: Json | null
          name_en?: string
          name_ru?: string | null
          treasury_meeet?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          agent_id: string | null
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          reference_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      oracle_bets: {
        Row: {
          agent_id: string
          amount_meeet: number | null
          created_at: string | null
          id: string
          prediction: boolean
          question_id: string
          user_id: string
        }
        Insert: {
          agent_id: string
          amount_meeet?: number | null
          created_at?: string | null
          id?: string
          prediction: boolean
          question_id: string
          user_id: string
        }
        Update: {
          agent_id?: string
          amount_meeet?: number | null
          created_at?: string | null
          id?: string
          prediction?: boolean
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oracle_bets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oracle_bets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oracle_bets_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "oracle_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      oracle_questions: {
        Row: {
          category: string | null
          created_at: string | null
          creator_agent_id: string | null
          deadline: string
          description: string | null
          id: string
          question_text: string
          resolution: string | null
          resolved_at: string | null
          status: string | null
          total_pool_meeet: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          creator_agent_id?: string | null
          deadline: string
          description?: string | null
          id?: string
          question_text: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string | null
          total_pool_meeet?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          creator_agent_id?: string | null
          deadline?: string
          description?: string | null
          id?: string
          question_text?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string | null
          total_pool_meeet?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "oracle_questions_creator_agent_id_fkey"
            columns: ["creator_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oracle_questions_creator_agent_id_fkey"
            columns: ["creator_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      oracle_scores: {
        Row: {
          agent_id: string
          correct: number | null
          current_streak: number | null
          last_updated: string | null
          max_streak: number | null
          score: number | null
          total_predictions: number | null
          win_rate: number | null
          wrong: number | null
        }
        Insert: {
          agent_id: string
          correct?: number | null
          current_streak?: number | null
          last_updated?: string | null
          max_streak?: number | null
          score?: number | null
          total_predictions?: number | null
          win_rate?: number | null
          wrong?: number | null
        }
        Update: {
          agent_id?: string
          correct?: number | null
          current_streak?: number | null
          last_updated?: string | null
          max_streak?: number | null
          score?: number | null
          total_predictions?: number | null
          win_rate?: number | null
          wrong?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "oracle_scores_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oracle_scores_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_meeet: number | null
          amount_sol: number | null
          amount_usdc: number | null
          created_at: string | null
          id: string
          payment_method: string | null
          reference_id: string | null
          reference_type: string | null
          status: string | null
          tx_hash: string | null
          user_id: string
        }
        Insert: {
          amount_meeet?: number | null
          amount_sol?: number | null
          amount_usdc?: number | null
          created_at?: string | null
          id?: string
          payment_method?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          tx_hash?: string | null
          user_id: string
        }
        Update: {
          amount_meeet?: number | null
          amount_sol?: number | null
          amount_usdc?: number | null
          created_at?: string | null
          id?: string
          payment_method?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          tx_hash?: string | null
          user_id?: string
        }
        Relationships: []
      }
      petitions: {
        Row: {
          agent_id: string | null
          created_at: string
          id: string
          message: string
          replied_at: string | null
          reply: string | null
          sender_name: string
          status: string
          subject: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          id?: string
          message: string
          replied_at?: string | null
          reply?: string | null
          sender_name: string
          status?: string
          subject: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          id?: string
          message?: string
          replied_at?: string | null
          reply?: string | null
          sender_name?: string
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "petitions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petitions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_onboarded: boolean | null
          is_president: boolean | null
          passport_tier: Database["public"]["Enums"]["passport_tier"] | null
          referral_code: string | null
          referred_by: string | null
          twitter_handle: string | null
          updated_at: string
          user_id: string
          username: string | null
          wallet_address: string | null
          welcome_bonus_claimed: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_onboarded?: boolean | null
          is_president?: boolean | null
          passport_tier?: Database["public"]["Enums"]["passport_tier"] | null
          referral_code?: string | null
          referred_by?: string | null
          twitter_handle?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          wallet_address?: string | null
          welcome_bonus_claimed?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_onboarded?: boolean | null
          is_president?: boolean | null
          passport_tier?: Database["public"]["Enums"]["passport_tier"] | null
          referral_code?: string | null
          referred_by?: string | null
          twitter_handle?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          wallet_address?: string | null
          welcome_bonus_claimed?: boolean | null
        }
        Relationships: []
      }
      quest_bids: {
        Row: {
          agent_id: string
          bid_type: Database["public"]["Enums"]["bid_type"]
          created_at: string
          eta_hours: number | null
          id: string
          is_accepted: boolean | null
          message: string | null
          price_sol: number | null
          quest_id: string
        }
        Insert: {
          agent_id: string
          bid_type?: Database["public"]["Enums"]["bid_type"]
          created_at?: string
          eta_hours?: number | null
          id?: string
          is_accepted?: boolean | null
          message?: string | null
          price_sol?: number | null
          quest_id: string
        }
        Update: {
          agent_id?: string
          bid_type?: Database["public"]["Enums"]["bid_type"]
          created_at?: string
          eta_hours?: number | null
          id?: string
          is_accepted?: boolean | null
          message?: string | null
          price_sol?: number | null
          quest_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_bids_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_bids_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_bids_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_submissions: {
        Row: {
          agent_id: string
          airdrop_status: string
          airdrop_tx_hash: string | null
          airdropped_at: string | null
          created_at: string
          id: string
          quest_id: string
          result_text: string | null
          result_url: string | null
          reward_meeet: number
          reward_sol: number
          updated_at: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          agent_id: string
          airdrop_status?: string
          airdrop_tx_hash?: string | null
          airdropped_at?: string | null
          created_at?: string
          id?: string
          quest_id: string
          result_text?: string | null
          result_url?: string | null
          reward_meeet?: number
          reward_sol?: number
          updated_at?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          agent_id?: string
          airdrop_status?: string
          airdrop_tx_hash?: string | null
          airdropped_at?: string | null
          created_at?: string
          id?: string
          quest_id?: string
          result_text?: string | null
          result_url?: string | null
          reward_meeet?: number
          reward_sol?: number
          updated_at?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_submissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_submissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_submissions_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          assigned_agent_id: string | null
          auto_generated: boolean
          category: Database["public"]["Enums"]["quest_category"]
          completed_at: string | null
          created_at: string
          deadline_at: string | null
          deadline_hours: number
          delivered_at: string | null
          description: string
          domain: string | null
          id: string
          is_global_challenge: boolean
          is_sponsored: boolean | null
          max_participants: number | null
          requester_id: string
          result_text: string | null
          result_url: string | null
          reward_meeet: number | null
          reward_sol: number
          source_event_id: string | null
          status: Database["public"]["Enums"]["quest_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_agent_id?: string | null
          auto_generated?: boolean
          category?: Database["public"]["Enums"]["quest_category"]
          completed_at?: string | null
          created_at?: string
          deadline_at?: string | null
          deadline_hours?: number
          delivered_at?: string | null
          description: string
          domain?: string | null
          id?: string
          is_global_challenge?: boolean
          is_sponsored?: boolean | null
          max_participants?: number | null
          requester_id: string
          result_text?: string | null
          result_url?: string | null
          reward_meeet?: number | null
          reward_sol: number
          source_event_id?: string | null
          status?: Database["public"]["Enums"]["quest_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string | null
          auto_generated?: boolean
          category?: Database["public"]["Enums"]["quest_category"]
          completed_at?: string | null
          created_at?: string
          deadline_at?: string | null
          deadline_hours?: number
          delivered_at?: string | null
          description?: string
          domain?: string | null
          id?: string
          is_global_challenge?: boolean
          is_sponsored?: boolean | null
          max_participants?: number | null
          requester_id?: string
          result_text?: string | null
          result_url?: string | null
          reward_meeet?: number | null
          reward_sol?: number
          source_event_id?: string | null
          status?: Database["public"]["Enums"]["quest_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quests_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quests_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quests_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "world_events"
            referencedColumns: ["id"]
          },
        ]
      }
      raid_claims: {
        Row: {
          agent_id: string | null
          campaign_tag: string
          created_at: string
          id: string
          proof_text: string | null
          proof_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reward_meeet: number
          status: string
          twitter_handle: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          campaign_tag?: string
          created_at?: string
          id?: string
          proof_text?: string | null
          proof_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_meeet?: number
          status?: string
          twitter_handle: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          campaign_tag?: string
          created_at?: string
          id?: string
          proof_text?: string | null
          proof_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_meeet?: number
          status?: string
          twitter_handle?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raid_claims_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raid_claims_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          id: string
          key: string
          request_count: number
          window_start: string
        }
        Insert: {
          id?: string
          key: string
          request_count?: number
          window_start?: string
        }
        Update: {
          id?: string
          key?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          ref_code: string
          referred_user_id: string
          referrer_user_id: string
          status: Database["public"]["Enums"]["referral_status"]
          total_earned_meeet: number
        }
        Insert: {
          created_at?: string
          id?: string
          ref_code: string
          referred_user_id: string
          referrer_user_id: string
          status?: Database["public"]["Enums"]["referral_status"]
          total_earned_meeet?: number
        }
        Update: {
          created_at?: string
          id?: string
          ref_code?: string
          referred_user_id?: string
          referrer_user_id?: string
          status?: Database["public"]["Enums"]["referral_status"]
          total_earned_meeet?: number
        }
        Relationships: []
      }
      reputation_log: {
        Row: {
          agent_id: string
          created_at: string
          delta: number
          id: string
          quest_id: string | null
          reason: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          delta: number
          id?: string
          quest_id?: string | null
          reason: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          delta?: number
          id?: string
          quest_id?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "reputation_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reputation_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reputation_log_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      state_treasury: {
        Row: {
          balance_meeet: number
          balance_sol: number
          id: string
          total_burned: number
          total_land_revenue: number
          total_passport_revenue: number
          total_quest_payouts: number
          total_tax_collected: number
          updated_at: string
        }
        Insert: {
          balance_meeet?: number
          balance_sol?: number
          id?: string
          total_burned?: number
          total_land_revenue?: number
          total_passport_revenue?: number
          total_quest_payouts?: number
          total_tax_collected?: number
          updated_at?: string
        }
        Update: {
          balance_meeet?: number
          balance_sol?: number
          id?: string
          total_burned?: number
          total_land_revenue?: number
          total_passport_revenue?: number
          total_quest_payouts?: number
          total_tax_collected?: number
          updated_at?: string
        }
        Relationships: []
      }
      structures: {
        Row: {
          created_at: string
          id: string
          income_meeet: number | null
          level: number | null
          name: string
          owner_agent_id: string
          pos_x: number
          pos_y: number
          territory_id: string
          type: Database["public"]["Enums"]["structure_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          income_meeet?: number | null
          level?: number | null
          name: string
          owner_agent_id: string
          pos_x: number
          pos_y: number
          territory_id: string
          type: Database["public"]["Enums"]["structure_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          income_meeet?: number | null
          level?: number | null
          name?: string
          owner_agent_id?: string
          pos_x?: number
          pos_y?: number
          territory_id?: string
          type?: Database["public"]["Enums"]["structure_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "structures_owner_agent_id_fkey"
            columns: ["owner_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "structures_owner_agent_id_fkey"
            columns: ["owner_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "structures_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      territories: {
        Row: {
          buildings: Json | null
          created_at: string
          id: string
          is_for_sale: boolean | null
          name: string | null
          owner_agent_id: string | null
          owner_id: string | null
          plot_number: number
          pos_x: number
          pos_y: number
          price_meeet: number | null
          tax_rate: number | null
          territory_type: Database["public"]["Enums"]["territory_type"]
          updated_at: string
        }
        Insert: {
          buildings?: Json | null
          created_at?: string
          id?: string
          is_for_sale?: boolean | null
          name?: string | null
          owner_agent_id?: string | null
          owner_id?: string | null
          plot_number: number
          pos_x: number
          pos_y: number
          price_meeet?: number | null
          tax_rate?: number | null
          territory_type?: Database["public"]["Enums"]["territory_type"]
          updated_at?: string
        }
        Update: {
          buildings?: Json | null
          created_at?: string
          id?: string
          is_for_sale?: boolean | null
          name?: string | null
          owner_agent_id?: string | null
          owner_id?: string | null
          plot_number?: number
          pos_x?: number
          pos_y?: number
          price_meeet?: number | null
          tax_rate?: number | null
          territory_type?: Database["public"]["Enums"]["territory_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "territories_owner_agent_id_fkey"
            columns: ["owner_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territories_owner_agent_id_fkey"
            columns: ["owner_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_offers: {
        Row: {
          created_at: string
          expires_at: string
          from_agent_id: string
          id: string
          message: string | null
          offer_meeet: number
          request_meeet: number
          resolved_at: string | null
          status: Database["public"]["Enums"]["trade_status"]
          to_agent_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          from_agent_id: string
          id?: string
          message?: string | null
          offer_meeet?: number
          request_meeet?: number
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["trade_status"]
          to_agent_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          from_agent_id?: string
          id?: string
          message?: string | null
          offer_meeet?: number
          request_meeet?: number
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["trade_status"]
          to_agent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_offers_from_agent_id_fkey"
            columns: ["from_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_offers_from_agent_id_fkey"
            columns: ["from_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_offers_to_agent_id_fkey"
            columns: ["to_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_offers_to_agent_id_fkey"
            columns: ["to_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_meeet: number | null
          amount_sol: number | null
          burn_amount: number | null
          created_at: string
          description: string | null
          from_agent_id: string | null
          from_user_id: string | null
          id: string
          quest_id: string | null
          tax_amount: number | null
          to_agent_id: string | null
          to_user_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount_meeet?: number | null
          amount_sol?: number | null
          burn_amount?: number | null
          created_at?: string
          description?: string | null
          from_agent_id?: string | null
          from_user_id?: string | null
          id?: string
          quest_id?: string | null
          tax_amount?: number | null
          to_agent_id?: string | null
          to_user_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount_meeet?: number | null
          amount_sol?: number | null
          burn_amount?: number | null
          created_at?: string
          description?: string | null
          from_agent_id?: string | null
          from_user_id?: string | null
          id?: string
          quest_id?: string | null
          tax_amount?: number | null
          to_agent_id?: string | null
          to_user_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_from_agent_id_fkey"
            columns: ["from_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_from_agent_id_fkey"
            columns: ["from_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_agent_id_fkey"
            columns: ["to_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_agent_id_fkey"
            columns: ["to_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string
          fee_meeet: number | null
          id: string
          law_id: string
          vote: boolean
          voter_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          fee_meeet?: number | null
          id?: string
          law_id: string
          vote: boolean
          voter_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          fee_meeet?: number | null
          id?: string
          law_id?: string
          vote?: boolean
          voter_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "votes_law_id_fkey"
            columns: ["law_id"]
            isOneToOne: false
            referencedRelation: "laws"
            referencedColumns: ["id"]
          },
        ]
      }
      warning_votes: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          reasoning: string | null
          vote: string
          warning_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          reasoning?: string | null
          vote: string
          warning_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          reasoning?: string | null
          vote?: string
          warning_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warning_votes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warning_votes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warning_votes_warning_id_fkey"
            columns: ["warning_id"]
            isOneToOne: false
            referencedRelation: "warnings"
            referencedColumns: ["id"]
          },
        ]
      }
      warnings: {
        Row: {
          confirming_agents_count: number | null
          country_code: string | null
          created_at: string | null
          description: string
          id: string
          region: string
          severity: number | null
          source_data: Json | null
          status: string | null
          title: string
          type: string
          verified_at: string | null
        }
        Insert: {
          confirming_agents_count?: number | null
          country_code?: string | null
          created_at?: string | null
          description: string
          id?: string
          region: string
          severity?: number | null
          source_data?: Json | null
          status?: string | null
          title: string
          type: string
          verified_at?: string | null
        }
        Update: {
          confirming_agents_count?: number | null
          country_code?: string | null
          created_at?: string | null
          description?: string
          id?: string
          region?: string
          severity?: number | null
          source_data?: Json | null
          status?: string | null
          title?: string
          type?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      world_events: {
        Row: {
          created_at: string
          event_type: string
          goldstein_scale: number | null
          id: string
          lat: number | null
          lng: number | null
          nation_codes: Json | null
          source_url: string | null
          title: string
        }
        Insert: {
          created_at?: string
          event_type?: string
          goldstein_scale?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          nation_codes?: Json | null
          source_url?: string | null
          title: string
        }
        Update: {
          created_at?: string
          event_type?: string
          goldstein_scale?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          nation_codes?: Json | null
          source_url?: string | null
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      agents_public: {
        Row: {
          attack: number | null
          balance_meeet: number | null
          class: Database["public"]["Enums"]["agent_class"] | null
          created_at: string | null
          defense: number | null
          discoveries_count: number | null
          hp: number | null
          id: string | null
          kills: number | null
          lat: number | null
          level: number | null
          lng: number | null
          max_hp: number | null
          name: string | null
          nation_code: string | null
          pos_x: number | null
          pos_y: number | null
          quests_completed: number | null
          reputation: number | null
          status: Database["public"]["Enums"]["agent_status"] | null
          territories_held: number | null
          updated_at: string | null
          xp: number | null
        }
        Insert: {
          attack?: number | null
          balance_meeet?: number | null
          class?: Database["public"]["Enums"]["agent_class"] | null
          created_at?: string | null
          defense?: number | null
          discoveries_count?: number | null
          hp?: number | null
          id?: string | null
          kills?: number | null
          lat?: number | null
          level?: number | null
          lng?: number | null
          max_hp?: number | null
          name?: string | null
          nation_code?: string | null
          pos_x?: number | null
          pos_y?: number | null
          quests_completed?: number | null
          reputation?: number | null
          status?: Database["public"]["Enums"]["agent_status"] | null
          territories_held?: number | null
          updated_at?: string | null
          xp?: number | null
        }
        Update: {
          attack?: number | null
          balance_meeet?: number | null
          class?: Database["public"]["Enums"]["agent_class"] | null
          created_at?: string | null
          defense?: number | null
          discoveries_count?: number | null
          hp?: number | null
          id?: string | null
          kills?: number | null
          lat?: number | null
          level?: number | null
          lng?: number | null
          max_hp?: number | null
          name?: string | null
          nation_code?: string | null
          pos_x?: number | null
          pos_y?: number | null
          quests_completed?: number | null
          reputation?: number | null
          status?: Database["public"]["Enums"]["agent_status"] | null
          territories_held?: number | null
          updated_at?: string | null
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_nation_code_fkey"
            columns: ["nation_code"]
            isOneToOne: false
            referencedRelation: "nations"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Functions: {
      check_rate_limit: {
        Args: { _key: string; _max_requests: number; _window_seconds: number }
        Returns: boolean
      }
      get_agent_protected_fields: {
        Args: { _agent_id: string }
        Returns: {
          attack: number
          balance_meeet: number
          class: Database["public"]["Enums"]["agent_class"]
          defense: number
          hp: number
          kills: number
          level: number
          max_hp: number
          quests_completed: number
          territories_held: number
          xp: number
        }[]
      }
      get_guild_protected_fields: {
        Args: { _guild_id: string }
        Returns: {
          member_count: number
          total_earnings: number
          treasury_meeet: number
        }[]
      }
      get_law_protected_fields: {
        Args: { _law_id: string }
        Returns: {
          status: Database["public"]["Enums"]["law_status"]
          veto_reason: string
          vetoed_at: string
          vetoed_by: string
          voter_count: number
          votes_no: number
          votes_yes: number
        }[]
      }
      get_profile_protected_fields: {
        Args: { _user_id: string }
        Returns: {
          is_president: boolean
          passport_tier: Database["public"]["Enums"]["passport_tier"]
          welcome_bonus_claimed: boolean
        }[]
      }
      get_quest_protected_fields: {
        Args: { _quest_id: string }
        Returns: {
          assigned_agent_id: string
          reward_meeet: number
          reward_sol: number
          status: Database["public"]["Enums"]["quest_status"]
        }[]
      }
      get_raid_campaign_stats: {
        Args: { _campaign_tag: string }
        Returns: {
          approved_claims: number
          pending_claims: number
          total_claims: number
          total_rewarded: number
        }[]
      }
      get_trade_protected_fields: {
        Args: { _trade_id: string }
        Returns: {
          from_agent_id: string
          offer_meeet: number
          request_meeet: number
          to_agent_id: string
        }[]
      }
      validate_api_key: { Args: { _key_hash: string }; Returns: string }
    }
    Enums: {
      agent_class:
        | "warrior"
        | "trader"
        | "scout"
        | "diplomat"
        | "builder"
        | "hacker"
        | "president"
        | "oracle"
        | "miner"
        | "banker"
      agent_status:
        | "active"
        | "idle"
        | "dead"
        | "in_combat"
        | "trading"
        | "exploring"
      alliance_status: "proposed" | "active" | "broken" | "expired"
      bid_type: "yes" | "no" | "counter"
      dispute_status:
        | "open"
        | "arbitration"
        | "resolved_requester"
        | "resolved_agent"
        | "auto_approved"
      duel_status: "pending" | "active" | "completed" | "cancelled" | "expired"
      law_status: "proposed" | "voting" | "passed" | "rejected" | "vetoed"
      passport_tier: "resident" | "citizen" | "elite"
      quest_category:
        | "data_analysis"
        | "twitter_raid"
        | "code"
        | "research"
        | "creative"
        | "moderation"
        | "security"
        | "other"
      quest_status:
        | "open"
        | "in_progress"
        | "delivered"
        | "review"
        | "completed"
        | "disputed"
        | "cancelled"
      referral_status: "pending" | "registered" | "passport" | "first_quest"
      structure_type:
        | "guild_hall"
        | "bank"
        | "exchange"
        | "arena"
        | "tavern"
        | "oracle_tower"
        | "embassy"
        | "mine"
        | "hospital"
        | "academy"
        | "marketplace"
        | "quest_board"
        | "newspaper"
        | "jail"
        | "teleporter"
      territory_type: "plains" | "forest" | "mountain" | "coastal" | "desert"
      trade_status:
        | "pending"
        | "accepted"
        | "declined"
        | "cancelled"
        | "expired"
      transaction_type:
        | "quest_reward"
        | "trade"
        | "tax"
        | "burn"
        | "transfer"
        | "stake"
        | "unstake"
        | "mint"
        | "duel_reward"
        | "mining_reward"
        | "guild_share"
        | "vote_fee"
        | "passport_purchase"
        | "land_purchase"
        | "arbitration_fee"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agent_class: [
        "warrior",
        "trader",
        "scout",
        "diplomat",
        "builder",
        "hacker",
        "president",
        "oracle",
        "miner",
        "banker",
      ],
      agent_status: [
        "active",
        "idle",
        "dead",
        "in_combat",
        "trading",
        "exploring",
      ],
      alliance_status: ["proposed", "active", "broken", "expired"],
      bid_type: ["yes", "no", "counter"],
      dispute_status: [
        "open",
        "arbitration",
        "resolved_requester",
        "resolved_agent",
        "auto_approved",
      ],
      duel_status: ["pending", "active", "completed", "cancelled", "expired"],
      law_status: ["proposed", "voting", "passed", "rejected", "vetoed"],
      passport_tier: ["resident", "citizen", "elite"],
      quest_category: [
        "data_analysis",
        "twitter_raid",
        "code",
        "research",
        "creative",
        "moderation",
        "security",
        "other",
      ],
      quest_status: [
        "open",
        "in_progress",
        "delivered",
        "review",
        "completed",
        "disputed",
        "cancelled",
      ],
      referral_status: ["pending", "registered", "passport", "first_quest"],
      structure_type: [
        "guild_hall",
        "bank",
        "exchange",
        "arena",
        "tavern",
        "oracle_tower",
        "embassy",
        "mine",
        "hospital",
        "academy",
        "marketplace",
        "quest_board",
        "newspaper",
        "jail",
        "teleporter",
      ],
      territory_type: ["plains", "forest", "mountain", "coastal", "desert"],
      trade_status: ["pending", "accepted", "declined", "cancelled", "expired"],
      transaction_type: [
        "quest_reward",
        "trade",
        "tax",
        "burn",
        "transfer",
        "stake",
        "unstake",
        "mint",
        "duel_reward",
        "mining_reward",
        "guild_share",
        "vote_fee",
        "passport_purchase",
        "land_purchase",
        "arbitration_fee",
      ],
    },
  },
} as const
