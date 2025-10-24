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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
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
          {
            foreignKeyName: "fk_ai_records_calf_id"
            columns: ["calf_id"]
            isOneToOne: false
            referencedRelation: "calves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ai_records_cow_id"
            columns: ["cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      breeds: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      calves: {
        Row: {
          birth_weight: number | null
          breed: string | null
          calf_number: string | null
          created_at: string | null
          date_of_birth: string
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
      collection_center_sales: {
        Row: {
          created_at: string
          created_by: string | null
          customer_name: string
          id: string
          notes: string | null
          payment_date: string | null
          payment_month: string
          payment_status: string
          quantity: number
          rate_per_liter: number
          sale_date: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_name: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_month?: string
          payment_status?: string
          quantity: number
          rate_per_liter: number
          sale_date?: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_name?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_month?: string
          payment_status?: string
          quantity?: number
          rate_per_liter?: number
          sale_date?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      cow_group_assignments: {
        Row: {
          assigned_by_user_id: string | null
          assigned_date: string | null
          cow_id: string | null
          created_at: string | null
          group_id: string | null
          id: string
          is_active: boolean | null
        }
        Insert: {
          assigned_by_user_id?: string | null
          assigned_date?: string | null
          cow_id?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
        }
        Update: {
          assigned_by_user_id?: string | null
          assigned_date?: string | null
          cow_id?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "cow_group_assignments_cow_id_fkey"
            columns: ["cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cow_group_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "cow_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      cow_groups: {
        Row: {
          created_at: string | null
          description: string | null
          feed_requirements: Json | null
          group_name: string
          id: string
          is_active: boolean | null
          max_days_in_milk: number | null
          max_yield: number | null
          min_days_in_milk: number | null
          min_yield: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          feed_requirements?: Json | null
          group_name: string
          id?: string
          is_active?: boolean | null
          max_days_in_milk?: number | null
          max_yield?: number | null
          min_days_in_milk?: number | null
          min_yield?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          feed_requirements?: Json | null
          group_name?: string
          id?: string
          is_active?: boolean | null
          max_days_in_milk?: number | null
          max_yield?: number | null
          min_days_in_milk?: number | null
          min_yield?: number | null
          updated_at?: string | null
        }
        Relationships: []
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
          is_promoted_calf: boolean | null
          lactation_number: number | null
          last_calving_date: string | null
          lifetime_yield: number | null
          moved_to_milking: boolean | null
          moved_to_milking_at: string | null
          needs_milking_move: boolean | null
          needs_milking_move_at: string | null
          notes: string | null
          original_mother_cow_id: string | null
          peak_yield: number | null
          promoted_from_calf_id: string | null
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
          is_promoted_calf?: boolean | null
          lactation_number?: number | null
          last_calving_date?: string | null
          lifetime_yield?: number | null
          moved_to_milking?: boolean | null
          moved_to_milking_at?: string | null
          needs_milking_move?: boolean | null
          needs_milking_move_at?: string | null
          notes?: string | null
          original_mother_cow_id?: string | null
          peak_yield?: number | null
          promoted_from_calf_id?: string | null
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
          is_promoted_calf?: boolean | null
          lactation_number?: number | null
          last_calving_date?: string | null
          lifetime_yield?: number | null
          moved_to_milking?: boolean | null
          moved_to_milking_at?: string | null
          needs_milking_move?: boolean | null
          needs_milking_move_at?: string | null
          notes?: string | null
          original_mother_cow_id?: string | null
          peak_yield?: number | null
          promoted_from_calf_id?: string | null
          purchase_price?: number | null
          status?: Database["public"]["Enums"]["cow_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cows_original_mother_cow_id_fkey"
            columns: ["original_mother_cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cows_promoted_from_calf_id_fkey"
            columns: ["promoted_from_calf_id"]
            isOneToOne: false
            referencedRelation: "calves"
            referencedColumns: ["id"]
          },
        ]
      }
      cream_stock: {
        Row: {
          created_at: string
          current_stock: number
          ghee_production_id: string | null
          id: string
          milk_distribution_id: string | null
          notes: string | null
          quantity: number
          source: string | null
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          created_at?: string
          current_stock?: number
          ghee_production_id?: string | null
          id?: string
          milk_distribution_id?: string | null
          notes?: string | null
          quantity: number
          source?: string | null
          transaction_date?: string
          transaction_type: string
        }
        Update: {
          created_at?: string
          current_stock?: number
          ghee_production_id?: string | null
          id?: string
          milk_distribution_id?: string | null
          notes?: string | null
          quantity?: number
          source?: string | null
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cream_stock_milk_distribution_id_fkey"
            columns: ["milk_distribution_id"]
            isOneToOne: false
            referencedRelation: "milk_distributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ghee_production"
            columns: ["ghee_production_id"]
            isOneToOne: false
            referencedRelation: "ghee_production"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      expense_sources: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          invoice_number: string | null
          is_recurring: boolean
          notes: string | null
          paid_by: string | null
          payment_date: string
          payment_method_id: string | null
          payment_period: string
          receipt_url: string | null
          recurring_frequency: string | null
          source_id: string | null
          status: Database["public"]["Enums"]["expense_status"]
          tags: Json | null
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          invoice_number?: string | null
          is_recurring?: boolean
          notes?: string | null
          paid_by?: string | null
          payment_date: string
          payment_method_id?: string | null
          payment_period?: string
          receipt_url?: string | null
          recurring_frequency?: string | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          tags?: Json | null
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          invoice_number?: string | null
          is_recurring?: boolean
          notes?: string | null
          paid_by?: string | null
          payment_date?: string
          payment_method_id?: string | null
          payment_period?: string
          receipt_url?: string | null
          recurring_frequency?: string | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          tags?: Json | null
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "expense_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_expenses_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_expenses_payment_method"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_expenses_source"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "expense_sources"
            referencedColumns: ["id"]
          },
        ]
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
      ghee_production: {
        Row: {
          batch_number: string | null
          conversion_rate: number | null
          cream_used: number
          created_at: string
          ghee_yield: number
          id: string
          notes: string | null
          production_cost: number | null
          production_date: string
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          conversion_rate?: number | null
          cream_used: number
          created_at?: string
          ghee_yield: number
          id?: string
          notes?: string | null
          production_cost?: number | null
          production_date?: string
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          conversion_rate?: number | null
          cream_used?: number
          created_at?: string
          ghee_yield?: number
          id?: string
          notes?: string | null
          production_cost?: number | null
          production_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      ghee_sales: {
        Row: {
          created_at: string
          created_by: string | null
          customer_name: string | null
          ghee_production_id: string | null
          id: string
          notes: string | null
          quantity: number
          rate_per_kg: number
          sale_date: string
          sale_type: string
          total_amount: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          ghee_production_id?: string | null
          id?: string
          notes?: string | null
          quantity: number
          rate_per_kg: number
          sale_date?: string
          sale_type: string
          total_amount?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          ghee_production_id?: string | null
          id?: string
          notes?: string | null
          quantity?: number
          rate_per_kg?: number
          sale_date?: string
          sale_type?: string
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ghee_sales_ghee_production_id_fkey"
            columns: ["ghee_production_id"]
            isOneToOne: false
            referencedRelation: "ghee_production"
            referencedColumns: ["id"]
          },
        ]
      }
      grouping_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          setting_name: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          setting_name: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          setting_name?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          used_at?: string | null
        }
        Relationships: []
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
          species: string
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
          species?: string
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
          species?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_milk_collections_farmer_id"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milk_collections_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
        ]
      }
      milk_distributions: {
        Row: {
          calves: number
          chunnu: number
          collection_center: number
          cream_extraction: number
          cream_yield: number | null
          created_at: string
          distribution_date: string
          farm_workers: number
          ffm_to_dahi: number | null
          ffm_to_plant: number | null
          ffm_yield: number | null
          home: number
          id: string
          notes: string | null
          pradhan_ji: number
          session: string
          store: number
          total_production: number
          updated_at: string
        }
        Insert: {
          calves?: number
          chunnu?: number
          collection_center?: number
          cream_extraction?: number
          cream_yield?: number | null
          created_at?: string
          distribution_date?: string
          farm_workers?: number
          ffm_to_dahi?: number | null
          ffm_to_plant?: number | null
          ffm_yield?: number | null
          home?: number
          id?: string
          notes?: string | null
          pradhan_ji?: number
          session: string
          store?: number
          total_production?: number
          updated_at?: string
        }
        Update: {
          calves?: number
          chunnu?: number
          collection_center?: number
          cream_extraction?: number
          cream_yield?: number | null
          created_at?: string
          distribution_date?: string
          farm_workers?: number
          ffm_to_dahi?: number | null
          ffm_to_plant?: number | null
          ffm_yield?: number | null
          home?: number
          id?: string
          notes?: string | null
          pradhan_ji?: number
          session?: string
          store?: number
          total_production?: number
          updated_at?: string
        }
        Relationships: []
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
      milking_logs: {
        Row: {
          created_at: string
          id: string
          milking_end_time: string | null
          milking_start_time: string | null
          production_date: string
          session: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          milking_end_time?: string | null
          milking_start_time?: string | null
          production_date: string
          session: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          milking_end_time?: string | null
          milking_start_time?: string | null
          production_date?: string
          session?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_history: {
        Row: {
          created_at: string
          dismissed_at: string | null
          entity_id: string | null
          entity_type: string | null
          group_key: string | null
          id: string
          is_grouped: boolean | null
          message: string
          notification_id: string
          priority: string
          read_at: string | null
          snoozed_until: string | null
          status: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dismissed_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          group_key?: string | null
          id?: string
          is_grouped?: boolean | null
          message: string
          notification_id: string
          priority?: string
          read_at?: string | null
          snoozed_until?: string | null
          status?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          dismissed_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          group_key?: string | null
          id?: string
          is_grouped?: boolean | null
          message?: string
          notification_id?: string
          priority?: string
          read_at?: string | null
          snoozed_until?: string | null
          status?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          category: string
          channels: Json
          created_at: string
          enabled: boolean
          id: string
          quiet_hours: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          channels?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          quiet_hours?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          channels?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          quiet_hours?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          title: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          title?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      paid_by_people: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      plant_sales: {
        Row: {
          amount_received: number
          created_at: string
          created_by: string | null
          derived_rate: number | null
          fat_percentage: number
          id: string
          notes: string | null
          payment_date: string | null
          payment_status: string
          quantity: number
          sale_date: string
          slip_number: string | null
          snf_percentage: number | null
          updated_at: string
        }
        Insert: {
          amount_received: number
          created_at?: string
          created_by?: string | null
          derived_rate?: number | null
          fat_percentage: number
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_status?: string
          quantity: number
          sale_date?: string
          slip_number?: string | null
          snf_percentage?: number | null
          updated_at?: string
        }
        Update: {
          amount_received?: number
          created_at?: string
          created_by?: string | null
          derived_rate?: number | null
          fat_percentage?: number
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_status?: string
          quantity?: number
          sale_date?: string
          slip_number?: string | null
          snf_percentage?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          expo_push_token: string | null
          fcm_token: string | null
          full_name: string
          id: string
          phone_number: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expo_push_token?: string | null
          fcm_token?: string | null
          full_name: string
          id: string
          phone_number?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expo_push_token?: string | null
          fcm_token?: string | null
          full_name?: string
          id?: string
          phone_number?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rate_matrix: {
        Row: {
          effective_from: string
          fat: number
          inserted_at: string | null
          rate: number
          snf: number
          species: string
        }
        Insert: {
          effective_from: string
          fat: number
          inserted_at?: string | null
          rate: number
          snf: number
          species: string
        }
        Update: {
          effective_from?: string
          fat?: number
          inserted_at?: string | null
          rate?: number
          snf?: number
          species?: string
        }
        Relationships: []
      }
      store_sales: {
        Row: {
          cash_amount: number
          created_at: string
          created_by: string | null
          credit_amount: number
          id: string
          notes: string | null
          sale_date: string
          total_amount: number | null
          updated_at: string
          upi_amount: number
        }
        Insert: {
          cash_amount?: number
          created_at?: string
          created_by?: string | null
          credit_amount?: number
          id?: string
          notes?: string | null
          sale_date?: string
          total_amount?: number | null
          updated_at?: string
          upi_amount?: number
        }
        Update: {
          cash_amount?: number
          created_at?: string
          created_by?: string | null
          credit_amount?: number
          id?: string
          notes?: string | null
          sale_date?: string
          total_amount?: number | null
          updated_at?: string
          upi_amount?: number
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
            foreignKeyName: "fk_vaccination_records_cow_id"
            columns: ["cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vaccination_records_schedule_id"
            columns: ["vaccination_schedule_id"]
            isOneToOne: false
            referencedRelation: "vaccination_schedules"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "fk_weight_logs_cow_id"
            columns: ["cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
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
      calculate_days_in_milk: { Args: { cow_id: string }; Returns: number }
      create_daily_deliveries_for_date: {
        Args: { target_date?: string }
        Returns: number
      }
      fn_get_rate: {
        Args: {
          p_date?: string
          p_fat: number
          p_snf: number
          p_species: string
        }
        Returns: {
          effective_from: string
          rate: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_within_session_window: {
        Args: { _production_date: string; _session: string }
        Returns: boolean
      }
    }
    Enums: {
      ai_status: "pending" | "done" | "failed"
      app_role: "admin" | "farmer" | "worker" | "store_manager" | "delivery_boy"
      calf_status: "alive" | "dead" | "sold" | "promoted"
      cow_status: "active" | "dry" | "pregnant" | "sick" | "sold" | "dead"
      expense_status: "pending" | "paid" | "overdue" | "cancelled"
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
      ai_status: ["pending", "done", "failed"],
      app_role: ["admin", "farmer", "worker", "store_manager", "delivery_boy"],
      calf_status: ["alive", "dead", "sold", "promoted"],
      cow_status: ["active", "dry", "pregnant", "sick", "sold", "dead"],
      expense_status: ["pending", "paid", "overdue", "cancelled"],
      gender: ["male", "female"],
      pd_result: ["positive", "negative", "inconclusive"],
      session_type: ["morning", "evening"],
      transaction_type: ["incoming", "outgoing"],
    },
  },
} as const
