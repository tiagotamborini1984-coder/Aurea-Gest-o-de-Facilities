// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.4'
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action_type: string
          client_id: string
          created_at: string
          details: string | null
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          client_id: string
          created_at?: string
          details?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          client_id?: string
          created_at?: string
          details?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_logs_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      clients: {
        Row: {
          admin_name: string
          created_at: string
          id: string
          logo_url: string | null
          modules: Json
          name: string
          primary_color: string | null
          secondary_color: string | null
          status: string
          updated_at: string
          url_slug: string
        }
        Insert: {
          admin_name?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          modules?: Json
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          status?: string
          updated_at?: string
          url_slug: string
        }
        Update: {
          admin_name?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          modules?: Json
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          status?: string
          updated_at?: string
          url_slug?: string
        }
        Relationships: []
      }
      contracted_headcount: {
        Row: {
          client_id: string
          created_at: string
          equipment_id: string | null
          function_id: string | null
          id: string
          location_id: string | null
          plant_id: string
          quantity: number
          type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          equipment_id?: string | null
          function_id?: string | null
          id?: string
          location_id?: string | null
          plant_id: string
          quantity?: number
          type: string
        }
        Update: {
          client_id?: string
          created_at?: string
          equipment_id?: string | null
          function_id?: string | null
          id?: string
          location_id?: string | null
          plant_id?: string
          quantity?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'contracted_headcount_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'contracted_headcount_equipment_id_fkey'
            columns: ['equipment_id']
            isOneToOne: false
            referencedRelation: 'equipment'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'contracted_headcount_function_id_fkey'
            columns: ['function_id']
            isOneToOne: false
            referencedRelation: 'functions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'contracted_headcount_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'contracted_headcount_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
            referencedColumns: ['id']
          },
        ]
      }
      daily_logs: {
        Row: {
          client_id: string
          created_at: string
          date: string
          id: string
          plant_id: string
          reference_id: string
          status: boolean
          type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          date: string
          id?: string
          plant_id: string
          reference_id: string
          status?: boolean
          type: string
        }
        Update: {
          client_id?: string
          created_at?: string
          date?: string
          id?: string
          plant_id?: string
          reference_id?: string
          status?: boolean
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'daily_logs_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'daily_logs_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
            referencedColumns: ['id']
          },
        ]
      }
      employees: {
        Row: {
          client_id: string
          company_name: string
          created_at: string
          function_id: string | null
          id: string
          location_id: string | null
          name: string
          plant_id: string
        }
        Insert: {
          client_id: string
          company_name: string
          created_at?: string
          function_id?: string | null
          id?: string
          location_id?: string | null
          name: string
          plant_id: string
        }
        Update: {
          client_id?: string
          company_name?: string
          created_at?: string
          function_id?: string | null
          id?: string
          location_id?: string | null
          name?: string
          plant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'employees_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employees_function_id_fkey'
            columns: ['function_id']
            isOneToOne: false
            referencedRelation: 'functions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employees_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employees_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
            referencedColumns: ['id']
          },
        ]
      }
      equipment: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
          plant_id: string
          quantity: number
          type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
          plant_id: string
          quantity?: number
          type: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          plant_id?: string
          quantity?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'equipment_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'equipment_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
            referencedColumns: ['id']
          },
        ]
      }
      functions: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'functions_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      goals_book: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'goals_book_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      locations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          plant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          plant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          plant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'locations_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
            referencedColumns: ['id']
          },
        ]
      }
      monthly_goals_data: {
        Row: {
          client_id: string
          created_at: string
          goal_id: string
          id: string
          plant_id: string
          reference_month: string
          value: number
        }
        Insert: {
          client_id: string
          created_at?: string
          goal_id: string
          id?: string
          plant_id: string
          reference_month: string
          value?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          goal_id?: string
          id?: string
          plant_id?: string
          reference_month?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: 'monthly_goals_data_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'monthly_goals_data_goal_id_fkey'
            columns: ['goal_id']
            isOneToOne: false
            referencedRelation: 'goals_book'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'monthly_goals_data_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
            referencedColumns: ['id']
          },
        ]
      }
      plants: {
        Row: {
          city: string
          client_id: string
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          city: string
          client_id: string
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          city?: string
          client_id?: string
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'plants_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          accessible_menus: Json | null
          authorized_plants: Json | null
          client_id: string | null
          created_at: string
          email: string
          force_password_change: boolean | null
          id: string
          name: string
          role: string
        }
        Insert: {
          accessible_menus?: Json | null
          authorized_plants?: Json | null
          client_id?: string | null
          created_at?: string
          email: string
          force_password_change?: boolean | null
          id: string
          name: string
          role?: string
        }
        Update: {
          accessible_menus?: Json | null
          authorized_plants?: Json | null
          client_id?: string | null
          created_at?: string
          email?: string
          force_password_change?: boolean | null
          id?: string
          name?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// ====== DATABASE EXTENDED CONTEXT (auto-generated) ======
// This section contains actual PostgreSQL column types, constraints, RLS policies,
// functions, triggers, indexes and materialized views not present in the type definitions above.
// IMPORTANT: The TypeScript types above map UUID, TEXT, VARCHAR all to "string".
// Use the COLUMN TYPES section below to know the real PostgreSQL type for each column.
// Always use the correct PostgreSQL type when writing SQL migrations.

// --- COLUMN TYPES (actual PostgreSQL types) ---
// Use this to know the real database type when writing migrations.
// "string" in TypeScript types above may be uuid, text, varchar, timestamptz, etc.
// Table: audit_logs
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   user_id: uuid (not null)
//   action_type: text (not null)
//   details: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
// Table: clients
//   id: uuid (not null, default: gen_random_uuid())
//   name: text (not null)
//   url_slug: text (not null)
//   admin_name: text (not null, default: ''::text)
//   logo_url: text (nullable)
//   primary_color: text (nullable, default: '#1e293b'::text)
//   secondary_color: text (nullable, default: '#0ea5e9'::text)
//   status: text (not null, default: 'Ativo'::text)
//   modules: jsonb (not null, default: '[]'::jsonb)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
// Table: contracted_headcount
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   type: text (not null)
//   plant_id: uuid (not null)
//   location_id: uuid (nullable)
//   function_id: uuid (nullable)
//   equipment_id: uuid (nullable)
//   quantity: integer (not null, default: 0)
//   created_at: timestamp with time zone (not null, default: now())
// Table: daily_logs
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   date: date (not null)
//   plant_id: uuid (not null)
//   type: text (not null)
//   reference_id: uuid (not null)
//   status: boolean (not null, default: false)
//   created_at: timestamp with time zone (not null, default: now())
// Table: employees
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   plant_id: uuid (not null)
//   location_id: uuid (nullable)
//   function_id: uuid (nullable)
//   company_name: text (not null)
//   name: text (not null)
//   created_at: timestamp with time zone (not null, default: now())
// Table: equipment
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   plant_id: uuid (not null)
//   name: text (not null)
//   type: text (not null)
//   quantity: integer (not null, default: 1)
//   created_at: timestamp with time zone (not null, default: now())
// Table: functions
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   name: text (not null)
//   description: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
// Table: goals_book
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   name: text (not null)
//   description: text (nullable)
//   is_active: boolean (not null, default: true)
//   created_at: timestamp with time zone (not null, default: now())
// Table: locations
//   id: uuid (not null, default: gen_random_uuid())
//   plant_id: uuid (not null)
//   name: text (not null)
//   description: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
// Table: monthly_goals_data
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   plant_id: uuid (not null)
//   goal_id: uuid (not null)
//   reference_month: date (not null)
//   value: numeric (not null, default: 0)
//   created_at: timestamp with time zone (not null, default: now())
// Table: plants
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   name: text (not null)
//   code: text (not null)
//   city: text (not null)
//   created_at: timestamp with time zone (not null, default: now())
// Table: profiles
//   id: uuid (not null)
//   client_id: uuid (nullable)
//   name: text (not null)
//   email: text (not null)
//   role: text (not null, default: 'Operacional'::text)
//   accessible_menus: jsonb (nullable, default: '[]'::jsonb)
//   authorized_plants: jsonb (nullable, default: '[]'::jsonb)
//   force_password_change: boolean (nullable, default: false)
//   created_at: timestamp with time zone (not null, default: now())

// --- CONSTRAINTS ---
// Table: audit_logs
//   FOREIGN KEY audit_logs_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY audit_logs_pkey: PRIMARY KEY (id)
//   FOREIGN KEY audit_logs_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
// Table: clients
//   PRIMARY KEY clients_pkey: PRIMARY KEY (id)
//   UNIQUE clients_url_slug_key: UNIQUE (url_slug)
// Table: contracted_headcount
//   FOREIGN KEY contracted_headcount_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   FOREIGN KEY contracted_headcount_equipment_id_fkey: FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
//   FOREIGN KEY contracted_headcount_function_id_fkey: FOREIGN KEY (function_id) REFERENCES functions(id) ON DELETE CASCADE
//   FOREIGN KEY contracted_headcount_location_id_fkey: FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
//   PRIMARY KEY contracted_headcount_pkey: PRIMARY KEY (id)
//   FOREIGN KEY contracted_headcount_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
//   CHECK contracted_headcount_type_check: CHECK ((type = ANY (ARRAY['colaborador'::text, 'equipamento'::text])))
// Table: daily_logs
//   FOREIGN KEY daily_logs_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   UNIQUE daily_logs_date_type_reference_id_key: UNIQUE (date, type, reference_id)
//   PRIMARY KEY daily_logs_pkey: PRIMARY KEY (id)
//   FOREIGN KEY daily_logs_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
//   CHECK daily_logs_type_check: CHECK ((type = ANY (ARRAY['staff'::text, 'equipment'::text])))
// Table: employees
//   FOREIGN KEY employees_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   FOREIGN KEY employees_function_id_fkey: FOREIGN KEY (function_id) REFERENCES functions(id) ON DELETE SET NULL
//   FOREIGN KEY employees_location_id_fkey: FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
//   PRIMARY KEY employees_pkey: PRIMARY KEY (id)
//   FOREIGN KEY employees_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
// Table: equipment
//   FOREIGN KEY equipment_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY equipment_pkey: PRIMARY KEY (id)
//   FOREIGN KEY equipment_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
// Table: functions
//   FOREIGN KEY functions_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY functions_pkey: PRIMARY KEY (id)
// Table: goals_book
//   FOREIGN KEY goals_book_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY goals_book_pkey: PRIMARY KEY (id)
// Table: locations
//   PRIMARY KEY locations_pkey: PRIMARY KEY (id)
//   FOREIGN KEY locations_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
// Table: monthly_goals_data
//   FOREIGN KEY monthly_goals_data_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   FOREIGN KEY monthly_goals_data_goal_id_fkey: FOREIGN KEY (goal_id) REFERENCES goals_book(id) ON DELETE CASCADE
//   PRIMARY KEY monthly_goals_data_pkey: PRIMARY KEY (id)
//   FOREIGN KEY monthly_goals_data_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
//   UNIQUE monthly_goals_data_plant_id_goal_id_reference_month_key: UNIQUE (plant_id, goal_id, reference_month)
// Table: plants
//   FOREIGN KEY plants_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY plants_pkey: PRIMARY KEY (id)
// Table: profiles
//   FOREIGN KEY profiles_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   FOREIGN KEY profiles_id_fkey: FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
//   PRIMARY KEY profiles_pkey: PRIMARY KEY (id)

// --- ROW LEVEL SECURITY POLICIES ---
// Table: audit_logs
//   Policy "Allow authenticated full access on audit_logs" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: clients
//   Policy "Allow authenticated full access on clients" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: contracted_headcount
//   Policy "Allow authenticated full access on contracted_headcount" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: daily_logs
//   Policy "Allow authenticated full access on daily_logs" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: employees
//   Policy "Allow authenticated full access on employees" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: equipment
//   Policy "Allow authenticated full access on equipment" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: functions
//   Policy "Allow authenticated full access on functions" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: goals_book
//   Policy "Allow authenticated full access on goals_book" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: locations
//   Policy "Allow authenticated full access on locations" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: monthly_goals_data
//   Policy "Allow authenticated full access on monthly_goals_data" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: plants
//   Policy "Allow authenticated full access on plants" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: profiles
//   Policy "Allow authenticated full access on profiles" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true

// --- DATABASE FUNCTIONS ---
// FUNCTION handle_new_user()
//   CREATE OR REPLACE FUNCTION public.handle_new_user()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     INSERT INTO public.profiles (id, email, name, role)
//     VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 'Operacional');
//     RETURN NEW;
//   END;
//   $function$
//

// --- INDEXES ---
// Table: clients
//   CREATE UNIQUE INDEX clients_url_slug_key ON public.clients USING btree (url_slug)
// Table: daily_logs
//   CREATE UNIQUE INDEX daily_logs_date_type_reference_id_key ON public.daily_logs USING btree (date, type, reference_id)
// Table: monthly_goals_data
//   CREATE UNIQUE INDEX monthly_goals_data_plant_id_goal_id_reference_month_key ON public.monthly_goals_data USING btree (plant_id, goal_id, reference_month)
