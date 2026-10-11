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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line: string
          biteship_area_id: string | null
          city: string
          created_at: string
          district: string | null
          id: string
          is_default: boolean
          label: string | null
          latitude: number | null
          longitude: number | null
          note: string | null
          phone: string
          postal_code: string
          profile_id: string
          province: string
          recipient_name: string
          updated_at: string
        }
        Insert: {
          address_line: string
          biteship_area_id?: string | null
          city: string
          created_at?: string
          district?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          phone: string
          postal_code: string
          profile_id: string
          province: string
          recipient_name: string
          updated_at?: string
        }
        Update: {
          address_line?: string
          biteship_area_id?: string | null
          city?: string
          created_at?: string
          district?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          phone?: string
          postal_code?: string
          profile_id?: string
          province?: string
          recipient_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          quantity: number
          variant_id: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          quantity: number
          variant_id: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          quantity?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_internal_notes: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          note: string
          order_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          note: string
          order_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          note?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_internal_notes_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_internal_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          image_url_snapshot: string | null
          order_id: string
          price_at_purchase: number
          product_name_snapshot: string
          quantity: number
          variant_id: string
          variant_label_snapshot: string | null
          weight_gram_snapshot: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url_snapshot?: string | null
          order_id: string
          price_at_purchase: number
          product_name_snapshot: string
          quantity: number
          variant_id: string
          variant_label_snapshot?: string | null
          weight_gram_snapshot: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url_snapshot?: string | null
          order_id?: string
          price_at_purchase?: number
          product_name_snapshot?: string
          quantity?: number
          variant_id?: string
          variant_label_snapshot?: string | null
          weight_gram_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string
          event_key: string
          id: string
          order_id: string
          raw_payload: Json | null
          source: string
          status_type: string
          status_value: string
        }
        Insert: {
          created_at?: string
          event_key: string
          id?: string
          order_id: string
          raw_payload?: Json | null
          source: string
          status_type: string
          status_value: string
        }
        Update: {
          created_at?: string
          event_key?: string
          id?: string
          order_id?: string
          raw_payload?: Json | null
          source?: string
          status_type?: string
          status_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          attention_reason:
            | Database["public"]["Enums"]["attention_reason"]
            | null
          courier_code: string
          courier_service: string
          created_at: string
          customer_note: string | null
          expires_at: string
          id: string
          order_number: string
          paid_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          profile_id: string
          shipping_address_snapshot: Json
          shipping_cost: number
          shipping_status: Database["public"]["Enums"]["shipping_status"] | null
          subtotal: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          attention_reason?:
            | Database["public"]["Enums"]["attention_reason"]
            | null
          courier_code: string
          courier_service: string
          created_at?: string
          customer_note?: string | null
          expires_at: string
          id?: string
          order_number?: string
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          profile_id: string
          shipping_address_snapshot: Json
          shipping_cost?: number
          shipping_status?:
            | Database["public"]["Enums"]["shipping_status"]
            | null
          subtotal: number
          total_amount: number
          updated_at?: string
        }
        Update: {
          attention_reason?:
            | Database["public"]["Enums"]["attention_reason"]
            | null
          courier_code?: string
          courier_service?: string
          created_at?: string
          customer_note?: string | null
          expires_at?: string
          id?: string
          order_number?: string
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          profile_id?: string
          shipping_address_snapshot?: Json
          shipping_cost?: number
          shipping_status?:
            | Database["public"]["Enums"]["shipping_status"]
            | null
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          expires_at: string
          gateway: string
          gateway_order_id: string
          gateway_transaction_id: string | null
          id: string
          order_id: string
          payment_channel: string | null
          payment_type: string | null
          raw_response: Json | null
          snap_token: string | null
          status: Database["public"]["Enums"]["payment_attempt_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          expires_at: string
          gateway?: string
          gateway_order_id: string
          gateway_transaction_id?: string | null
          id?: string
          order_id: string
          payment_channel?: string | null
          payment_type?: string | null
          raw_response?: Json | null
          snap_token?: string | null
          status?: Database["public"]["Enums"]["payment_attempt_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          expires_at?: string
          gateway?: string
          gateway_order_id?: string
          gateway_transaction_id?: string | null
          id?: string
          order_id?: string
          payment_channel?: string | null
          payment_type?: string | null
          raw_response?: Json | null
          snap_token?: string | null
          status?: Database["public"]["Enums"]["payment_attempt_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          product_id: string
          sort_order: number
          storage_path: string
          variant_id: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number
          storage_path: string
          variant_id?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number
          storage_path?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_values: {
        Row: {
          id: string
          option_id: string
          sort_order: number
          value: string
        }
        Insert: {
          id?: string
          option_id: string
          sort_order?: number
          value: string
        }
        Update: {
          id?: string
          option_id?: string
          sort_order?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_option_values_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "product_options"
            referencedColumns: ["id"]
          },
        ]
      }
      product_options: {
        Row: {
          id: string
          name: string
          product_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          product_id: string
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variant_options: {
        Row: {
          option_value_id: string
          variant_id: string
        }
        Insert: {
          option_value_id: string
          variant_id: string
        }
        Update: {
          option_value_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_options_option_value_id_fkey"
            columns: ["option_value_id"]
            isOneToOne: false
            referencedRelation: "product_option_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_options_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          height_cm: number
          id: string
          is_active: boolean
          length_cm: number
          price: number
          product_id: string
          quantity: number
          sku: string
          updated_at: string
          weight_gram: number
          width_cm: number
        }
        Insert: {
          created_at?: string
          height_cm: number
          id?: string
          is_active?: boolean
          length_cm: number
          price: number
          product_id: string
          quantity?: number
          sku: string
          updated_at?: string
          weight_gram: number
          width_cm: number
        }
        Update: {
          created_at?: string
          height_cm?: number
          id?: string
          is_active?: boolean
          length_cm?: number
          price?: number
          product_id?: string
          quantity?: number
          sku?: string
          updated_at?: string
          weight_gram?: number
          width_cm?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          actual_delivery_date: string | null
          biteship_order_id: string | null
          courier_code: string | null
          courier_service: string | null
          created_at: string
          destination_address_snapshot: Json
          estimated_delivery_date: string | null
          id: string
          order_id: string
          origin_address_snapshot: Json
          updated_at: string
          waybill_id: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          biteship_order_id?: string | null
          courier_code?: string | null
          courier_service?: string | null
          created_at?: string
          destination_address_snapshot: Json
          estimated_delivery_date?: string | null
          id?: string
          order_id: string
          origin_address_snapshot: Json
          updated_at?: string
          waybill_id?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          biteship_order_id?: string | null
          courier_code?: string | null
          courier_service?: string | null
          created_at?: string
          destination_address_snapshot?: Json
          estimated_delivery_date?: string | null
          id?: string
          order_id?: string
          origin_address_snapshot?: Json
          updated_at?: string
          waybill_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          admin_id: string | null
          created_at: string
          delta: number
          id: string
          quantity_after: number
          reason: string
          variant_id: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          delta: number
          id?: string
          quantity_after: number
          reason: string
          variant_id: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          delta?: number
          id?: string
          quantity_after?: number
          reason?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_reservations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          order_id: string
          quantity: number
          status: Database["public"]["Enums"]["reservation_status"]
          updated_at: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          order_id: string
          quantity: number
          status?: Database["public"]["Enums"]["reservation_status"]
          updated_at?: string
          variant_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          order_id?: string
          quantity?: number
          status?: Database["public"]["Enums"]["reservation_status"]
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          address_line: string
          biteship_area_id: string
          city: string
          contact_name: string
          created_at: string
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          note: string | null
          phone: string
          postal_code: string
          province: string
          store_name: string
          updated_at: string
        }
        Insert: {
          address_line: string
          biteship_area_id: string
          city: string
          contact_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          phone: string
          postal_code: string
          province: string
          store_name: string
          updated_at?: string
        }
        Update: {
          address_line?: string
          biteship_area_id?: string
          city?: string
          contact_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          phone?: string
          postal_code?: string
          province?: string
          store_name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      product_listings: {
        Row: {
          category_id: string | null
          created_at: string | null
          id: string | null
          image_path: string | null
          name: string | null
          price_max: number | null
          price_min: number | null
          slug: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_adjust_stock: {
        Args: { p_delta: number; p_reason: string; p_variant_id: string }
        Returns: number
      }
      admin_create_product: { Args: { payload: Json }; Returns: string }
      admin_get_stock: {
        Args: { variant_ids: string[] }
        Returns: {
          available: number
          quantity: number
          reserved: number
          variant_id: string
        }[]
      }
      admin_set_role: {
        Args: {
          p_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      admin_update_product: {
        Args: { p_product_id: string; payload: Json }
        Returns: undefined
      }
      cancel_order: {
        Args: { p_order_id: string }
        Returns: {
          attention_reason:
            | Database["public"]["Enums"]["attention_reason"]
            | null
          courier_code: string
          courier_service: string
          created_at: string
          customer_note: string | null
          expires_at: string
          id: string
          order_number: string
          paid_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          profile_id: string
          shipping_address_snapshot: Json
          shipping_cost: number
          shipping_status: Database["public"]["Enums"]["shipping_status"] | null
          subtotal: number
          total_amount: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_payment: {
        Args: { p_order_id: string }
        Returns: {
          attention_reason:
            | Database["public"]["Enums"]["attention_reason"]
            | null
          courier_code: string
          courier_service: string
          created_at: string
          customer_note: string | null
          expires_at: string
          id: string
          order_number: string
          paid_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          profile_id: string
          shipping_address_snapshot: Json
          shipping_cost: number
          shipping_status: Database["public"]["Enums"]["shipping_status"] | null
          subtotal: number
          total_amount: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_order: {
        Args: {
          p_address_id: string
          p_courier_code: string
          p_courier_service: string
          p_customer_note?: string
          p_profile_id: string
          p_shipping_cost: number
        }
        Returns: {
          attention_reason:
            | Database["public"]["Enums"]["attention_reason"]
            | null
          courier_code: string
          courier_service: string
          created_at: string
          customer_note: string | null
          expires_at: string
          id: string
          order_number: string
          paid_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          profile_id: string
          shipping_address_snapshot: Json
          shipping_cost: number
          shipping_status: Database["public"]["Enums"]["shipping_status"] | null
          subtotal: number
          total_amount: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      expire_pending_orders: { Args: never; Returns: number }
      get_or_create_cart: { Args: never; Returns: string }
      get_variant_availability: {
        Args: { variant_ids: string[] }
        Returns: {
          available: number
          variant_id: string
        }[]
      }
      merge_guest_cart: { Args: { items: Json }; Returns: undefined }
      release_reservations: { Args: { p_order_id: string }; Returns: number }
    }
    Enums: {
      attention_reason:
        | "late_payment_out_of_stock"
        | "shipment_create_failed"
        | "amount_mismatch"
        | "duplicate_payment"
      payment_attempt_status:
        | "pending"
        | "settlement"
        | "capture"
        | "deny"
        | "cancel"
        | "expire"
        | "failure"
        | "refund"
      payment_status:
        | "pending_payment"
        | "paid"
        | "expired"
        | "failed"
        | "cancelled"
        | "refunded"
      reservation_status: "reserved" | "confirmed" | "released"
      shipping_status:
        | "pending"
        | "processing"
        | "shipped"
        | "delivered"
        | "returned"
        | "cancelled"
      user_role: "customer" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      attention_reason: [
        "late_payment_out_of_stock",
        "shipment_create_failed",
        "amount_mismatch",
        "duplicate_payment",
      ],
      payment_attempt_status: [
        "pending",
        "settlement",
        "capture",
        "deny",
        "cancel",
        "expire",
        "failure",
        "refund",
      ],
      payment_status: [
        "pending_payment",
        "paid",
        "expired",
        "failed",
        "cancelled",
        "refunded",
      ],
      reservation_status: ["reserved", "confirmed", "released"],
      shipping_status: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "returned",
        "cancelled",
      ],
      user_role: ["customer", "admin"],
    },
  },
} as const
