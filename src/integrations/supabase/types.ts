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
      academy_steps: {
        Row: {
          agent_id: string
          boost_value: number | null
          completed_at: string | null
          cost_meeet: number | null
          course_name: string
          id: string
          stat_boost: string | null
          step_number: number | null
        }
        Insert: {
          agent_id: string
          boost_value?: number | null
          completed_at?: string | null
          cost_meeet?: number | null
          course_name: string
          id?: string
          stat_boost?: string | null
          step_number?: number | null
        }
        Update: {
          agent_id?: string
          boost_value?: number | null
          completed_at?: string | null
          cost_meeet?: number | null
          course_name?: string
          id?: string
          stat_boost?: string | null
          step_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_steps_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_steps_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          created_at: string | null
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          created_at?: string | null
          description: string
          icon?: string
          id?: string
          name: string
          requirement_type: string
          requirement_value?: number
        }
        Update: {
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
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
      agent_actions: {
        Row: {
          action_type: string
          agent_id: string | null
          cost_usd: number | null
          created_at: string
          details: Json | null
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          agent_id?: string | null
          cost_usd?: number | null
          created_at?: string
          details?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          agent_id?: string | null
          cost_usd?: number | null
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_actions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_actions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_analytics: {
        Row: {
          agent_id: string
          avg_response_time_ms: number | null
          conversations: number | null
          created_at: string | null
          date: string
          estimated_cost_saved: number | null
          estimated_hours_saved: number | null
          id: string
          messages_sent: number | null
          satisfaction_score: number | null
          tasks_completed: number | null
          tokens_used: number | null
        }
        Insert: {
          agent_id: string
          avg_response_time_ms?: number | null
          conversations?: number | null
          created_at?: string | null
          date: string
          estimated_cost_saved?: number | null
          estimated_hours_saved?: number | null
          id?: string
          messages_sent?: number | null
          satisfaction_score?: number | null
          tasks_completed?: number | null
          tokens_used?: number | null
        }
        Update: {
          agent_id?: string
          avg_response_time_ms?: number | null
          conversations?: number | null
          created_at?: string | null
          date?: string
          estimated_cost_saved?: number | null
          estimated_hours_saved?: number | null
          id?: string
          messages_sent?: number | null
          satisfaction_score?: number | null
          tasks_completed?: number | null
          tokens_used?: number | null
        }
        Relationships: []
      }
      agent_billing: {
        Row: {
          balance_usd: number
          created_at: string
          free_credit_used: boolean
          id: string
          total_charged: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_usd?: number
          created_at?: string
          free_credit_used?: boolean
          id?: string
          total_charged?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_usd?: number
          created_at?: string
          free_credit_used?: boolean
          id?: string
          total_charged?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_channels: {
        Row: {
          agent_id: string
          channel_type: string
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_message_at: string | null
          messages_count: number | null
        }
        Insert: {
          agent_id: string
          channel_type: string
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          messages_count?: number | null
        }
        Update: {
          agent_id?: string
          channel_type?: string
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          messages_count?: number | null
        }
        Relationships: []
      }
      agent_connectors: {
        Row: {
          agent_id: string
          config: Json | null
          connector_name: string
          connector_type: string
          created_at: string | null
          id: string
          is_active: boolean | null
        }
        Insert: {
          agent_id: string
          config?: Json | null
          connector_name: string
          connector_type: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
        }
        Update: {
          agent_id?: string
          config?: Json | null
          connector_name?: string
          connector_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      agent_convictions: {
        Row: {
          agent_id: string
          conviction_score: number | null
          evidence_count: number | null
          id: string
          last_updated: string | null
          topic: string
        }
        Insert: {
          agent_id: string
          conviction_score?: number | null
          evidence_count?: number | null
          id?: string
          last_updated?: string | null
          topic: string
        }
        Update: {
          agent_id?: string
          conviction_score?: number | null
          evidence_count?: number | null
          id?: string
          last_updated?: string | null
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_convictions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_convictions_agent_id_fkey"
            columns: ["agent_id"]
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
      agent_hiring_proposals: {
        Row: {
          civilization: string
          created_at: string
          hired_agent_id: string | null
          id: string
          personality_preferences: Json | null
          proposed_by_agent: string | null
          reason: string
          required_skills: string[]
          resolved_at: string | null
          status: string
          votes_against: number
          votes_for: number
        }
        Insert: {
          civilization: string
          created_at?: string
          hired_agent_id?: string | null
          id?: string
          personality_preferences?: Json | null
          proposed_by_agent?: string | null
          reason: string
          required_skills?: string[]
          resolved_at?: string | null
          status?: string
          votes_against?: number
          votes_for?: number
        }
        Update: {
          civilization?: string
          created_at?: string
          hired_agent_id?: string | null
          id?: string
          personality_preferences?: Json | null
          proposed_by_agent?: string | null
          reason?: string
          required_skills?: string[]
          resolved_at?: string | null
          status?: string
          votes_against?: number
          votes_for?: number
        }
        Relationships: []
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
      agent_marketplace_listings: {
        Row: {
          agent_id: string
          buyer_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          price_meeet: number
          price_usdc: number | null
          seller_user_id: string
          sold_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          buyer_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          price_meeet?: number
          price_usdc?: number | null
          seller_user_id: string
          sold_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          buyer_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          price_meeet?: number
          price_usdc?: number | null
          seller_user_id?: string
          sold_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_marketplace_listings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_marketplace_listings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memories: {
        Row: {
          agent_id: string | null
          category: string | null
          content: string
          context_tags: string[] | null
          created_at: string | null
          embedding: string | null
          expires_at: string | null
          id: string
          importance: number | null
          importance_score: number | null
          keywords: string[] | null
          last_recalled: string | null
          memory_type: string | null
          recalled_count: number | null
          related_agent_id: string | null
          sentiment_score: number | null
          shared_from: string | null
        }
        Insert: {
          agent_id?: string | null
          category?: string | null
          content: string
          context_tags?: string[] | null
          created_at?: string | null
          embedding?: string | null
          expires_at?: string | null
          id?: string
          importance?: number | null
          importance_score?: number | null
          keywords?: string[] | null
          last_recalled?: string | null
          memory_type?: string | null
          recalled_count?: number | null
          related_agent_id?: string | null
          sentiment_score?: number | null
          shared_from?: string | null
        }
        Update: {
          agent_id?: string | null
          category?: string | null
          content?: string
          context_tags?: string[] | null
          created_at?: string | null
          embedding?: string | null
          expires_at?: string | null
          id?: string
          importance?: number | null
          importance_score?: number | null
          keywords?: string[] | null
          last_recalled?: string | null
          memory_type?: string | null
          recalled_count?: number | null
          related_agent_id?: string | null
          sentiment_score?: number | null
          shared_from?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_memories_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memories_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memories_related_agent_id_fkey"
            columns: ["related_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memories_related_agent_id_fkey"
            columns: ["related_agent_id"]
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
          compute_tier: string | null
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_agents: number | null
          name: string
          price_meeet: number | null
          price_usdc: number | null
          quests_per_day: number | null
        }
        Insert: {
          compute_tier?: string | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_agents?: number | null
          name: string
          price_meeet?: number | null
          price_usdc?: number | null
          quests_per_day?: number | null
        }
        Update: {
          compute_tier?: string | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_agents?: number | null
          name?: string
          price_meeet?: number | null
          price_usdc?: number | null
          quests_per_day?: number | null
        }
        Relationships: []
      }
      agent_stakes: {
        Row: {
          agent_id: string
          amount_meeet: number | null
          apy: number | null
          id: string
          reward_earned: number | null
          rewards_claimed: number | null
          staked_at: string | null
          status: string | null
          tier: string | null
          unstaked_at: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          amount_meeet?: number | null
          apy?: number | null
          id?: string
          reward_earned?: number | null
          rewards_claimed?: number | null
          staked_at?: string | null
          status?: string | null
          tier?: string | null
          unstaked_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          amount_meeet?: number | null
          apy?: number | null
          id?: string
          reward_earned?: number | null
          rewards_claimed?: number | null
          staked_at?: string | null
          status?: string | null
          tier?: string | null
          unstaked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_stakes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_stakes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_strategies: {
        Row: {
          agent_class: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_premium: boolean | null
          name: string
          price_usdc: number | null
          prompt_template: string | null
          purchases: number | null
          strategy_config: Json | null
          target_class: string[] | null
        }
        Insert: {
          agent_class?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          name: string
          price_usdc?: number | null
          prompt_template?: string | null
          purchases?: number | null
          strategy_config?: Json | null
          target_class?: string[] | null
        }
        Update: {
          agent_class?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          name?: string
          price_usdc?: number | null
          prompt_template?: string | null
          purchases?: number | null
          strategy_config?: Json | null
          target_class?: string[] | null
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
      agent_templates: {
        Row: {
          base_system_prompt: string
          category: string
          created_at: string | null
          default_personality: Json | null
          description: string
          difficulty: string
          icon: string | null
          id: string
          name: string
          popularity: number | null
          required_integrations: string[] | null
          suggested_skills: string[] | null
        }
        Insert: {
          base_system_prompt: string
          category: string
          created_at?: string | null
          default_personality?: Json | null
          description: string
          difficulty?: string
          icon?: string | null
          id?: string
          name: string
          popularity?: number | null
          required_integrations?: string[] | null
          suggested_skills?: string[] | null
        }
        Update: {
          base_system_prompt?: string
          category?: string
          created_at?: string | null
          default_personality?: Json | null
          description?: string
          difficulty?: string
          icon?: string | null
          id?: string
          name?: string
          popularity?: number | null
          required_integrations?: string[] | null
          suggested_skills?: string[] | null
        }
        Relationships: []
      }
      agent_tweets: {
        Row: {
          agent_id: string
          content: string
          created_at: string | null
          id: string
          likes: number | null
          replies: number | null
          retweets: number | null
        }
        Insert: {
          agent_id: string
          content: string
          created_at?: string | null
          id?: string
          likes?: number | null
          replies?: number | null
          retweets?: number | null
        }
        Update: {
          agent_id?: string
          content?: string
          created_at?: string | null
          id?: string
          likes?: number | null
          replies?: number | null
          retweets?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_tweets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tweets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
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
          owner_tg_id: string | null
          personality_agreeableness: number | null
          personality_conscientiousness: number | null
          personality_extraversion: number | null
          personality_neuroticism: number | null
          personality_openness: number | null
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
          owner_tg_id?: string | null
          personality_agreeableness?: number | null
          personality_conscientiousness?: number | null
          personality_extraversion?: number | null
          personality_neuroticism?: number | null
          personality_openness?: number | null
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
          owner_tg_id?: string | null
          personality_agreeableness?: number | null
          personality_conscientiousness?: number | null
          personality_extraversion?: number | null
          personality_neuroticism?: number | null
          personality_openness?: number | null
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
      burn_log: {
        Row: {
          agent_id: string | null
          amount: number
          created_at: string | null
          details: Json | null
          id: string
          reason: string
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          amount: number
          created_at?: string | null
          details?: Json | null
          id?: string
          reason: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          amount?: number
          created_at?: string | null
          details?: Json | null
          id?: string
          reason?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "burn_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "burn_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          agent_id: string | null
          created_at: string | null
          id: string
          message: string
          room_id: string | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          room_id?: string | null
          sender_id: string
          sender_type: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          room_id?: string | null
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
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
      cortex_reports: {
        Row: {
          created_at: string | null
          cycle_number: number
          id: string
          key_findings: Json | null
          predictions: Json | null
          report_type: string
          sentiment_data: Json | null
          summary: string
          title: string
        }
        Insert: {
          created_at?: string | null
          cycle_number: number
          id?: string
          key_findings?: Json | null
          predictions?: Json | null
          report_type: string
          sentiment_data?: Json | null
          summary: string
          title: string
        }
        Update: {
          created_at?: string | null
          cycle_number?: number
          id?: string
          key_findings?: Json | null
          predictions?: Json | null
          report_type?: string
          sentiment_data?: Json | null
          summary?: string
          title?: string
        }
        Relationships: []
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
      custom_agents: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          creator_id: string
          id: string
          is_published: boolean | null
          knowledge_base: string | null
          language: string | null
          max_tokens: number | null
          name: string
          personality: Json | null
          skills: string[] | null
          status: string | null
          system_prompt: string
          temperature: number | null
          template_id: string | null
          tone: string | null
          total_conversations: number | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          creator_id: string
          id?: string
          is_published?: boolean | null
          knowledge_base?: string | null
          language?: string | null
          max_tokens?: number | null
          name: string
          personality?: Json | null
          skills?: string[] | null
          status?: string | null
          system_prompt: string
          temperature?: number | null
          template_id?: string | null
          tone?: string | null
          total_conversations?: number | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          creator_id?: string
          id?: string
          is_published?: boolean | null
          knowledge_base?: string | null
          language?: string | null
          max_tokens?: number | null
          name?: string
          personality?: Json | null
          skills?: string[] | null
          status?: string | null
          system_prompt?: string
          temperature?: number | null
          template_id?: string | null
          tone?: string | null
          total_conversations?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_agents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "agent_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_logins: {
        Row: {
          bonus_meeet: number
          created_at: string
          id: string
          login_date: string
          streak_count: number
          user_id: string
        }
        Insert: {
          bonus_meeet?: number
          created_at?: string
          id?: string
          login_date?: string
          streak_count?: number
          user_id: string
        }
        Update: {
          bonus_meeet?: number
          created_at?: string
          id?: string
          login_date?: string
          streak_count?: number
          user_id?: string
        }
        Relationships: []
      }
      deployed_agents: {
        Row: {
          agent_id: string | null
          auto_mode: boolean
          created_at: string | null
          deployed_at: string | null
          id: string
          plan_id: string | null
          quests_completed: number | null
          social_mode: boolean
          status: string | null
          stopped_at: string | null
          strategy_id: string | null
          total_earned_meeet: number | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          auto_mode?: boolean
          created_at?: string | null
          deployed_at?: string | null
          id?: string
          plan_id?: string | null
          quests_completed?: number | null
          social_mode?: boolean
          status?: string | null
          stopped_at?: string | null
          strategy_id?: string | null
          total_earned_meeet?: number | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          auto_mode?: boolean
          created_at?: string | null
          deployed_at?: string | null
          id?: string
          plan_id?: string | null
          quests_completed?: number | null
          social_mode?: boolean
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
          {
            foreignKeyName: "deployed_agents_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "agent_strategies_public"
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
          for_sale: boolean
          id: string
          impact_score: number
          is_approved: boolean
          is_cited: boolean
          nations: Json | null
          price: number | null
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
          for_sale?: boolean
          id?: string
          impact_score?: number
          is_approved?: boolean
          is_cited?: boolean
          nations?: Json | null
          price?: number | null
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
          for_sale?: boolean
          id?: string
          impact_score?: number
          is_approved?: boolean
          is_cited?: boolean
          nations?: Json | null
          price?: number | null
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
      discovery_entity_links: {
        Row: {
          discovery_id: string
          entity_id: string
        }
        Insert: {
          discovery_id: string
          entity_id: string
        }
        Update: {
          discovery_id?: string
          entity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovery_entity_links_discovery_id_fkey"
            columns: ["discovery_id"]
            isOneToOne: false
            referencedRelation: "discoveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovery_entity_links_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "knowledge_entities"
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
      economy_state: {
        Row: {
          circulating_supply: number
          id: string
          total_burned: number
          total_staked: number
          total_supply: number
          updated_at: string
        }
        Insert: {
          circulating_supply?: number
          id?: string
          total_burned?: number
          total_staked?: number
          total_supply?: number
          updated_at?: string
        }
        Update: {
          circulating_supply?: number
          id?: string
          total_burned?: number
          total_staked?: number
          total_supply?: number
          updated_at?: string
        }
        Relationships: []
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
      guild_messages: {
        Row: {
          created_at: string
          display_name: string
          guild_id: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          guild_id: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          guild_id?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_messages_guild_id_fkey"
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
          flag_emoji: string | null
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
          flag_emoji?: string | null
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
          flag_emoji?: string | null
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
      hire_hires: {
        Row: {
          hired_at: string | null
          id: string
          listing_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          hired_at?: string | null
          id?: string
          listing_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          hired_at?: string | null
          id?: string
          listing_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hire_hires_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "hire_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      hire_listings: {
        Row: {
          agent_id: string
          avg_response_time: string | null
          capabilities: Json | null
          category: string
          created_at: string | null
          creator_id: string
          demo_available: boolean | null
          description: string
          id: string
          integrations: string[] | null
          is_featured: boolean | null
          is_verified: boolean | null
          price_amount: number | null
          price_type: string | null
          rating: number | null
          short_description: string
          tags: string[] | null
          title: string
          total_hires: number | null
          total_reviews: number | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          avg_response_time?: string | null
          capabilities?: Json | null
          category: string
          created_at?: string | null
          creator_id: string
          demo_available?: boolean | null
          description: string
          id?: string
          integrations?: string[] | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          price_amount?: number | null
          price_type?: string | null
          rating?: number | null
          short_description: string
          tags?: string[] | null
          title: string
          total_hires?: number | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          avg_response_time?: string | null
          capabilities?: Json | null
          category?: string
          created_at?: string | null
          creator_id?: string
          demo_available?: boolean | null
          description?: string
          id?: string
          integrations?: string[] | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          price_amount?: number | null
          price_type?: string | null
          rating?: number | null
          short_description?: string
          tags?: string[] | null
          title?: string
          total_hires?: number | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hire_listings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hire_listings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      hire_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          listing_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          listing_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          listing_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hire_reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "hire_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_entities: {
        Row: {
          civilization: string | null
          created_at: string | null
          description: string | null
          embedding: string | null
          entity_type: string
          id: string
          impact_score: number | null
          metadata: Json | null
          name: string
          updated_at: string | null
        }
        Insert: {
          civilization?: string | null
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          entity_type: string
          id?: string
          impact_score?: number | null
          metadata?: Json | null
          name: string
          updated_at?: string | null
        }
        Update: {
          civilization?: string | null
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          entity_type?: string
          id?: string
          impact_score?: number | null
          metadata?: Json | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      knowledge_relationships: {
        Row: {
          created_at: string | null
          description: string | null
          discovered_by_agent: string | null
          id: string
          relationship_type: string
          source_entity_id: string
          strength: number | null
          target_entity_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discovered_by_agent?: string | null
          id?: string
          relationship_type: string
          source_entity_id: string
          strength?: number | null
          target_entity_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discovered_by_agent?: string | null
          id?: string
          relationship_type?: string
          source_entity_id?: string
          strength?: number | null
          target_entity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_relationships_source_entity_id_fkey"
            columns: ["source_entity_id"]
            isOneToOne: false
            referencedRelation: "knowledge_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_relationships_target_entity_id_fkey"
            columns: ["target_entity_id"]
            isOneToOne: false
            referencedRelation: "knowledge_entities"
            referencedColumns: ["id"]
          },
        ]
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
      lottery_draws: {
        Row: {
          created_at: string | null
          draw_date: string | null
          id: string
          jackpot: number | null
          status: string | null
          ticket_count: number | null
          winner_agent_id: string | null
          winner_name: string | null
        }
        Insert: {
          created_at?: string | null
          draw_date?: string | null
          id?: string
          jackpot?: number | null
          status?: string | null
          ticket_count?: number | null
          winner_agent_id?: string | null
          winner_name?: string | null
        }
        Update: {
          created_at?: string | null
          draw_date?: string | null
          id?: string
          jackpot?: number | null
          status?: string | null
          ticket_count?: number | null
          winner_agent_id?: string | null
          winner_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lottery_draws_winner_agent_id_fkey"
            columns: ["winner_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lottery_draws_winner_agent_id_fkey"
            columns: ["winner_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_items: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          price: number
          status: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          price?: number
          status?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          price?: number
          status?: string | null
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
          is_winner: boolean | null
          payout_meeet: number | null
          prediction: boolean
          question_id: string
          user_id: string
        }
        Insert: {
          agent_id: string
          amount_meeet?: number | null
          created_at?: string | null
          id?: string
          is_winner?: boolean | null
          payout_meeet?: number | null
          prediction: boolean
          question_id: string
          user_id: string
        }
        Update: {
          agent_id?: string
          amount_meeet?: number | null
          created_at?: string | null
          id?: string
          is_winner?: boolean | null
          payout_meeet?: number | null
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
          no_pool: number
          question_text: string
          resolution: string | null
          resolution_source: string | null
          resolved_at: string | null
          status: string | null
          total_pool_meeet: number | null
          yes_pool: number
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          creator_agent_id?: string | null
          deadline: string
          description?: string | null
          id?: string
          no_pool?: number
          question_text: string
          resolution?: string | null
          resolution_source?: string | null
          resolved_at?: string | null
          status?: string | null
          total_pool_meeet?: number | null
          yes_pool?: number
        }
        Update: {
          category?: string | null
          created_at?: string | null
          creator_agent_id?: string | null
          deadline?: string
          description?: string | null
          id?: string
          no_pool?: number
          question_text?: string
          resolution?: string | null
          resolution_source?: string | null
          resolved_at?: string | null
          status?: string | null
          total_pool_meeet?: number | null
          yes_pool?: number
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
      pricing: {
        Row: {
          action_type: string
          base_cost: number
          description: string | null
          id: string
          user_cost: number
        }
        Insert: {
          action_type: string
          base_cost: number
          description?: string | null
          id?: string
          user_cost: number
        }
        Update: {
          action_type?: string
          base_cost?: number
          description?: string | null
          id?: string
          user_cost?: number
        }
        Relationships: []
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
      promo_campaigns: {
        Row: {
          bonus_meeet: number | null
          created_at: string
          current_claims: number | null
          description: string | null
          discount_pct: number | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          max_claims: number | null
          name: string
          promo_type: string
          starts_at: string | null
        }
        Insert: {
          bonus_meeet?: number | null
          created_at?: string
          current_claims?: number | null
          description?: string | null
          discount_pct?: number | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          max_claims?: number | null
          name: string
          promo_type?: string
          starts_at?: string | null
        }
        Update: {
          bonus_meeet?: number | null
          created_at?: string
          current_claims?: number | null
          description?: string | null
          discount_pct?: number | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          max_claims?: number | null
          name?: string
          promo_type?: string
          starts_at?: string | null
        }
        Relationships: []
      }
      promo_claims: {
        Row: {
          bonus_received: number | null
          claimed_at: string
          id: string
          promo_id: string
          user_id: string
        }
        Insert: {
          bonus_received?: number | null
          claimed_at?: string
          id?: string
          promo_id: string
          user_id: string
        }
        Update: {
          bonus_received?: number | null
          claimed_at?: string
          id?: string
          promo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_claims_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promo_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          discount_pct: number
          duration_days: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          tier: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_pct?: number
          duration_days?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          tier?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_pct?: number
          duration_days?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          tier?: string
          used_count?: number
        }
        Relationships: []
      }
      promo_redemptions: {
        Row: {
          id: string
          promo_id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          id?: string
          promo_id: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          id?: string
          promo_id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_redemptions_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
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
      reviews: {
        Row: {
          created_at: string
          discovery_id: string
          id: string
          reviewer_agent_id: string
          reviewer_user_id: string
          reward_meeet: number | null
          stake_meeet: number
          verdict: string
        }
        Insert: {
          created_at?: string
          discovery_id: string
          id?: string
          reviewer_agent_id: string
          reviewer_user_id: string
          reward_meeet?: number | null
          stake_meeet?: number
          verdict: string
        }
        Update: {
          created_at?: string
          discovery_id?: string
          id?: string
          reviewer_agent_id?: string
          reviewer_user_id?: string
          reward_meeet?: number | null
          stake_meeet?: number
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_discovery_id_fkey"
            columns: ["discovery_id"]
            isOneToOne: false
            referencedRelation: "discoveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_agent_id_fkey"
            columns: ["reviewer_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_agent_id_fkey"
            columns: ["reviewer_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_events: {
        Row: {
          affected_civilizations: string[]
          cascade_result: Json | null
          created_at: string
          description: string
          event_type: string
          id: string
          injected_by: string
          intensity: number
          token_cost: number | null
        }
        Insert: {
          affected_civilizations?: string[]
          cascade_result?: Json | null
          created_at?: string
          description: string
          event_type: string
          id?: string
          injected_by: string
          intensity?: number
          token_cost?: number | null
        }
        Update: {
          affected_civilizations?: string[]
          cascade_result?: Json | null
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          injected_by?: string
          intensity?: number
          token_cost?: number | null
        }
        Relationships: []
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
      subscriptions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          features: Json | null
          id: string
          max_agents: number | null
          plan: string | null
          price: number | null
          status: string | null
          tier: string | null
          tx_signature: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          features?: Json | null
          id?: string
          max_agents?: number | null
          plan?: string | null
          price?: number | null
          status?: string | null
          tier?: string | null
          tx_signature?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          features?: Json | null
          id?: string
          max_agents?: number | null
          plan?: string | null
          price?: number | null
          status?: string | null
          tier?: string | null
          tx_signature?: string | null
          user_id?: string
        }
        Relationships: []
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
      token_bridge: {
        Row: {
          action: string
          amount: number
          created_at: string | null
          fee: number | null
          id: string
          solana_wallet: string | null
          status: string | null
          tx_signature: string | null
          user_id: string
        }
        Insert: {
          action: string
          amount: number
          created_at?: string | null
          fee?: number | null
          id?: string
          solana_wallet?: string | null
          status?: string | null
          tx_signature?: string | null
          user_id: string
        }
        Update: {
          action?: string
          amount?: number
          created_at?: string | null
          fee?: number | null
          id?: string
          solana_wallet?: string | null
          status?: string | null
          tx_signature?: string | null
          user_id?: string
        }
        Relationships: []
      }
      token_price_history: {
        Row: {
          id: string
          liquidity_usd: number | null
          market_cap: number | null
          price_sol: number
          price_usd: number
          recorded_at: string
          volume_24h: number | null
        }
        Insert: {
          id?: string
          liquidity_usd?: number | null
          market_cap?: number | null
          price_sol?: number
          price_usd?: number
          recorded_at?: string
          volume_24h?: number | null
        }
        Update: {
          id?: string
          liquidity_usd?: number | null
          market_cap?: number | null
          price_sol?: number
          price_usd?: number
          recorded_at?: string
          volume_24h?: number | null
        }
        Relationships: []
      }
      tournaments: {
        Row: {
          created_at: string | null
          current_participants: number | null
          description: string | null
          ends_at: string | null
          id: string
          max_participants: number | null
          name: string
          prize_pool: number | null
          starts_at: string | null
          status: string | null
          winner_agent_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_participants?: number | null
          description?: string | null
          ends_at?: string | null
          id?: string
          max_participants?: number | null
          name: string
          prize_pool?: number | null
          starts_at?: string | null
          status?: string | null
          winner_agent_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_participants?: number | null
          description?: string | null
          ends_at?: string | null
          id?: string
          max_participants?: number | null
          name?: string
          prize_pool?: number | null
          starts_at?: string | null
          status?: string | null
          winner_agent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_winner_agent_id_fkey"
            columns: ["winner_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_winner_agent_id_fkey"
            columns: ["winner_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_log: {
        Row: {
          action: string
          created_at: string | null
          error: string | null
          id: string
          meeet_amount: number
          price: number | null
          sol_amount: number
          status: string | null
          tx_signature: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          error?: string | null
          id?: string
          meeet_amount?: number
          price?: number | null
          sol_amount?: number
          status?: string | null
          tx_signature?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          error?: string | null
          id?: string
          meeet_amount?: number
          price?: number | null
          sol_amount?: number
          status?: string | null
          tx_signature?: string | null
        }
        Relationships: []
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
      tweet_likes: {
        Row: {
          created_at: string | null
          id: string
          tweet_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tweet_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tweet_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tweet_likes_tweet_id_fkey"
            columns: ["tweet_id"]
            isOneToOne: false
            referencedRelation: "agent_tweets"
            referencedColumns: ["id"]
          },
        ]
      }
      tweet_retweets: {
        Row: {
          created_at: string | null
          id: string
          tweet_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tweet_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tweet_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tweet_retweets_tweet_id_fkey"
            columns: ["tweet_id"]
            isOneToOne: false
            referencedRelation: "agent_tweets"
            referencedColumns: ["id"]
          },
        ]
      }
      twitter_accounts: {
        Row: {
          access_token: string
          access_token_secret: string
          consumer_key: string
          consumer_secret: string
          created_at: string
          id: string
          last_posted_at: string | null
          role: string
          status: string
          username: string
        }
        Insert: {
          access_token: string
          access_token_secret: string
          consumer_key: string
          consumer_secret: string
          created_at?: string
          id?: string
          last_posted_at?: string | null
          role?: string
          status?: string
          username: string
        }
        Update: {
          access_token?: string
          access_token_secret?: string
          consumer_key?: string
          consumer_secret?: string
          created_at?: string
          id?: string
          last_posted_at?: string | null
          role?: string
          status?: string
          username?: string
        }
        Relationships: []
      }
      twitter_queue: {
        Row: {
          account_id: string
          content: string
          created_at: string
          error: string | null
          id: string
          media_urls: string[] | null
          posted_at: string | null
          scheduled_at: string | null
          status: string
          tweet_id: string | null
        }
        Insert: {
          account_id: string
          content: string
          created_at?: string
          error?: string | null
          id?: string
          media_urls?: string[] | null
          posted_at?: string | null
          scheduled_at?: string | null
          status?: string
          tweet_id?: string | null
        }
        Update: {
          account_id?: string
          content?: string
          created_at?: string
          error?: string | null
          id?: string
          media_urls?: string[] | null
          posted_at?: string | null
          scheduled_at?: string | null
          status?: string
          tweet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "twitter_queue_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "twitter_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          action_type: string
          agent_id: string | null
          cost_base: number | null
          cost_user: number | null
          created_at: string | null
          details: Json | null
          id: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          action_type: string
          agent_id?: string | null
          cost_base?: number | null
          cost_user?: number | null
          created_at?: string | null
          details?: Json | null
          id?: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          action_type?: string
          agent_id?: string | null
          cost_base?: number | null
          cost_user?: number | null
          created_at?: string | null
          details?: Json | null
          id?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string | null
          id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_id?: string | null
          id?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string | null
          id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_agents: {
        Row: {
          agent_id: string | null
          created_at: string | null
          id: string
          is_primary: boolean | null
          plan: string | null
          telegram_chat_id: string | null
          telegram_username: string | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          plan?: string | null
          telegram_chat_id?: string | null
          telegram_username?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          plan?: string | null
          telegram_chat_id?: string | null
          telegram_username?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_agents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_agents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_balance: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          total_deposited: number | null
          total_spent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          total_deposited?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          total_deposited?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_bots: {
        Row: {
          agent_id: string | null
          bot_name: string | null
          bot_token: string
          bot_username: string | null
          created_at: string | null
          id: string
          status: string | null
          updated_at: string | null
          user_id: string
          webhook_secret: string | null
        }
        Insert: {
          agent_id?: string | null
          bot_name?: string | null
          bot_token: string
          bot_username?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          user_id: string
          webhook_secret?: string | null
        }
        Update: {
          agent_id?: string | null
          bot_name?: string | null
          bot_token?: string
          bot_username?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_bots_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bots_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          agent_id: string | null
          context_id: string | null
          context_type: string | null
          created_at: string
          feedback_type: string
          id: string
          message: string | null
          rating: number | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          message?: string | null
          rating?: number | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          message?: string | null
          rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feedback_agent_id_fkey"
            columns: ["agent_id"]
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
      agent_strategies_public: {
        Row: {
          agent_class: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          is_premium: boolean | null
          name: string | null
          price_usdc: number | null
          purchases: number | null
          strategy_config: Json | null
          target_class: string[] | null
        }
        Insert: {
          agent_class?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          is_premium?: boolean | null
          name?: string | null
          price_usdc?: number | null
          purchases?: number | null
          strategy_config?: Json | null
          target_class?: string[] | null
        }
        Update: {
          agent_class?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          is_premium?: boolean | null
          name?: string | null
          price_usdc?: number | null
          purchases?: number | null
          strategy_config?: Json | null
          target_class?: string[] | null
        }
        Relationships: []
      }
      agents_public: {
        Row: {
          attack: number | null
          balance_meeet: number | null
          class: Database["public"]["Enums"]["agent_class"] | null
          country_code: string | null
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
          country_code?: string | null
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
          country_code?: string | null
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
      marketplace_listings_public: {
        Row: {
          agent_id: string | null
          buyer_id: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          price_meeet: number | null
          price_usdc: number | null
          sold_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          buyer_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          price_meeet?: number | null
          price_usdc?: number | null
          sold_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          buyer_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          price_meeet?: number | null
          price_usdc?: number | null
          sold_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_marketplace_listings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_marketplace_listings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bots_safe: {
        Row: {
          agent_id: string | null
          bot_name: string | null
          bot_username: string | null
          created_at: string | null
          id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          bot_name?: string | null
          bot_username?: string | null
          created_at?: string | null
          id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          bot_name?: string | null
          bot_username?: string | null
          created_at?: string | null
          id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_bots_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bots_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_rate_limit: {
        Args: { _key: string; _max_requests: number; _window_seconds: number }
        Returns: boolean
      }
      find_cross_civilization_connections: { Args: never; Returns: Json }
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
      get_agent_roi_summary: { Args: { agent_uuid: string }; Returns: Json }
      get_entity_graph: {
        Args: { civilization_filter?: string; depth?: number }
        Returns: Json
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
      get_oracle_bet_history: {
        Args: { p_question_id: string }
        Returns: {
          bet_date: string
          no_total: number
          yes_total: number
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
      get_total_meeet: { Args: never; Returns: number }
      get_trade_protected_fields: {
        Args: { _trade_id: string }
        Returns: {
          from_agent_id: string
          offer_meeet: number
          request_meeet: number
          to_agent_id: string
        }[]
      }
      search_agent_memories: {
        Args: {
          agent_uuid: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          content: string
          context_tags: string[]
          created_at: string
          id: string
          importance_score: number
          memory_type: string
          sentiment_score: number
          similarity: number
        }[]
      }
      transfer_meeet: {
        Args: { amount: number; from_agent: string; to_agent: string }
        Returns: undefined
      }
      update_conviction: {
        Args: { agent_uuid: string; new_evidence: number; topic_name: string }
        Returns: {
          conviction_score: number
          evidence_count: number
          topic: string
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
