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
      conversations: {
        Row: {
          admin_last_read_at: string | null
          admin_notified_at: string | null
          created_at: string
          customer_id: string
          customer_last_read_at: string | null
          customer_notified_at: string | null
          id: string
          last_message_at: string
          last_message_preview: string
          last_sender: Database["public"]["Enums"]["message_sender"] | null
          order_id: string | null
          status: Database["public"]["Enums"]["conversation_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          admin_last_read_at?: string | null
          admin_notified_at?: string | null
          created_at?: string
          customer_id: string
          customer_last_read_at?: string | null
          customer_notified_at?: string | null
          id?: string
          last_message_at?: string
          last_message_preview?: string
          last_sender?: Database["public"]["Enums"]["message_sender"] | null
          order_id?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          admin_last_read_at?: string | null
          admin_notified_at?: string | null
          created_at?: string
          customer_id?: string
          customer_last_read_at?: string | null
          customer_notified_at?: string | null
          id?: string
          last_message_at?: string
          last_message_preview?: string
          last_sender?: Database["public"]["Enums"]["message_sender"] | null
          order_id?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string | null
          sender_role: Database["public"]["Enums"]["message_sender"]
        }
        Insert: {
          attachments?: Json
          body?: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_role: Database["public"]["Enums"]["message_sender"]
        }
        Update: {
          attachments?: Json
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_role?: Database["public"]["Enums"]["message_sender"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          preorder_days_snapshot: number | null
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
          preorder_days_snapshot?: number | null
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
          preorder_days_snapshot?: number | null
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
          review_prompt_dismissed_at: string | null
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
          review_prompt_dismissed_at?: string | null
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
          review_prompt_dismissed_at?: string | null
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
      product_comments: {
        Row: {
          body: string
          created_at: string
          hidden_at: string | null
          hidden_by: string | null
          id: string
          is_hidden: boolean
          parent_id: string | null
          product_id: string
          profile_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          is_hidden?: boolean
          parent_id?: string | null
          product_id: string
          profile_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          is_hidden?: boolean
          parent_id?: string | null
          product_id?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_comments_hidden_by_fkey"
            columns: ["hidden_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_comments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_comments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_comments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          description_doc: Json | null
          id: string
          is_active: boolean
          is_preorder: boolean
          name: string
          preorder_days: number | null
          rating_avg: number
          rating_count: number
          slug: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          description_doc?: Json | null
          id?: string
          is_active?: boolean
          is_preorder?: boolean
          name: string
          preorder_days?: number | null
          rating_avg?: number
          rating_count?: number
          slug: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          description_doc?: Json | null
          id?: string
          is_active?: boolean
          is_preorder?: boolean
          name?: string
          preorder_days?: number | null
          rating_avg?: number
          rating_count?: number
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
      refunds: {
        Row: {
          account_holder: string | null
          account_number: string | null
          amount: number
          bank_name: string | null
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          order_id: string
          processed_at: string | null
          processed_by: string | null
          proof_path: string | null
          reason: string
          requested_by: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["refund_status"]
          updated_at: string
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          amount: number
          bank_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id: string
          processed_at?: string | null
          processed_by?: string | null
          proof_path?: string | null
          reason: string
          requested_by: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          amount?: number
          bank_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id?: string
          processed_at?: string | null
          processed_by?: string | null
          proof_path?: string | null
          reason?: string
          requested_by?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_photos: {
        Row: {
          created_at: string
          id: string
          review_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          review_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_photos_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_products: {
        Row: {
          product_id: string
          review_id: string
          variant_label: string | null
        }
        Insert: {
          product_id: string
          review_id: string
          variant_label?: string | null
        }
        Update: {
          product_id?: string
          review_id?: string
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_products_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          admin_reply: string | null
          admin_reply_at: string | null
          admin_reply_by: string | null
          body: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          order_id: string | null
          profile_id: string | null
          rating: number
          reviewer_name: string
          source: Database["public"]["Enums"]["review_source"]
        }
        Insert: {
          admin_reply?: string | null
          admin_reply_at?: string | null
          admin_reply_by?: string | null
          body?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          order_id?: string | null
          profile_id?: string | null
          rating: number
          reviewer_name: string
          source?: Database["public"]["Enums"]["review_source"]
        }
        Update: {
          admin_reply?: string | null
          admin_reply_at?: string | null
          admin_reply_by?: string | null
          body?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          order_id?: string | null
          profile_id?: string | null
          rating?: number
          reviewer_name?: string
          source?: Database["public"]["Enums"]["review_source"]
        }
        Relationships: [
          {
            foreignKeyName: "reviews_admin_reply_by_fkey"
            columns: ["admin_reply_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          tracking_id: string | null
          tracking_url: string | null
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
          tracking_id?: string | null
          tracking_url?: string | null
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
          tracking_id?: string | null
          tracking_url?: string | null
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
          email: string | null
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
          email?: string | null
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
          email?: string | null
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
          is_preorder: boolean | null
          name: string | null
          preorder_days: number | null
          price_max: number | null
          price_min: number | null
          rating_avg: number | null
          rating_count: number | null
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
      admin_cron_health: {
        Args: never
        Returns: {
          active: boolean
          failures_24h: number
          job_name: string
          last_message: string
          last_run_at: string
          last_status: string
          schedule: string
        }[]
      }
      admin_dashboard_stats: {
        Args: { p_days?: number; p_low_stock?: number }
        Returns: Json
      }
      admin_delete_comment: {
        Args: { p_comment_id: string }
        Returns: undefined
      }
      admin_delete_review: { Args: { p_review_id: string }; Returns: undefined }
      admin_get_stock: {
        Args: { variant_ids: string[] }
        Returns: {
          available: number
          quantity: number
          reserved: number
          variant_id: string
        }[]
      }
      admin_import_review: {
        Args: {
          p_body?: string
          p_created_at?: string
          p_photo_paths?: string[]
          p_product_id: string
          p_rating: number
          p_reviewer_name: string
          p_variant_label?: string
        }
        Returns: string
      }
      admin_list_comments: {
        Args: {
          p_filter?: string
          p_limit?: number
          p_offset?: number
          p_product_id?: string
          p_q?: string
        }
        Returns: {
          answered: boolean
          author_email: string
          author_name: string
          body: string
          created_at: string
          id: string
          is_hidden: boolean
          product_id: string
          product_name: string
          product_slug: string
          replies: Json
          total_count: number
        }[]
      }
      admin_list_conversations: {
        Args: {
          p_before_at?: string
          p_before_id?: string
          p_filter?: string
          p_kind?: string
          p_limit?: number
          p_q?: string
        }
        Returns: {
          customer_email: string
          customer_id: string
          customer_name: string
          id: string
          last_message_at: string
          last_message_preview: string
          last_sender: Database["public"]["Enums"]["message_sender"]
          needs_reply: boolean
          order_id: string
          order_number: string
          status: Database["public"]["Enums"]["conversation_status"]
          subject: string
          unread: boolean
        }[]
      }
      admin_list_users: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_query?: string
          p_role?: Database["public"]["Enums"]["user_role"]
        }
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          last_sign_in_at: string
          order_count: number
          phone: string
          role: Database["public"]["Enums"]["user_role"]
          total_count: number
        }[]
      }
      admin_reply_review: {
        Args: { p_reply: string; p_review_id: string }
        Returns: undefined
      }
      admin_set_comment_hidden: {
        Args: { p_comment_id: string; p_hidden: boolean }
        Returns: undefined
      }
      admin_set_role: {
        Args: {
          p_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      admin_unanswered_comment_count: { Args: never; Returns: number }
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
          review_prompt_dismissed_at: string | null
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
      cancel_paid_order: {
        Args: { p_order_id: string; p_reason: string; p_restock?: boolean }
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
          review_prompt_dismissed_at: string | null
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
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      claim_chat_email: {
        Args: { p_conversation_id: string; p_recipient: string }
        Returns: boolean
      }
      complete_refund: {
        Args: { p_note: string; p_order_id: string; p_proof_path: string }
        Returns: {
          account_holder: string | null
          account_number: string | null
          amount: number
          bank_name: string | null
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          order_id: string
          processed_at: string | null
          processed_by: string | null
          proof_path: string | null
          reason: string
          requested_by: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["refund_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "refunds"
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
          review_prompt_dismissed_at: string | null
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
          review_prompt_dismissed_at: string | null
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
      dismiss_review_prompt: {
        Args: { p_order_id: string }
        Returns: undefined
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
      list_product_comments: {
        Args: {
          p_before_at?: string
          p_before_id?: string
          p_limit?: number
          p_product_id: string
        }
        Returns: {
          author_is_admin: boolean
          author_name: string
          body: string
          created_at: string
          id: string
          replies: Json
        }[]
      }
      list_product_reviews: {
        Args: {
          p_before_at?: string
          p_before_id?: string
          p_limit?: number
          p_product_id: string
          p_rating?: number
        }
        Returns: {
          admin_reply: string
          admin_reply_at: string
          body: string
          created_at: string
          id: string
          photos: string[]
          rating: number
          reviewer_name: string
          variant_label: string
        }[]
      }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      merge_guest_cart: { Args: { items: Json }; Returns: string }
      my_order_review: {
        Args: { p_order_id: string }
        Returns: {
          admin_reply: string
          body: string
          created_at: string
          photos: string[]
          rating: number
        }[]
      }
      pending_review_orders: {
        Args: { p_prompt_only?: boolean }
        Returns: {
          delivered_at: string
          items: Json
          order_id: string
          order_number: string
        }[]
      }
      post_product_comment: {
        Args: { p_body: string; p_parent_id?: string; p_product_id: string }
        Returns: string
      }
      post_system_message: {
        Args: { p_body: string; p_order_id: string }
        Returns: {
          attachments: Json
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string | null
          sender_role: Database["public"]["Enums"]["message_sender"]
        }
        SetofOptions: {
          from: "*"
          to: "messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      product_comment_count: { Args: { p_product_id: string }; Returns: number }
      product_rating_summary: {
        Args: { p_product_id: string }
        Returns: {
          distribution: Json
          rating_avg: number
          rating_count: number
        }[]
      }
      public_store_info: {
        Args: never
        Returns: {
          address_line: string
          city: string
          email: string
          phone: string
          postal_code: string
          province: string
          store_name: string
        }[]
      }
      release_reservations: { Args: { p_order_id: string }; Returns: number }
      send_message: {
        Args: {
          p_attachments?: Json
          p_body: string
          p_conversation_id: string
        }
        Returns: {
          attachments: Json
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string | null
          sender_role: Database["public"]["Enums"]["message_sender"]
        }
        SetofOptions: {
          from: "*"
          to: "messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_conversation_status: {
        Args: {
          p_conversation_id: string
          p_status: Database["public"]["Enums"]["conversation_status"]
        }
        Returns: {
          admin_last_read_at: string | null
          admin_notified_at: string | null
          created_at: string
          customer_id: string
          customer_last_read_at: string | null
          customer_notified_at: string | null
          id: string
          last_message_at: string
          last_message_preview: string
          last_sender: Database["public"]["Enums"]["message_sender"] | null
          order_id: string | null
          status: Database["public"]["Enums"]["conversation_status"]
          subject: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_refund_account: {
        Args: {
          p_account_holder: string
          p_account_number: string
          p_bank_name: string
          p_order_id: string
        }
        Returns: {
          account_holder: string | null
          account_number: string | null
          amount: number
          bank_name: string | null
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          order_id: string
          processed_at: string | null
          processed_by: string | null
          proof_path: string | null
          reason: string
          requested_by: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["refund_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "refunds"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_conversation: {
        Args: { p_order_id?: string; p_subject: string }
        Returns: {
          admin_last_read_at: string | null
          admin_notified_at: string | null
          created_at: string
          customer_id: string
          customer_last_read_at: string | null
          customer_notified_at: string | null
          id: string
          last_message_at: string
          last_message_preview: string
          last_sender: Database["public"]["Enums"]["message_sender"] | null
          order_id: string | null
          status: Database["public"]["Enums"]["conversation_status"]
          subject: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_order_review: {
        Args: {
          p_body?: string
          p_order_id: string
          p_photo_paths?: string[]
          p_rating: number
        }
        Returns: string
      }
      unread_conversation_count: { Args: never; Returns: number }
    }
    Enums: {
      attention_reason:
        | "late_payment_out_of_stock"
        | "shipment_create_failed"
        | "amount_mismatch"
        | "duplicate_payment"
      conversation_status: "open" | "closed"
      message_sender: "customer" | "admin" | "system"
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
        | "refund_pending"
        | "expired"
        | "failed"
        | "cancelled"
        | "refunded"
      refund_status: "awaiting_account" | "pending_transfer" | "completed"
      reservation_status: "reserved" | "confirmed" | "released"
      review_source: "customer" | "imported"
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
      conversation_status: ["open", "closed"],
      message_sender: ["customer", "admin", "system"],
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
        "refund_pending",
        "expired",
        "failed",
        "cancelled",
        "refunded",
      ],
      refund_status: ["awaiting_account", "pending_transfer", "completed"],
      reservation_status: ["reserved", "confirmed", "released"],
      review_source: ["customer", "imported"],
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
