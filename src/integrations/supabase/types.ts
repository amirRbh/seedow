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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          body: string
          created_at: string
          cta_href: string | null
          cta_label: string | null
          dedup_key: string
          dismissed_at: string | null
          id: string
          kind: Database["public"]["Enums"]["alert_kind"]
          portfolio_id: string | null
          read_at: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          dedup_key: string
          dismissed_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["alert_kind"]
          portfolio_id?: string | null
          read_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          dedup_key?: string
          dismissed_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["alert_kind"]
          portfolio_id?: string | null
          read_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      asset_covariance: {
        Row: {
          asset_a: string
          asset_b: string
          computed_at: string
          covariance: number
        }
        Insert: {
          asset_a: string
          asset_b: string
          computed_at?: string
          covariance: number
        }
        Update: {
          asset_a?: string
          asset_b?: string
          computed_at?: string
          covariance?: number
        }
        Relationships: [
          {
            foreignKeyName: "asset_covariance_asset_a_fkey"
            columns: ["asset_a"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_covariance_asset_b_fkey"
            columns: ["asset_b"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_prices: {
        Row: {
          asset_id: string
          close: number
          created_at: string
          currency: string
          price_date: string
          source: string
        }
        Insert: {
          asset_id: string
          close: number
          created_at?: string
          currency?: string
          price_date: string
          source?: string
        }
        Update: {
          asset_id?: string
          close?: number
          created_at?: string
          currency?: string
          price_date?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_prices_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_quotes: {
        Row: {
          asset_id: string
          change_pct: number | null
          currency: string
          fetched_at: string
          market_state: string | null
          previous_close: number | null
          price: number
          source: string
        }
        Insert: {
          asset_id: string
          change_pct?: number | null
          currency?: string
          fetched_at?: string
          market_state?: string | null
          previous_close?: number | null
          price: number
          source?: string
        }
        Update: {
          asset_id?: string
          change_pct?: number | null
          currency?: string
          fetched_at?: string
          market_state?: string | null
          previous_close?: number | null
          price?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_quotes_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_class: Database["public"]["Enums"]["asset_class"]
          carbon_intensity_gco2e_per_eur: number | null
          carbon_intensity_source: string | null
          carbon_intensity_updated_at: string | null
          cause_exposure: Json
          created_at: string
          currency: string
          description: string | null
          env_score: number | null
          esg_score: number
          esg_score_fetched_at: string | null
          esg_score_source: string | null
          excluded_sectors: Database["public"]["Enums"]["exclusion_tag"][]
          expected_return: number
          governance_score: number | null
          id: string
          is_active: boolean
          isin: string | null
          issuer: string | null
          name: string
          region: string | null
          sfdr_article: number | null
          social_score: number | null
          ter: number
          ticker: string
          updated_at: string
          volatility: number
          yahoo_symbol: string | null
        }
        Insert: {
          asset_class: Database["public"]["Enums"]["asset_class"]
          carbon_intensity_gco2e_per_eur?: number | null
          carbon_intensity_source?: string | null
          carbon_intensity_updated_at?: string | null
          cause_exposure?: Json
          created_at?: string
          currency?: string
          description?: string | null
          env_score?: number | null
          esg_score?: number
          esg_score_fetched_at?: string | null
          esg_score_source?: string | null
          excluded_sectors?: Database["public"]["Enums"]["exclusion_tag"][]
          expected_return?: number
          governance_score?: number | null
          id?: string
          is_active?: boolean
          isin?: string | null
          issuer?: string | null
          name: string
          region?: string | null
          sfdr_article?: number | null
          social_score?: number | null
          ter?: number
          ticker: string
          updated_at?: string
          volatility?: number
          yahoo_symbol?: string | null
        }
        Update: {
          asset_class?: Database["public"]["Enums"]["asset_class"]
          carbon_intensity_gco2e_per_eur?: number | null
          carbon_intensity_source?: string | null
          carbon_intensity_updated_at?: string | null
          cause_exposure?: Json
          created_at?: string
          currency?: string
          description?: string | null
          env_score?: number | null
          esg_score?: number
          esg_score_fetched_at?: string | null
          esg_score_source?: string | null
          excluded_sectors?: Database["public"]["Enums"]["exclusion_tag"][]
          expected_return?: number
          governance_score?: number | null
          id?: string
          is_active?: boolean
          isin?: string | null
          issuer?: string | null
          name?: string
          region?: string | null
          sfdr_article?: number | null
          social_score?: number | null
          ter?: number
          ticker?: string
          updated_at?: string
          volatility?: number
          yahoo_symbol?: string | null
        }
        Relationships: []
      }
      cron_run_log: {
        Row: {
          assets_failed: number
          assets_ok: number
          details: Json | null
          duration_ms: number | null
          id: string
          job_name: string
          message: string | null
          ran_at: string
          status: string
        }
        Insert: {
          assets_failed?: number
          assets_ok?: number
          details?: Json | null
          duration_ms?: number | null
          id?: string
          job_name: string
          message?: string | null
          ran_at?: string
          status: string
        }
        Update: {
          assets_failed?: number
          assets_ok?: number
          details?: Json | null
          duration_ms?: number | null
          id?: string
          job_name?: string
          message?: string | null
          ran_at?: string
          status?: string
        }
        Relationships: []
      }
      decision_events: {
        Row: {
          detail: string | null
          id: string
          kind: Database["public"]["Enums"]["decision_kind"]
          occurred_at: string
          payload: Json
          portfolio_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          detail?: string | null
          id?: string
          kind: Database["public"]["Enums"]["decision_kind"]
          occurred_at?: string
          payload?: Json
          portfolio_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          detail?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["decision_kind"]
          occurred_at?: string
          payload?: Json
          portfolio_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_goals: {
        Row: {
          created_at: string
          goal_type: Database["public"]["Enums"]["goal_type"]
          id: string
          initial_capital: number
          monthly_contribution: number
          name: string
          portfolio_id: string | null
          target_amount: number
          target_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_type?: Database["public"]["Enums"]["goal_type"]
          id?: string
          initial_capital?: number
          monthly_contribution?: number
          name: string
          portfolio_id?: string | null
          target_amount: number
          target_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal_type?: Database["public"]["Enums"]["goal_type"]
          id?: string
          initial_capital?: number
          monthly_contribution?: number
          name?: string
          portfolio_id?: string | null
          target_amount?: number
          target_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_goals_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_shares: {
        Row: {
          carbon_intensity: number | null
          causes: string[]
          esg_score: number | null
          exclusions: string[]
          expected_return: number | null
          horizon_years: number
          id: string
          portfolio_id: string
          public_handle: string
          risk_target: number
          shared_at: string
          updated_at: string
          user_id: string
          volatility: number | null
          weights: Json
        }
        Insert: {
          carbon_intensity?: number | null
          causes?: string[]
          esg_score?: number | null
          exclusions?: string[]
          expected_return?: number | null
          horizon_years: number
          id?: string
          portfolio_id: string
          public_handle: string
          risk_target: number
          shared_at?: string
          updated_at?: string
          user_id: string
          volatility?: number | null
          weights?: Json
        }
        Update: {
          carbon_intensity?: number | null
          causes?: string[]
          esg_score?: number | null
          exclusions?: string[]
          expected_return?: number | null
          horizon_years?: number
          id?: string
          portfolio_id?: string
          public_handle?: string
          risk_target?: number
          shared_at?: string
          updated_at?: string
          user_id?: string
          volatility?: number | null
          weights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_shares_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: true
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          cause_intensity: Json
          causes: Database["public"]["Enums"]["cause_tag"][]
          created_at: string
          esg_floor_relaxed: boolean
          exclusions: Database["public"]["Enums"]["exclusion_tag"][]
          generated_at: string
          horizon_years: number
          id: string
          initial_amount: number
          is_active: boolean
          methodology_version: string
          metrics: Json
          name: string
          risk_target: number
          updated_at: string
          user_id: string
          weights: Json
        }
        Insert: {
          cause_intensity?: Json
          causes?: Database["public"]["Enums"]["cause_tag"][]
          created_at?: string
          esg_floor_relaxed?: boolean
          exclusions?: Database["public"]["Enums"]["exclusion_tag"][]
          generated_at?: string
          horizon_years?: number
          id?: string
          initial_amount?: number
          is_active?: boolean
          methodology_version?: string
          metrics?: Json
          name?: string
          risk_target?: number
          updated_at?: string
          user_id: string
          weights?: Json
        }
        Update: {
          cause_intensity?: Json
          causes?: Database["public"]["Enums"]["cause_tag"][]
          created_at?: string
          esg_floor_relaxed?: boolean
          exclusions?: Database["public"]["Enums"]["exclusion_tag"][]
          generated_at?: string
          horizon_years?: number
          id?: string
          initial_amount?: number
          is_active?: boolean
          methodology_version?: string
          metrics?: Json
          name?: string
          risk_target?: number
          updated_at?: string
          user_id?: string
          weights?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          onboarding_completed: boolean
          public_handle: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          onboarding_completed?: boolean
          public_handle?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          onboarding_completed?: boolean
          public_handle?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_contributions: {
        Row: {
          amount: number
          created_at: string
          day_of_month: number
          frequency: Database["public"]["Enums"]["contribution_frequency"]
          id: string
          is_active: boolean
          last_processed_at: string | null
          paused_until: string | null
          portfolio_id: string
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          day_of_month?: number
          frequency?: Database["public"]["Enums"]["contribution_frequency"]
          id?: string
          is_active?: boolean
          last_processed_at?: string | null
          paused_until?: string | null
          portfolio_id: string
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          day_of_month?: number
          frequency?: Database["public"]["Enums"]["contribution_frequency"]
          id?: string
          is_active?: boolean
          last_processed_at?: string | null
          paused_until?: string | null
          portfolio_id?: string
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_vault_secret: { Args: { secret_name: string }; Returns: string }
    }
    Enums: {
      alert_kind:
        | "esg_drift"
        | "rebalance"
        | "missed_contribution"
        | "performance"
        | "fresh_quotes"
        | "concentration"
      alert_severity: "info" | "warn" | "alert"
      asset_class:
        | "equity_dev"
        | "equity_em"
        | "thematic"
        | "green_bond"
        | "social_bond"
        | "sov_bond"
        | "reit"
        | "commodity"
        | "cash"
      cause_tag:
        | "climat"
        | "biodiversite"
        | "humain"
        | "egalite"
        | "tech"
        | "circulaire"
      contribution_frequency: "monthly" | "quarterly"
      decision_kind:
        | "creation"
        | "cause_added"
        | "cause_removed"
        | "exclusion_added"
        | "exclusion_removed"
        | "horizon_changed"
        | "risk_changed"
        | "rebalance"
        | "contribution_scheduled"
        | "contribution_paused"
      exclusion_tag:
        | "fossiles"
        | "armes"
        | "tabac"
        | "jeux"
        | "animaux"
        | "fast-fashion"
      goal_type:
        | "retirement"
        | "real_estate"
        | "studies"
        | "safety_net"
        | "other"
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
      alert_kind: [
        "esg_drift",
        "rebalance",
        "missed_contribution",
        "performance",
        "fresh_quotes",
        "concentration",
      ],
      alert_severity: ["info", "warn", "alert"],
      asset_class: [
        "equity_dev",
        "equity_em",
        "thematic",
        "green_bond",
        "social_bond",
        "sov_bond",
        "reit",
        "commodity",
        "cash",
      ],
      cause_tag: [
        "climat",
        "biodiversite",
        "humain",
        "egalite",
        "tech",
        "circulaire",
      ],
      contribution_frequency: ["monthly", "quarterly"],
      decision_kind: [
        "creation",
        "cause_added",
        "cause_removed",
        "exclusion_added",
        "exclusion_removed",
        "horizon_changed",
        "risk_changed",
        "rebalance",
        "contribution_scheduled",
        "contribution_paused",
      ],
      exclusion_tag: [
        "fossiles",
        "armes",
        "tabac",
        "jeux",
        "animaux",
        "fast-fashion",
      ],
      goal_type: [
        "retirement",
        "real_estate",
        "studies",
        "safety_net",
        "other",
      ],
    },
  },
} as const
