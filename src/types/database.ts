export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '17.1';
  };
  public: {
    Tables: {
      items: {
        Row: {
          barcode: string | null;
          brand: string | null;
          confidence: number | null;
          created_at: string;
          emoji: string | null;
          expires_on: string;
          expiry_source: Database['public']['Enums']['expiry_source'];
          id: string;
          image_url: string | null;
          name: string;
          purchased_on: string;
          quantity: number;
          receipt_id: string | null;
          status: Database['public']['Enums']['item_status'];
          storage: Database['public']['Enums']['storage_location'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          barcode?: string | null;
          brand?: string | null;
          confidence?: number | null;
          created_at?: string;
          emoji?: string | null;
          expires_on: string;
          expiry_source?: Database['public']['Enums']['expiry_source'];
          id?: string;
          image_url?: string | null;
          name: string;
          purchased_on: string;
          quantity?: number;
          receipt_id?: string | null;
          status?: Database['public']['Enums']['item_status'];
          storage?: Database['public']['Enums']['storage_location'];
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          barcode?: string | null;
          brand?: string | null;
          confidence?: number | null;
          created_at?: string;
          emoji?: string | null;
          expires_on?: string;
          expiry_source?: Database['public']['Enums']['expiry_source'];
          id?: string;
          image_url?: string | null;
          name?: string;
          purchased_on?: string;
          quantity?: number;
          receipt_id?: string | null;
          status?: Database['public']['Enums']['item_status'];
          storage?: Database['public']['Enums']['storage_location'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'items_receipt_id_user_id_fkey';
            columns: ['receipt_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'receipts';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      receipts: {
        Row: {
          id: string;
          item_count: number;
          scanned_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          item_count?: number;
          scanned_at?: string;
          user_id?: string;
        };
        Update: {
          id?: string;
          item_count?: number;
          scanned_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      shelf_life: {
        Row: {
          category: string | null;
          id: number;
          keywords: string[];
          max_days: number | null;
          min_days: number | null;
          name: string;
          source_id: number;
          storage: Database['public']['Enums']['storage_location'];
          subtitle: string | null;
          tips: string | null;
        };
        Insert: {
          category?: string | null;
          id?: never;
          keywords?: string[];
          max_days?: number | null;
          min_days?: number | null;
          name: string;
          source_id: number;
          storage: Database['public']['Enums']['storage_location'];
          subtitle?: string | null;
          tips?: string | null;
        };
        Update: {
          category?: string | null;
          id?: never;
          keywords?: string[];
          max_days?: number | null;
          min_days?: number | null;
          name?: string;
          source_id?: number;
          storage?: Database['public']['Enums']['storage_location'];
          subtitle?: string | null;
          tips?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      search_shelf_life: {
        Args: {
          max_results?: number;
          query: string;
          storage_filter?: Database['public']['Enums']['storage_location'];
        };
        Returns: {
          category: string | null;
          id: number;
          keywords: string[];
          max_days: number | null;
          min_days: number | null;
          name: string;
          source_id: number;
          storage: Database['public']['Enums']['storage_location'];
          subtitle: string | null;
          tips: string | null;
        }[];
        SetofOptions: {
          from: '*';
          to: 'shelf_life';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
    };
    Enums: {
      expiry_source: 'ai' | 'foodkeeper' | 'manual';
      item_status: 'active' | 'consumed' | 'discarded';
      storage_location: 'fridge' | 'freezer' | 'pantry';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      expiry_source: ['ai', 'foodkeeper', 'manual'],
      item_status: ['active', 'consumed', 'discarded'],
      storage_location: ['fridge', 'freezer', 'pantry'],
    },
  },
} as const;
