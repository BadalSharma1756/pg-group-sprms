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
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      fabrication_consumptions: {
        Row: {
          consumed_qty: number
          created_at: string
          fabrication_id: string
          id: string
          material_id: string
          required_qty: number
          uom: Database["public"]["Enums"]["material_uom"]
        }
        Insert: {
          consumed_qty: number
          created_at?: string
          fabrication_id: string
          id?: string
          material_id: string
          required_qty: number
          uom: Database["public"]["Enums"]["material_uom"]
        }
        Update: {
          consumed_qty?: number
          created_at?: string
          fabrication_id?: string
          id?: string
          material_id?: string
          required_qty?: number
          uom?: Database["public"]["Enums"]["material_uom"]
        }
        Relationships: [
          {
            foreignKeyName: "fabrication_consumptions_fabrication_id_fkey"
            columns: ["fabrication_id"]
            isOneToOne: false
            referencedRelation: "fabrication_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fabrication_consumptions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fabrication_consumptions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "v_current_stock"
            referencedColumns: ["material_id"]
          },
        ]
      }
      fabrication_entries: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string | null
          entry_date: string
          entry_no: string
          id: string
          product_id: string
          quantity: number
          remarks: string | null
          supervisor_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          entry_date?: string
          entry_no: string
          id?: string
          product_id: string
          quantity: number
          remarks?: string | null
          supervisor_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          entry_date?: string
          entry_no?: string
          id?: string
          product_id?: string
          quantity?: number
          remarks?: string | null
          supervisor_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fabrication_entries_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fabrication_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fabrication_entries_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "supervisors"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string
          id: string
          material_id: string
          qty_in: number
          qty_out: number
          ref_id: string | null
          ref_table: string | null
          remarks: string | null
          txn_date: string
          txn_type: Database["public"]["Enums"]["inventory_txn_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          qty_in?: number
          qty_out?: number
          ref_id?: string | null
          ref_table?: string | null
          remarks?: string | null
          txn_date?: string
          txn_type: Database["public"]["Enums"]["inventory_txn_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          qty_in?: number
          qty_out?: number
          ref_id?: string | null
          ref_table?: string | null
          remarks?: string | null
          txn_date?: string
          txn_type?: Database["public"]["Enums"]["inventory_txn_type"]
          user_id?: string | null
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
        ]
      }
      material_receipt_items: {
        Row: {
          created_at: string
          id: string
          material_id: string
          po_item_id: string
          receipt_id: string
          received_qty: number
          remarks: string | null
          uom: Database["public"]["Enums"]["material_uom"]
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          po_item_id: string
          receipt_id: string
          received_qty: number
          remarks?: string | null
          uom: Database["public"]["Enums"]["material_uom"]
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          po_item_id?: string
          receipt_id?: string
          received_qty?: number
          remarks?: string | null
          uom?: Database["public"]["Enums"]["material_uom"]
        }
        Relationships: [
          {
            foreignKeyName: "material_receipt_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receipt_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "v_current_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "material_receipt_items_po_item_id_fkey"
            columns: ["po_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receipt_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "material_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      material_receipts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          invoice_date: string
          invoice_no: string
          po_id: string
          receipt_no: string
          remarks: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_date?: string
          invoice_no: string
          po_id: string
          receipt_no: string
          remarks?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_date?: string
          invoice_no?: string
          po_id?: string
          receipt_no?: string
          remarks?: string | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_receipts_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          category: string | null
          code: string
          created_at: string
          description: string | null
          id: string
          min_stock: number
          name: string
          reorder_level: number
          status: string
          uom: Database["public"]["Enums"]["material_uom"]
          updated_at: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          min_stock?: number
          name: string
          reorder_level?: number
          status?: string
          uom?: Database["public"]["Enums"]["material_uom"]
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          min_stock?: number
          name?: string
          reorder_level?: number
          status?: string
          uom?: Database["public"]["Enums"]["material_uom"]
          updated_at?: string
        }
        Relationships: []
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
      product_bom: {
        Row: {
          created_at: string
          id: string
          material_id: string
          product_id: string
          qty_per_unit: number
          uom: Database["public"]["Enums"]["material_uom"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          product_id: string
          qty_per_unit: number
          uom: Database["public"]["Enums"]["material_uom"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          product_id?: string
          qty_per_unit?: number
          uom?: Database["public"]["Enums"]["material_uom"]
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
      products: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          amount: number
          created_at: string
          id: string
          material_id: string
          ordered_qty: number
          pending_qty: number
          po_id: string
          rate: number
          received_qty: number
          uom: Database["public"]["Enums"]["material_uom"]
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          material_id: string
          ordered_qty: number
          pending_qty?: number
          po_id: string
          rate?: number
          received_qty?: number
          uom: Database["public"]["Enums"]["material_uom"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          material_id?: string
          ordered_qty?: number
          pending_qty?: number
          po_id?: string
          rate?: number
          received_qty?: number
          uom?: Database["public"]["Enums"]["material_uom"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "v_current_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string | null
          id: string
          po_date: string
          po_no: string
          remarks: string | null
          status: Database["public"]["Enums"]["po_status"]
          supplier_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          po_date?: string
          po_no: string
          remarks?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          po_date?: string
          po_no?: string
          remarks?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
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
      supervisors: {
        Row: {
          created_at: string
          department_id: string | null
          id: string
          name: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          id?: string
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          id?: string
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisors_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          code: string
          contact_name: string | null
          created_at: string
          email: string | null
          gstin: string | null
          id: string
          name: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
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
          code: string | null
          current_stock: number | null
          material_id: string | null
          min_stock: number | null
          name: string | null
          reorder_level: number | null
          uom: Database["public"]["Enums"]["material_uom"] | null
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
      is_operator: { Args: { _user_id: string }; Returns: boolean }
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
        | "purchase"
        | "store"
        | "fabrication"
        | "innovation_head"
      approval_status: "draft" | "pending" | "approved" | "rejected"
      entity_status: "active" | "inactive"
      inventory_txn_type:
        | "opening"
        | "purchase"
        | "fabrication"
        | "adjustment"
        | "return"
      material_uom: "PCS" | "MTR" | "SET"
      po_status: "open" | "partial" | "completed" | "cancelled"
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
        "purchase",
        "store",
        "fabrication",
        "innovation_head",
      ],
      approval_status: ["draft", "pending", "approved", "rejected"],
      entity_status: ["active", "inactive"],
      inventory_txn_type: [
        "opening",
        "purchase",
        "fabrication",
        "adjustment",
        "return",
      ],
      material_uom: ["PCS", "MTR", "SET"],
      po_status: ["open", "partial", "completed", "cancelled"],
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
