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
      abandoned_carts: {
        Row: {
          created_at: string
          customer_document: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          product_id: string | null
          product_variant: string | null
          session_id: string | null
          total: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_document?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          product_id?: string | null
          product_variant?: string | null
          session_id?: string | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_document?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          product_id?: string | null
          product_variant?: string | null
          session_id?: string | null
          total?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      checkout_builder_config: {
        Row: {
          config: Json
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      checkout_settings: {
        Row: {
          checkout_button_text: string
          checkout_header_text: string
          checkout_security_text: string
          created_at: string
          id: string
          pix_expiration_minutes: number
          pix_instruction_text: string
          pix_payment_title: string
          updated_at: string
        }
        Insert: {
          checkout_button_text?: string
          checkout_header_text?: string
          checkout_security_text?: string
          created_at?: string
          id?: string
          pix_expiration_minutes?: number
          pix_instruction_text?: string
          pix_payment_title?: string
          updated_at?: string
        }
        Update: {
          checkout_button_text?: string
          checkout_header_text?: string
          checkout_security_text?: string
          created_at?: string
          id?: string
          pix_expiration_minutes?: number
          pix_instruction_text?: string
          pix_payment_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gateway_settings: {
        Row: {
          active: boolean | null
          created_at: string
          gateway_name: string
          id: string
          public_key: string | null
          secret_key: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          gateway_name?: string
          id?: string
          public_key?: string | null
          secret_key?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          gateway_name?: string
          id?: string
          public_key?: string | null
          secret_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_bump_products: {
        Row: {
          created_at: string
          id: string
          order_bump_id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_bump_id: string
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_bump_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_bump_products_order_bump_id_fkey"
            columns: ["order_bump_id"]
            isOneToOne: false
            referencedRelation: "order_bumps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_bump_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_bumps: {
        Row: {
          active: boolean | null
          apply_to_all: boolean
          auto_add: boolean
          bump_type: string
          created_at: string
          id: string
          image_url: string | null
          mandatory: boolean
          max_cart_value: number
          max_quantity: number
          min_cart_value: number
          original_price: number | null
          position: number
          price: number
          product_id: string | null
          sort_order: number | null
          title: string
        }
        Insert: {
          active?: boolean | null
          apply_to_all?: boolean
          auto_add?: boolean
          bump_type?: string
          created_at?: string
          id?: string
          image_url?: string | null
          mandatory?: boolean
          max_cart_value?: number
          max_quantity?: number
          min_cart_value?: number
          original_price?: number | null
          position?: number
          price?: number
          product_id?: string | null
          sort_order?: number | null
          title: string
        }
        Update: {
          active?: boolean | null
          apply_to_all?: boolean
          auto_add?: boolean
          bump_type?: string
          created_at?: string
          id?: string
          image_url?: string | null
          mandatory?: boolean
          max_cart_value?: number
          max_quantity?: number
          min_cart_value?: number
          original_price?: number | null
          position?: number
          price?: number
          product_id?: string | null
          sort_order?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_bumps_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          bumps_total: number | null
          created_at: string
          customer_document: string
          customer_email: string
          customer_name: string
          customer_phone: string
          id: string
          payment_method: string
          payment_status: string
          pix_copied: boolean | null
          pix_copy_paste: string | null
          pix_expires_at: string | null
          pix_qr_code: string | null
          pix_qr_code_base64: string | null
          product_id: string | null
          product_variant: string | null
          quantity: number
          selected_bumps: Json | null
          shipping_cost: number | null
          shipping_option_id: string | null
          subtotal: number
          total: number
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          bumps_total?: number | null
          created_at?: string
          customer_document: string
          customer_email: string
          customer_name: string
          customer_phone: string
          id?: string
          payment_method?: string
          payment_status?: string
          pix_copied?: boolean | null
          pix_copy_paste?: string | null
          pix_expires_at?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          product_id?: string | null
          product_variant?: string | null
          quantity?: number
          selected_bumps?: Json | null
          shipping_cost?: number | null
          shipping_option_id?: string | null
          subtotal: number
          total: number
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          bumps_total?: number | null
          created_at?: string
          customer_document?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          payment_method?: string
          payment_status?: string
          pix_copied?: boolean | null
          pix_copy_paste?: string | null
          pix_expires_at?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          product_id?: string | null
          product_variant?: string | null
          quantity?: number
          selected_bumps?: Json | null
          shipping_cost?: number | null
          shipping_option_id?: string | null
          subtotal?: number
          total?: number
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_option_id_fkey"
            columns: ["shipping_option_id"]
            isOneToOne: false
            referencedRelation: "shipping_options"
            referencedColumns: ["id"]
          },
        ]
      }
      page_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          page_url: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          page_url?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          page_url?: string | null
          session_id?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          product_id: string
          sort_order: number | null
          url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number | null
          url: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          product_id: string
          sort_order: number | null
          thumbnail_url: string | null
          variant_group_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          product_id: string
          sort_order?: number | null
          thumbnail_url?: string | null
          variant_group_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          product_id?: string
          sort_order?: number | null
          thumbnail_url?: string | null
          variant_group_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_variant_group_id_fkey"
            columns: ["variant_group_id"]
            isOneToOne: false
            referencedRelation: "variant_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          checkout_type: string
          created_at: string
          description: string | null
          discount_percent: number
          estimated_delivery: string | null
          external_checkout_url: string | null
          flash_sale: boolean | null
          flash_sale_ends_in: string | null
          free_shipping: boolean | null
          id: string
          original_price: number
          promo_tag: string | null
          rating: number | null
          review_count: number | null
          sale_price: number
          shipping_cost: number | null
          slug: string
          sold_count: number | null
          sort_order: number | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          active?: boolean | null
          checkout_type?: string
          created_at?: string
          description?: string | null
          discount_percent?: number
          estimated_delivery?: string | null
          external_checkout_url?: string | null
          flash_sale?: boolean | null
          flash_sale_ends_in?: string | null
          free_shipping?: boolean | null
          id?: string
          original_price: number
          promo_tag?: string | null
          rating?: number | null
          review_count?: number | null
          sale_price: number
          shipping_cost?: number | null
          slug: string
          sold_count?: number | null
          sort_order?: number | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          active?: boolean | null
          checkout_type?: string
          created_at?: string
          description?: string | null
          discount_percent?: number
          estimated_delivery?: string | null
          external_checkout_url?: string | null
          flash_sale?: boolean | null
          flash_sale_ends_in?: string | null
          free_shipping?: boolean | null
          id?: string
          original_price?: number
          promo_tag?: string | null
          rating?: number | null
          review_count?: number | null
          sale_price?: number
          shipping_cost?: number | null
          slug?: string
          sold_count?: number | null
          sort_order?: number | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          active: boolean | null
          city: string | null
          comment: string | null
          created_at: string
          id: string
          photos: string[] | null
          product_id: string
          rating: number
          review_date: string | null
          updated_at: string
          user_avatar_url: string | null
          user_name: string
        }
        Insert: {
          active?: boolean | null
          city?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          photos?: string[] | null
          product_id: string
          rating?: number
          review_date?: string | null
          updated_at?: string
          user_avatar_url?: string | null
          user_name: string
        }
        Update: {
          active?: boolean | null
          city?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          photos?: string[] | null
          product_id?: string
          rating?: number
          review_date?: string | null
          updated_at?: string
          user_avatar_url?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_options: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          estimated_days: string | null
          free: boolean | null
          id: string
          logo_url: string | null
          name: string
          price: number
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          estimated_days?: string | null
          free?: boolean | null
          id?: string
          logo_url?: string | null
          name: string
          price?: number
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          estimated_days?: string | null
          free?: boolean | null
          id?: string
          logo_url?: string | null
          name?: string
          price?: number
          sort_order?: number | null
        }
        Relationships: []
      }
      store_products: {
        Row: {
          created_at: string
          id: string
          product_id: string
          sort_order: number | null
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number | null
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          avatar_url: string | null
          checkout_logo_url: string | null
          created_at: string
          id: string
          name: string
          product_page_logo_url: string | null
          rating: number | null
          total_sales: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          checkout_logo_url?: string | null
          created_at?: string
          id?: string
          name?: string
          product_page_logo_url?: string | null
          rating?: number | null
          total_sales?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          checkout_logo_url?: string | null
          created_at?: string
          id?: string
          name?: string
          product_page_logo_url?: string | null
          rating?: number | null
          total_sales?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          rating: number | null
          slug: string
          sort_order: number | null
          total_sales: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          rating?: number | null
          slug: string
          sort_order?: number | null
          total_sales?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          rating?: number | null
          slug?: string
          sort_order?: number | null
          total_sales?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tracking_pixels: {
        Row: {
          active: boolean | null
          created_at: string
          id: string
          pixel_id: string
          platform: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          id?: string
          pixel_id: string
          platform?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          id?: string
          pixel_id?: string
          platform?: string
        }
        Relationships: []
      }
      trust_badges: {
        Row: {
          active: boolean | null
          color: string | null
          created_at: string
          description: string | null
          icon: string
          id: string
          sort_order: number | null
          title: string
        }
        Insert: {
          active?: boolean | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          sort_order?: number | null
          title: string
        }
        Update: {
          active?: boolean | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
      variant_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          product_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          product_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "variant_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_sessions: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          page_url: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          page_url?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          page_url?: string | null
          session_id?: string
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
