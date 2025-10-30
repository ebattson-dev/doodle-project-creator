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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      daily_rep_assignments: {
        Row: {
          assigned_date: string
          completed: boolean | null
          completed_at: string | null
          created_at: string
          id: string
          rep_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_date?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          rep_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_date?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          rep_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_rep_assignments_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "reps"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_areas: {
        Row: {
          created_at: string
          description: string | null
          example_reps: string[] | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          example_reps?: string[] | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          example_reps?: string[] | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          auto_generate_reps: boolean | null
          created_at: string
          current_level: string | null
          current_streak: number | null
          email: string
          focus_areas: string[] | null
          full_name: string
          gender: string | null
          goals: string | null
          id: string
          job_title: string | null
          last_completed_date: string | null
          last_free_rep_date: string | null
          life_stage: string | null
          longest_streak: number | null
          preferred_delivery_time: string | null
          profile_picture: string | null
          push_enabled: boolean | null
          push_token: string | null
          rep_style: string | null
          stripe_customer_id: string | null
          stripe_product_id: string | null
          subscribed: boolean | null
          subscription_end: string | null
          trial_ends_at: string | null
          trial_start_date: string | null
          updated_at: string
          user_id: string
          web_push_subscription: Json | null
        }
        Insert: {
          age?: number | null
          auto_generate_reps?: boolean | null
          created_at?: string
          current_level?: string | null
          current_streak?: number | null
          email: string
          focus_areas?: string[] | null
          full_name: string
          gender?: string | null
          goals?: string | null
          id?: string
          job_title?: string | null
          last_completed_date?: string | null
          last_free_rep_date?: string | null
          life_stage?: string | null
          longest_streak?: number | null
          preferred_delivery_time?: string | null
          profile_picture?: string | null
          push_enabled?: boolean | null
          push_token?: string | null
          rep_style?: string | null
          stripe_customer_id?: string | null
          stripe_product_id?: string | null
          subscribed?: boolean | null
          subscription_end?: string | null
          trial_ends_at?: string | null
          trial_start_date?: string | null
          updated_at?: string
          user_id: string
          web_push_subscription?: Json | null
        }
        Update: {
          age?: number | null
          auto_generate_reps?: boolean | null
          created_at?: string
          current_level?: string | null
          current_streak?: number | null
          email?: string
          focus_areas?: string[] | null
          full_name?: string
          gender?: string | null
          goals?: string | null
          id?: string
          job_title?: string | null
          last_completed_date?: string | null
          last_free_rep_date?: string | null
          life_stage?: string | null
          longest_streak?: number | null
          preferred_delivery_time?: string | null
          profile_picture?: string | null
          push_enabled?: boolean | null
          push_token?: string | null
          rep_style?: string | null
          stripe_customer_id?: string | null
          stripe_product_id?: string | null
          subscribed?: boolean | null
          subscription_end?: string | null
          trial_ends_at?: string | null
          trial_start_date?: string | null
          updated_at?: string
          user_id?: string
          web_push_subscription?: Json | null
        }
        Relationships: []
      }
      reps: {
        Row: {
          created_at: string
          description: string | null
          difficulty_level: string | null
          estimated_time: number | null
          focus_area_id: string | null
          format: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          estimated_time?: number | null
          focus_area_id?: string | null
          format?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          estimated_time?: number | null
          focus_area_id?: string | null
          format?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reps_focus_area_id_fkey"
            columns: ["focus_area_id"]
            isOneToOne: false
            referencedRelation: "focus_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          age: number | null
          created_at: string
          current_level: string | null
          email: string
          focus_area_ids: string[] | null
          gender: string | null
          goals: string | null
          id: string
          job_title: string | null
          life_stage: string | null
          name: string
          profile_picture_url: string | null
          push_enabled: boolean | null
          push_token: string | null
          rep_style: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          created_at?: string
          current_level?: string | null
          email: string
          focus_area_ids?: string[] | null
          gender?: string | null
          goals?: string | null
          id?: string
          job_title?: string | null
          life_stage?: string | null
          name: string
          profile_picture_url?: string | null
          push_enabled?: boolean | null
          push_token?: string | null
          rep_style?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          created_at?: string
          current_level?: string | null
          email?: string
          focus_area_ids?: string[] | null
          gender?: string | null
          goals?: string | null
          id?: string
          job_title?: string | null
          life_stage?: string | null
          name?: string
          profile_picture_url?: string | null
          push_enabled?: boolean | null
          push_token?: string | null
          rep_style?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_user_streak: {
        Args: { p_completed_date: string; p_user_id: string }
        Returns: {
          current_streak: number
          is_new_record: boolean
          longest_streak: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
