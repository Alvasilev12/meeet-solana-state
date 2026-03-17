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
      agents: {
        Row: {
          attack: number
          balance_meeet: number
          class: Database["public"]["Enums"]["agent_class"]
          created_at: string
          defense: number
          hp: number
          id: string
          kills: number
          level: number
          max_hp: number
          name: string
          pos_x: number
          pos_y: number
          quests_completed: number
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
          created_at?: string
          defense?: number
          hp?: number
          id?: string
          kills?: number
          level?: number
          max_hp?: number
          name: string
          pos_x?: number
          pos_y?: number
          quests_completed?: number
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
          created_at?: string
          defense?: number
          hp?: number
          id?: string
          kills?: number
          level?: number
          max_hp?: number
          name?: string
          pos_x?: number
          pos_y?: number
          quests_completed?: number
          status?: Database["public"]["Enums"]["agent_status"]
          territories_held?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
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
            foreignKeyName: "duels_defender_agent_id_fkey"
            columns: ["defender_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_winner_agent_id_fkey"
            columns: ["winner_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
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
            foreignKeyName: "quest_bids_quest_id_fkey"
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
          category: Database["public"]["Enums"]["quest_category"]
          completed_at: string | null
          created_at: string
          deadline_at: string | null
          deadline_hours: number
          delivered_at: string | null
          description: string
          id: string
          is_sponsored: boolean | null
          max_participants: number | null
          requester_id: string
          result_text: string | null
          result_url: string | null
          reward_meeet: number | null
          reward_sol: number
          status: Database["public"]["Enums"]["quest_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_agent_id?: string | null
          category?: Database["public"]["Enums"]["quest_category"]
          completed_at?: string | null
          created_at?: string
          deadline_at?: string | null
          deadline_hours?: number
          delivered_at?: string | null
          description: string
          id?: string
          is_sponsored?: boolean | null
          max_participants?: number | null
          requester_id: string
          result_text?: string | null
          result_url?: string | null
          reward_meeet?: number | null
          reward_sol: number
          status?: Database["public"]["Enums"]["quest_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string | null
          category?: Database["public"]["Enums"]["quest_category"]
          completed_at?: string | null
          created_at?: string
          deadline_at?: string | null
          deadline_hours?: number
          delivered_at?: string | null
          description?: string
          id?: string
          is_sponsored?: boolean | null
          max_participants?: number | null
          requester_id?: string
          result_text?: string | null
          result_url?: string | null
          reward_meeet?: number | null
          reward_sol?: number
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
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
      agent_status:
        | "active"
        | "idle"
        | "dead"
        | "in_combat"
        | "trading"
        | "exploring"
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
      ],
      agent_status: [
        "active",
        "idle",
        "dead",
        "in_combat",
        "trading",
        "exploring",
      ],
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
