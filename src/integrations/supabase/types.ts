export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      cached_facts: {
        Row: {
          country: string
          created_at: string
          education_system_problems: Json | null
          facts_data: Json
          graduation_year: number
          id: string
          updated_at: string
        }
        Insert: {
          country: string
          created_at?: string
          education_system_problems?: Json | null
          facts_data: Json
          graduation_year: number
          id?: string
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          education_system_problems?: Json | null
          facts_data?: Json
          graduation_year?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      fact_quality_stats: {
        Row: {
          auto_replaced_at: string | null
          country: string
          created_at: string | null
          fact_hash: string
          graduation_year: number
          replacement_reason: string | null
          total_reports: number | null
          updated_at: string | null
        }
        Insert: {
          auto_replaced_at?: string | null
          country: string
          created_at?: string | null
          fact_hash: string
          graduation_year: number
          replacement_reason?: string | null
          total_reports?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_replaced_at?: string | null
          country?: string
          created_at?: string | null
          fact_hash?: string
          graduation_year?: number
          replacement_reason?: string | null
          total_reports?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fact_reports: {
        Row: {
          country: string
          fact_content: string
          fact_hash: string
          graduation_year: number
          id: string
          report_reason: string
          reported_at: string | null
          status: string | null
          user_fingerprint: string | null
        }
        Insert: {
          country: string
          fact_content: string
          fact_hash: string
          graduation_year: number
          id?: string
          report_reason: string
          reported_at?: string | null
          status?: string | null
          user_fingerprint?: string | null
        }
        Update: {
          country?: string
          fact_content?: string
          fact_hash?: string
          graduation_year?: number
          id?: string
          report_reason?: string
          reported_at?: string | null
          status?: string | null
          user_fingerprint?: string | null
        }
        Relationships: []
      }
      fact_variants: {
        Row: {
          country: string
          created_at: string
          education_system_problems: Json | null
          facts_data: Json
          graduation_year: number
          id: string
          quick_fun_fact: string | null
          updated_at: string
          variant_number: number
        }
        Insert: {
          country: string
          created_at?: string
          education_system_problems?: Json | null
          facts_data: Json
          graduation_year: number
          id?: string
          quick_fun_fact?: string | null
          updated_at?: string
          variant_number: number
        }
        Update: {
          country?: string
          created_at?: string
          education_system_problems?: Json | null
          facts_data?: Json
          graduation_year?: number
          id?: string
          quick_fun_fact?: string | null
          updated_at?: string
          variant_number?: number
        }
        Relationships: []
      }
      memory_likes: {
        Row: {
          created_at: string
          id: string
          memory_id: string
          user_fingerprint: string
        }
        Insert: {
          created_at?: string
          id?: string
          memory_id: string
          user_fingerprint: string
        }
        Update: {
          created_at?: string
          id?: string
          memory_id?: string
          user_fingerprint?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_likes_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "user_school_memories"
            referencedColumns: ["id"]
          },
        ]
      }
      school_memories: {
        Row: {
          city: string
          created_at: string
          graduation_year: number
          id: string
          research_sources: Json
          school_memories_data: Json
          school_name: string
          shareable_content: Json
          updated_at: string
        }
        Insert: {
          city: string
          created_at?: string
          graduation_year: number
          id?: string
          research_sources?: Json
          school_memories_data?: Json
          school_name: string
          shareable_content?: Json
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          graduation_year?: number
          id?: string
          research_sources?: Json
          school_memories_data?: Json
          school_name?: string
          shareable_content?: Json
          updated_at?: string
        }
        Relationships: []
      }
      school_research_cache: {
        Row: {
          cache_expires_at: string
          city: string
          country: string
          created_at: string
          graduation_year: number
          historical_headlines: Json | null
          id: string
          research_results: Json
          research_sources: Json
          school_name: string
          shareable_content: Json
          updated_at: string
        }
        Insert: {
          cache_expires_at?: string
          city: string
          country?: string
          created_at?: string
          graduation_year: number
          historical_headlines?: Json | null
          id?: string
          research_results: Json
          research_sources?: Json
          school_name: string
          shareable_content: Json
          updated_at?: string
        }
        Update: {
          cache_expires_at?: string
          city?: string
          country?: string
          created_at?: string
          graduation_year?: number
          historical_headlines?: Json | null
          id?: string
          research_results?: Json
          research_sources?: Json
          school_name?: string
          shareable_content?: Json
          updated_at?: string
        }
        Relationships: []
      }
      user_activity_limits: {
        Row: {
          city: string
          created_at: string
          daily_like_count: number | null
          daily_memory_count: number | null
          graduation_year: number
          id: string
          last_memory_posted: string | null
          reset_date: string | null
          school_name: string
          updated_at: string
          user_fingerprint: string
        }
        Insert: {
          city: string
          created_at?: string
          daily_like_count?: number | null
          daily_memory_count?: number | null
          graduation_year: number
          id?: string
          last_memory_posted?: string | null
          reset_date?: string | null
          school_name: string
          updated_at?: string
          user_fingerprint: string
        }
        Update: {
          city?: string
          created_at?: string
          daily_like_count?: number | null
          daily_memory_count?: number | null
          graduation_year?: number
          id?: string
          last_memory_posted?: string | null
          reset_date?: string | null
          school_name?: string
          updated_at?: string
          user_fingerprint?: string
        }
        Relationships: []
      }
      user_school_memories: {
        Row: {
          city: string
          content: string
          created_at: string
          graduation_year: number
          id: string
          is_flagged: boolean | null
          is_verified: boolean | null
          like_count: number | null
          memory_type: string | null
          school_name: string
          updated_at: string
          user_fingerprint: string | null
        }
        Insert: {
          city: string
          content: string
          created_at?: string
          graduation_year: number
          id?: string
          is_flagged?: boolean | null
          is_verified?: boolean | null
          like_count?: number | null
          memory_type?: string | null
          school_name: string
          updated_at?: string
          user_fingerprint?: string | null
        }
        Update: {
          city?: string
          content?: string
          created_at?: string
          graduation_year?: number
          id?: string
          is_flagged?: boolean | null
          is_verified?: boolean | null
          like_count?: number | null
          memory_type?: string | null
          school_name?: string
          updated_at?: string
          user_fingerprint?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
