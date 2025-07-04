export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_records: {
        Row: {
          actual_delivery_date: string | null
          ai_date: string
          ai_status: Database["public"]["Enums"]["ai_status"] | null
          calf_gender: Database["public"]["Enums"]["gender"] | null
          calf_id: string | null
          confirmation_date: string | null
          cow_id: string | null
          created_at: string | null
          expected_delivery_date: string | null
          id: string
          is_successful: boolean | null
          notes: string | null
          pd_date: string | null
          pd_done: boolean | null
          pd_result: Database["public"]["Enums"]["pd_result"] | null
          semen_batch: string | null
          service_number: number
          technician_name: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          ai_date: string
          ai_status?: Database["public"]["Enums"]["ai_status"] | null
          calf_gender?: Database["public"]["Enums"]["gender"] | null
          calf_id?: string | null
          confirmation_date?: string | null
          cow_id?: string | null
          created_at?: string | null
          expected_delivery_date?: string | null
          id?: string
          is_successful?: boolean | null
          notes?: string | null
          pd_date?: string | null
          pd_done?: boolean | null
          pd_result?: Database["public"]["Enums"]["pd_result"] | null
          semen_batch?: string | null
          service_number?: number
          technician_name?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          ai_date?: string
          ai_status?: Database["public"]["Enums"]["ai_status"] | null
          calf_gender?: Database["public"]["Enums"]["gender"] | null
          calf_id?: string | null
          confirmation_date?: string | null
          cow_id?: string | null
          created_at?: string | null
          expected_delivery_date?: string | null
          id?: string
          is_successful?: boolean | null
          notes?: string | null
          pd_date?: string | null
          pd_done?: boolean | null
          pd_result?: Database["public"]["Enums"]["pd_result"] | null
          semen_batch?: string | null
          service_number?: number
          technician_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_records_calf_id_fkey"
            columns: ["calf_id"]
            isOneToOne: false
            referencedRelation: "calves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_records_cow_id_fkey"
            columns: ["cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
        ]
      }
      calves: {
        Row: {
          birth_weight: number | null
          breed: string | null
          calf_number: string | null
          created_at: string | null
          date_of_birth: string
          date_of_conception: string | null
          gender: Database["public"]["Enums"]["gender"]
          id: string
          image_url: string | null
          mother_cow_id: string | null
          notes: string | null
          status: Database["public"]["Enums"]["calf_status"] | null
          updated_at: string | null
        }
        Insert: {
          birth_weight?: number | null
          breed?: string | null
          calf_number?: string | null
          created_at?: string | null
          date_of_birth: string
          date_of_conception?: string | null
          gender: Database["public"]["Enums"]["gender"]
          id?: string
          image_url?: string | null
          mother_cow_id?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["calf_status"] | null
          updated_at?: string | null
        }
        Update: {
          birth_weight?: number | null
          breed?: string | null
          calf_number?: string | null
          created_at?: string | null
          date_of_birth?: string
          date_of_conception?: string | null
          gender?: Database["public"]["Enums"]["gender"]
          id?: string
          image_url?: string | null
          mother_cow_id?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["calf_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calves_mother_cow_id_fkey"
            columns: ["mother_cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
        ]
      }
      cows: {
        Row: {
          breed: string | null
          cow_number: string
          created_at: string | null
          current_month_yield: number | null
          date_of_arrival: string
          date_of_birth: string | null
          estimated_milk_capacity: number | null
          id: string
          image_url: string | null
          lactation_number: number | null
          last_calving_date: string | null
          lifetime_yield: number | null
          notes: string | null
          peak_yield: number | null
          purchase_price: number | null
          status: Database["public"]["Enums"]["cow_status"] | null
          updated_at: string | null
        }
        Insert: {
          breed?: string | null
          cow_number: string
          created_at?: string | null
          current_month_yield?: number | null
          date_of_arrival: string
          date_of_birth?: string | null
          estimated_milk_capacity?: number | null
          id?: string
          image_url?: string | null
          lactation_number?: number | null
          last_calving_date?: string | null
          lifetime_yield?: number | null
          notes?: string | null
          peak_yield?: number | null
          purchase_price?: number | null
          status?: Database["public"]["Enums"]["cow_status"] | null
          updated_at?: string | null
        }
        Update: {
          breed?: string | null
          cow_number?: string
          created_at?: string | null
          current_month_yield?: number | null
          date_of_arrival?: string
          date_of_birth?: string | null
          estimated_milk_capacity?: number | null
          id?: string
          image_url?: string | null
          lactation_number?: number | null
          last_calving_date?: string | null
          lifetime_yield?: number | null
          notes?: string | null
          peak_yield?: number | null
          purchase_price?: number | null
          status?: Database["public"]["Enums"]["cow_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      farmers: {
        Row: {
          address: string | null
          created_at: string | null
          farmer_code: string
          id: string
          is_active: boolean | null
          name: string
          phone_number: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          farmer_code: string
          id?: string
          is_active?: boolean | null
          name: string
          phone_number: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          farmer_code?: string
          id?: string
          is_active?: boolean | null
          name?: string
          phone_number?: string
        }
        Relationships: []
      }
      feed_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      feed_items: {
        Row: {
          category_id: string | null
          cost_per_unit: number | null
          created_at: string | null
          current_stock: number | null
          id: string
          minimum_stock_level: number | null
          name: string
          unit: string
        }
        Insert: {
          category_id?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          current_stock?: number | null
          id?: string
          minimum_stock_level?: number | null
          name: string
          unit: string
        }
        Update: {
          category_id?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          current_stock?: number | null
          id?: string
          minimum_stock_level?: number | null
          name?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "feed_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_transactions: {
        Row: {
          created_at: string | null
          feed_item_id: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          quantity: number
          supplier_name: string | null
          total_cost: number | null
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          feed_item_id?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          quantity: number
          supplier_name?: string | null
          total_cost?: number | null
          transaction_date?: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          feed_item_id?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          quantity?: number
          supplier_name?: string | null
          total_cost?: number | null
          transaction_date?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_transactions_feed_item_id_fkey"
            columns: ["feed_item_id"]
            isOneToOne: false
            referencedRelation: "feed_items"
            referencedColumns: ["id"]
          },
        ]
      }
      milk_collections: {
        Row: {
          collection_date: string
          created_at: string | null
          farmer_id: string | null
          fat_percentage: number
          id: string
          is_accepted: boolean | null
          quantity: number
          rate_per_liter: number
          remarks: string | null
          session: Database["public"]["Enums"]["session_type"]
          snf_percentage: number
          total_amount: number
        }
        Insert: {
          collection_date?: string
          created_at?: string | null
          farmer_id?: string | null
          fat_percentage: number
          id?: string
          is_accepted?: boolean | null
          quantity: number
          rate_per_liter: number
          remarks?: string | null
          session: Database["public"]["Enums"]["session_type"]
          snf_percentage: number
          total_amount: number
        }
        Update: {
          collection_date?: string
          created_at?: string | null
          farmer_id?: string | null
          fat_percentage?: number
          id?: string
          is_accepted?: boolean | null
          quantity?: number
          rate_per_liter?: number
          remarks?: string | null
          session?: Database["public"]["Enums"]["session_type"]
          snf_percentage?: number
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "milk_collections_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
        ]
      }
      milk_production: {
        Row: {
          cow_id: string | null
          created_at: string | null
          fat_percentage: number | null
          id: string
          production_date: string
          quantity: number
          remarks: string | null
          session: Database["public"]["Enums"]["session_type"]
          snf_percentage: number | null
        }
        Insert: {
          cow_id?: string | null
          created_at?: string | null
          fat_percentage?: number | null
          id?: string
          production_date?: string
          quantity: number
          remarks?: string | null
          session: Database["public"]["Enums"]["session_type"]
          snf_percentage?: number | null
        }
        Update: {
          cow_id?: string | null
          created_at?: string | null
          fat_percentage?: number | null
          id?: string
          production_date?: string
          quantity?: number
          remarks?: string | null
          session?: Database["public"]["Enums"]["session_type"]
          snf_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "milk_production_cow_id_fkey"
            columns: ["cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
        ]
      }
      milk_rates: {
        Row: {
          created_at: string | null
          effective_from: string
          fat_max: number
          fat_min: number
          id: string
          is_active: boolean | null
          rate_per_liter: number
          snf_max: number
          snf_min: number
        }
        Insert: {
          created_at?: string | null
          effective_from?: string
          fat_max: number
          fat_min: number
          id?: string
          is_active?: boolean | null
          rate_per_liter: number
          snf_max: number
          snf_min: number
        }
        Update: {
          created_at?: string | null
          effective_from?: string
          fat_max?: number
          fat_min?: number
          id?: string
          is_active?: boolean | null
          rate_per_liter?: number
          snf_max?: number
          snf_min?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          phone_number: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id: string
          phone_number?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          phone_number?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vaccination_records: {
        Row: {
          administered_by: string | null
          batch_number: string | null
          cow_id: string | null
          created_at: string | null
          id: string
          next_due_date: string
          notes: string | null
          vaccination_date: string
          vaccination_schedule_id: string | null
        }
        Insert: {
          administered_by?: string | null
          batch_number?: string | null
          cow_id?: string | null
          created_at?: string | null
          id?: string
          next_due_date: string
          notes?: string | null
          vaccination_date: string
          vaccination_schedule_id?: string | null
        }
        Update: {
          administered_by?: string | null
          batch_number?: string | null
          cow_id?: string | null
          created_at?: string | null
          id?: string
          next_due_date?: string
          notes?: string | null
          vaccination_date?: string
          vaccination_schedule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vaccination_records_cow_id_fkey"
            columns: ["cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccination_records_vaccination_schedule_id_fkey"
            columns: ["vaccination_schedule_id"]
            isOneToOne: false
            referencedRelation: "vaccination_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccination_schedules: {
        Row: {
          created_at: string | null
          description: string | null
          frequency_months: number
          id: string
          is_active: boolean | null
          vaccine_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          frequency_months: number
          id?: string
          is_active?: boolean | null
          vaccine_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          frequency_months?: number
          id?: string
          is_active?: boolean | null
          vaccine_name?: string
        }
        Relationships: []
      }
      weight_logs: {
        Row: {
          body_length: number
          calculated_weight: number
          cow_id: string | null
          created_at: string | null
          heart_girth: number
          id: string
          log_date: string
          notes: string | null
        }
        Insert: {
          body_length: number
          calculated_weight: number
          cow_id?: string | null
          created_at?: string | null
          heart_girth: number
          id?: string
          log_date?: string
          notes?: string | null
        }
        Update: {
          body_length?: number
          calculated_weight?: number
          cow_id?: string | null
          created_at?: string | null
          heart_girth?: number
          id?: string
          log_date?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weight_logs_cow_id_fkey"
            columns: ["cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_days_in_milk: {
        Args: { cow_id: string }
        Returns: number
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      ai_status: "pending" | "done" | "failed"
      app_role: "admin" | "farmer" | "worker"
      calf_status: "alive" | "dead" | "sold"
      cow_status: "active" | "dry" | "pregnant" | "sick" | "sold" | "dead"
      gender: "male" | "female"
      pd_result: "positive" | "negative" | "inconclusive"
      session_type: "morning" | "evening"
      transaction_type: "incoming" | "outgoing"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ai_status: ["pending", "done", "failed"],
      app_role: ["admin", "farmer", "worker"],
      calf_status: ["alive", "dead", "sold"],
      cow_status: ["active", "dry", "pregnant", "sick", "sold", "dead"],
      gender: ["male", "female"],
      pd_result: ["positive", "negative", "inconclusive"],
      session_type: ["morning", "evening"],
      transaction_type: ["incoming", "outgoing"],
    },
  },
} as const
