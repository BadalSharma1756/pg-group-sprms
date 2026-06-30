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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          department_id: string | null
          detail: Json | null
          entity_label: string | null
          id: number
          ip: string | null
          new_status: string | null
          old_status: string | null
          plant_id: string | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          department_id?: string | null
          detail?: Json | null
          entity_label?: string | null
          id?: number
          ip?: string | null
          new_status?: string | null
          old_status?: string | null
          plant_id?: string | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          department_id?: string | null
          detail?: Json | null
          entity_label?: string | null
          id?: number
          ip?: string | null
          new_status?: string | null
          old_status?: string | null
          plant_id?: string | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "v_current_stock"
            referencedColumns: ["plant_id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_events: {
        Row: {
          created_at: string
          email: string
          event_type: string
          id: string
          ip: string | null
          message: string | null
          metadata: Json
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          event_type: string
          id?: string
          ip?: string | null
          message?: string | null
          metadata?: Json
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          event_type?: string
          id?: string
          ip?: string | null
          message?: string | null
          metadata?: Json
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          plant_id: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          plant_id: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          plant_id?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "v_current_stock"
            referencedColumns: ["plant_id"]
          },
        ]
      }
      gap_verifications: {
        Row: {
          actual_gap: number
          allowed_wastage: number
          created_at: string
          created_by: string | null
          difference: number
          expected_consumption: number
          id: string
          material_id: string
          physical_stock: number
          plant_id: string
          purchased_qty: number
          remarks: string | null
          system_stock: number
          verify_date: string
        }
        Insert: {
          actual_gap?: number
          allowed_wastage?: number
          created_at?: string
          created_by?: string | null
          difference?: number
          expected_consumption?: number
          id?: string
          material_id: string
          physical_stock?: number
          plant_id: string
          purchased_qty?: number
          remarks?: string | null
          system_stock?: number
          verify_date?: string
        }
        Update: {
          actual_gap?: number
          allowed_wastage?: number
          created_at?: string
          created_by?: string | null
          difference?: number
          expected_consumption?: number
          id?: string
          material_id?: string
          physical_stock?: number
          plant_id?: string
          purchased_qty?: number
          remarks?: string | null
          system_stock?: number
          verify_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "gap_verifications_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gap_verifications_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "v_current_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "gap_verifications_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gap_verifications_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "v_current_stock"
            referencedColumns: ["plant_id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          material_id: string
          plant_id: string
          qty_in: number
          qty_out: number
          ref_id: string | null
          ref_table: string | null
          remarks: string | null
          txn_date: string
          txn_type: Database["public"]["Enums"]["txn_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id: string
          plant_id: string
          qty_in?: number
          qty_out?: number
          ref_id?: string | null
          ref_table?: string | null
          remarks?: string | null
          txn_date?: string
          txn_type: Database["public"]["Enums"]["txn_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string
          plant_id?: string
          qty_in?: number
          qty_out?: number
          ref_id?: string | null
          ref_table?: string | null
          remarks?: string | null
          txn_date?: string
          txn_type?: Database["public"]["Enums"]["txn_type"]
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "v_current_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "inventory_transactions_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "v_current_stock"
            referencedColumns: ["plant_id"]
          },
        ]
      }
      locations: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          region: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          region?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          region?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          allowed_wastage_pct: number
          code: string
          created_at: string
          id: string
          name: string
          pipe_size_id: string | null
          reorder_level: number
          status: Database["public"]["Enums"]["entity_status"]
          unit: string
          updated_at: string
        }
        Insert: {
          allowed_wastage_pct?: number
          code: string
          created_at?: string
          id?: string
          name: string
          pipe_size_id?: string | null
          reorder_level?: number
          status?: Database["public"]["Enums"]["entity_status"]
          unit?: string
          updated_at?: string
        }
        Update: {
          allowed_wastage_pct?: number
          code?: string
          created_at?: string
          id?: string
          name?: string
          pipe_size_id?: string | null
          reorder_level?: number
          status?: Database["public"]["Enums"]["entity_status"]
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_pipe_size_id_fkey"
            columns: ["pipe_size_id"]
            isOneToOne: false
            referencedRelation: "pipe_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_challenges: {
        Row: {
          code_hash: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          token_hash: string
          verification_type: string
        }
        Insert: {
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          token_hash: string
          verification_type: string
        }
        Update: {
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token_hash?: string
          verification_type?: string
        }
        Relationships: []
      }
      pipe_sizes: {
        Row: {
          code: string
          created_at: string
          id: string
          outer_diameter_mm: number
          status: Database["public"]["Enums"]["entity_status"]
          thickness_mm: number
          updated_at: string
          weight_per_meter_kg: number | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          outer_diameter_mm: number
          status?: Database["public"]["Enums"]["entity_status"]
          thickness_mm: number
          updated_at?: string
          weight_per_meter_kg?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          outer_diameter_mm?: number
          status?: Database["public"]["Enums"]["entity_status"]
          thickness_mm?: number
          updated_at?: string
          weight_per_meter_kg?: number | null
        }
        Relationships: []
      }
      plants: {
        Row: {
          code: string
          created_at: string
          id: string
          location: string | null
          location_id: string | null
          name: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          location?: string | null
          location_id?: string | null
          name: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          location?: string | null
          location_id?: string | null
          name?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plants_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_bom: {
        Row: {
          created_at: string
          id: string
          is_auto: boolean
          material_id: string
          notes: string | null
          product_id: string
          qty_per_unit: number
          uom: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_auto?: boolean
          material_id: string
          notes?: string | null
          product_id: string
          qty_per_unit: number
          uom?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_auto?: boolean
          material_id?: string
          notes?: string | null
          product_id?: string
          qty_per_unit?: number
          uom?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_bom_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_bom_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "v_current_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "product_bom_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      production_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          department_id: string
          entry_date: string
          entry_no: string
          id: string
          material_id: string | null
          meter_per_unit: number
          pipes_consumed_4m: number
          pipes_consumed_6m: number
          plant_id: string
          product_id: string
          quantity: number
          remarks: string | null
          shift: Database["public"]["Enums"]["shift_type"]
          status: Database["public"]["Enums"]["approval_status"]
          total_meter_consumed: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          department_id: string
          entry_date?: string
          entry_no?: string
          id?: string
          material_id?: string | null
          meter_per_unit?: number
          pipes_consumed_4m?: number
          pipes_consumed_6m?: number
          plant_id: string
          product_id: string
          quantity: number
          remarks?: string | null
          shift?: Database["public"]["Enums"]["shift_type"]
          status?: Database["public"]["Enums"]["approval_status"]
          total_meter_consumed?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string
          entry_date?: string
          entry_no?: string
          id?: string
          material_id?: string | null
          meter_per_unit?: number
          pipes_consumed_4m?: number
          pipes_consumed_6m?: number
          plant_id?: string
          product_id?: string
          quantity?: number
          remarks?: string | null
          shift?: Database["public"]["Enums"]["shift_type"]
          status?: Database["public"]["Enums"]["approval_status"]
          total_meter_consumed?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_entries_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_entries_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_entries_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "v_current_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "production_entries_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_entries_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "v_current_stock"
            referencedColumns: ["plant_id"]
          },
          {
            foreignKeyName: "production_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          code: string
          created_at: string
          department_id: string
          height_mm: number
          id: string
          length_mm: number
          material_id: string
          name: string
          pipe_size_id: string
          pipes_required_4m: number
          pipes_required_6m: number
          plant_id: string
          status: Database["public"]["Enums"]["entity_status"]
          total_feet: number
          total_meter: number
          unit: Database["public"]["Enums"]["unit_type"]
          updated_at: string
          width_mm: number
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          department_id: string
          height_mm: number
          id?: string
          length_mm: number
          material_id: string
          name: string
          pipe_size_id: string
          pipes_required_4m?: number
          pipes_required_6m?: number
          plant_id: string
          status?: Database["public"]["Enums"]["entity_status"]
          total_feet?: number
          total_meter?: number
          unit?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
          width_mm: number
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          department_id?: string
          height_mm?: number
          id?: string
          length_mm?: number
          material_id?: string
          name?: string
          pipe_size_id?: string
          pipes_required_4m?: number
          pipes_required_6m?: number
          plant_id?: string
          status?: Database["public"]["Enums"]["entity_status"]
          total_feet?: number
          total_meter?: number
          unit?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
          width_mm?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "v_current_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "products_pipe_size_id_fkey"
            columns: ["pipe_size_id"]
            isOneToOne: false
            referencedRelation: "pipe_sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "v_current_stock"
            referencedColumns: ["plant_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          default_plant_id: string | null
          email: string
          employee_code: string | null
          full_name: string
          id: string
          location_id: string | null
          phone: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_plant_id?: string | null
          email: string
          employee_code?: string | null
          full_name?: string
          id: string
          location_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_plant_id?: string | null
          email?: string
          employee_code?: string | null
          full_name?: string
          id?: string
          location_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_plant_id_fkey"
            columns: ["default_plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_default_plant_id_fkey"
            columns: ["default_plant_id"]
            isOneToOne: false
            referencedRelation: "v_current_stock"
            referencedColumns: ["plant_id"]
          },
          {
            foreignKeyName: "profiles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          gst_pct: number
          id: string
          invoice_date: string | null
          invoice_no: string | null
          material_id: string
          pending_qty: number
          plant_id: string
          po_date: string
          po_no: string
          quantity: number
          rate: number
          received_qty: number
          remarks: string | null
          status: Database["public"]["Enums"]["approval_status"]
          supplier_id: string
          total_amount: number
          transport: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          gst_pct?: number
          id?: string
          invoice_date?: string | null
          invoice_no?: string | null
          material_id: string
          pending_qty?: number
          plant_id: string
          po_date?: string
          po_no?: string
          quantity: number
          rate?: number
          received_qty?: number
          remarks?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          supplier_id: string
          total_amount?: number
          transport?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          gst_pct?: number
          id?: string
          invoice_date?: string | null
          invoice_no?: string | null
          material_id?: string
          pending_qty?: number
          plant_id?: string
          po_date?: string
          po_no?: string
          quantity?: number
          rate?: number
          received_qty?: number
          remarks?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          supplier_id?: string
          total_amount?: number
          transport?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "v_current_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "purchase_orders_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "v_current_stock"
            referencedColumns: ["plant_id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      scrap_entries: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string
          id: string
          material_id: string
          operator: string | null
          operator_id: string | null
          plant_id: string
          quantity: number
          reason: string | null
          recovery_value: number
          scrap_date: string
          scrap_no: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id: string
          id?: string
          material_id: string
          operator?: string | null
          operator_id?: string | null
          plant_id: string
          quantity: number
          reason?: string | null
          recovery_value?: number
          scrap_date?: string
          scrap_no?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string
          id?: string
          material_id?: string
          operator?: string | null
          operator_id?: string | null
          plant_id?: string
          quantity?: number
          reason?: string | null
          recovery_value?: number
          scrap_date?: string
          scrap_no?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrap_entries_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrap_entries_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrap_entries_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "v_current_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "scrap_entries_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrap_entries_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "v_current_stock"
            referencedColumns: ["plant_id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          code: string
          contact: string | null
          created_at: string
          email: string | null
          gstin: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          contact?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          contact?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_plants: {
        Row: {
          created_at: string
          id: string
          plant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_plants_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_plants_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "v_current_stock"
            referencedColumns: ["plant_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_current_stock: {
        Row: {
          current_stock: number | null
          is_low: boolean | null
          material_code: string | null
          material_id: string | null
          material_name: string | null
          plant_code: string | null
          plant_id: string | null
          reorder_level: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_user_is_admin: { Args: never; Returns: boolean }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_can_access_plant: {
        Args: { _plant_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "plant_admin"
        | "production_manager"
        | "production_operator"
        | "purchase_manager"
        | "purchase_executive"
        | "store_manager"
        | "quality_manager"
        | "auditor"
        | "viewer"
      approval_status: "draft" | "pending" | "approved" | "rejected"
      entity_status: "active" | "inactive"
      shift_type: "morning" | "afternoon" | "night" | "general" | "evening"
      txn_type:
        | "opening"
        | "purchase_in"
        | "production_out"
        | "scrap_out"
        | "adjustment_in"
        | "adjustment_out"
        | "transfer_in"
        | "transfer_out"
        | "physical_verification"
      unit_type: "mm" | "cm" | "m" | "ft" | "inch"
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
      app_role: [
        "super_admin",
        "plant_admin",
        "production_manager",
        "production_operator",
        "purchase_manager",
        "purchase_executive",
        "store_manager",
        "quality_manager",
        "auditor",
        "viewer",
      ],
      approval_status: ["draft", "pending", "approved", "rejected"],
      entity_status: ["active", "inactive"],
      shift_type: ["morning", "afternoon", "night", "general", "evening"],
      txn_type: [
        "opening",
        "purchase_in",
        "production_out",
        "scrap_out",
        "adjustment_in",
        "adjustment_out",
        "transfer_in",
        "transfer_out",
        "physical_verification",
      ],
      unit_type: ["mm", "cm", "m", "ft", "inch"],
    },
  },
} as const
