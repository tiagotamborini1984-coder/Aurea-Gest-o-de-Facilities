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
      accidents: {
        Row: {
          client_id: string
          company_id: string | null
          created_at: string
          created_by: string | null
          department: string
          description: string
          event_date: string
          id: string
          location: string
          photos: Json | null
          plant_id: string
          severity: string
        }
        Insert: {
          client_id: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          department: string
          description: string
          event_date: string
          id?: string
          location: string
          photos?: Json | null
          plant_id: string
          severity: string
        }
        Update: {
          client_id?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          department?: string
          description?: string
          event_date?: string
          id?: string
          location?: string
          photos?: Json | null
          plant_id?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: 'accidents_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'accidents_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'accidents_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
            referencedColumns: ['id']
          },
        ]
      }
      audit_actions: {
        Row: {
          audit_id: string
          comments_required: boolean
          created_at: string
          evidence_required: boolean
          id: string
          order_index: number
          title: string
          weight: number
        }
        Insert: {
          audit_id: string
          comments_required?: boolean
          created_at?: string
          evidence_required?: boolean
          id?: string
          order_index?: number
          title: string
          weight?: number
        }
        Update: {
          audit_id?: string
          comments_required?: boolean
          created_at?: string
          evidence_required?: boolean
          id?: string
          order_index?: number
          title?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: 'audit_actions_audit_id_fkey'
            columns: ['audit_id']
            isOneToOne: false
            referencedRelation: 'audits'
            referencedColumns: ['id']
          },
        ]
      }
      audit_assignments: {
        Row: {
          assignee_id: string
          audit_id: string
          created_at: string
          id: string
          plant_id: string
        }
        Insert: {
          assignee_id: string
          audit_id: string
          created_at?: string
          id?: string
          plant_id: string
        }
        Update: {
          assignee_id?: string
          audit_id?: string
          created_at?: string
          id?: string
          plant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_assignments_assignee_id_fkey'
            columns: ['assignee_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_assignments_audit_id_fkey'
            columns: ['audit_id']
            isOneToOne: false
            referencedRelation: 'audits'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_assignments_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
            referencedColumns: ['id']
          },
        ]
      }
      audit_execution_answers: {
        Row: {
          action_id: string
          corrective_assignee_id: string | null
          corrective_due_date: string | null
          created_at: string
          evidence_url: string | null
          execution_id: string
          id: string
          observations: string | null
          score: number | null
        }
        Insert: {
          action_id: string
          corrective_assignee_id?: string | null
          corrective_due_date?: string | null
          created_at?: string
          evidence_url?: string | null
          execution_id: string
          id?: string
          observations?: string | null
          score?: number | null
        }
        Update: {
          action_id?: string
          corrective_assignee_id?: string | null
          corrective_due_date?: string | null
          created_at?: string
          evidence_url?: string | null
          execution_id?: string
          id?: string
          observations?: string | null
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'audit_execution_answers_action_id_fkey'
            columns: ['action_id']
            isOneToOne: false
            referencedRelation: 'audit_actions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_execution_answers_corrective_assignee_id_fkey'
            columns: ['corrective_assignee_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_execution_answers_execution_id_fkey'
            columns: ['execution_id']
            isOneToOne: false
            referencedRelation: 'audit_executions'
            referencedColumns: ['id']
          },
        ]
      }
      audit_executions: {
        Row: {
          assignee_id: string
          audit_id: string
          created_at: string
          final_score: number | null
          id: string
          max_score: number | null
          participants: string | null
          plant_id: string
          realization_date: string | null
          signatures: Json | null
          status: string
          task_id: string | null
        }
        Insert: {
          assignee_id: string
          audit_id: string
          created_at?: string
          final_score?: number | null
          id?: string
          max_score?: number | null
          participants?: string | null
          plant_id: string
          realization_date?: string | null
          signatures?: Json | null
          status?: string
          task_id?: string | null
        }
        Update: {
          assignee_id?: string
          audit_id?: string
          created_at?: string
          final_score?: number | null
          id?: string
          max_score?: number | null
          participants?: string | null
          plant_id?: string
          realization_date?: string | null
          signatures?: Json | null
          status?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'audit_executions_assignee_id_fkey'
            columns: ['assignee_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_executions_audit_id_fkey'
            columns: ['audit_id']
            isOneToOne: false
            referencedRelation: 'audits'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_executions_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_executions_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
        ]
      }
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
      audits: {
        Row: {
          advance_notice_days: number | null
          client_id: string
          created_at: string
          frequency: string
          id: string
          scoring_settings: Json | null
          sla_days: number | null
          start_date: string
          status: string
          title: string
          type: string
        }
        Insert: {
          advance_notice_days?: number | null
          client_id: string
          created_at?: string
          frequency?: string
          id?: string
          scoring_settings?: Json | null
          sla_days?: number | null
          start_date: string
          status?: string
          title: string
          type?: string
        }
        Update: {
          advance_notice_days?: number | null
          client_id?: string
          created_at?: string
          frequency?: string
          id?: string
          scoring_settings?: Json | null
          sla_days?: number | null
          start_date?: string
          status?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audits_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      budget_accounts: {
        Row: {
          client_id: string
          code: string | null
          created_at: string
          id: string
          name: string
          type: string
        }
        Insert: {
          client_id: string
          code?: string | null
          created_at?: string
          id?: string
          name: string
          type: string
        }
        Update: {
          client_id?: string
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'budget_accounts_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      budget_cost_centers: {
        Row: {
          client_id: string
          code: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          client_id: string
          code?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          client_id?: string
          code?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'budget_cost_centers_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      budget_entries: {
        Row: {
          account_id: string
          budgeted_amount: number
          client_id: string
          cost_center_id: string
          created_at: string
          id: string
          realized_amount: number
          reference_month: string
        }
        Insert: {
          account_id: string
          budgeted_amount?: number
          client_id: string
          cost_center_id: string
          created_at?: string
          id?: string
          realized_amount?: number
          reference_month: string
        }
        Update: {
          account_id?: string
          budgeted_amount?: number
          client_id?: string
          cost_center_id?: string
          created_at?: string
          id?: string
          realized_amount?: number
          reference_month?: string
        }
        Relationships: [
          {
            foreignKeyName: 'budget_entries_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'budget_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'budget_entries_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'budget_entries_cost_center_id_fkey'
            columns: ['cost_center_id']
            isOneToOne: false
            referencedRelation: 'budget_cost_centers'
            referencedColumns: ['id']
          },
        ]
      }
      cleaning_gardening_areas: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          plant_id: string
          polygon_data: Json | null
          type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          plant_id: string
          polygon_data?: Json | null
          type: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          plant_id?: string
          polygon_data?: Json | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cleaning_gardening_areas_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cleaning_gardening_areas_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
            referencedColumns: ['id']
          },
        ]
      }
      cleaning_gardening_schedules: {
        Row: {
          activity_date: string
          area_id: string
          client_id: string
          created_at: string
          description: string
          end_time: string | null
          evidence_url: string | null
          evidence_urls: Json | null
          id: string
          is_urgent: boolean
          justification: string | null
          plant_id: string
          start_time: string
          status: string
        }
        Insert: {
          activity_date: string
          area_id: string
          client_id: string
          created_at?: string
          description: string
          end_time?: string | null
          evidence_url?: string | null
          evidence_urls?: Json | null
          id?: string
          is_urgent?: boolean
          justification?: string | null
          plant_id: string
          start_time: string
          status?: string
        }
        Update: {
          activity_date?: string
          area_id?: string
          client_id?: string
          created_at?: string
          description?: string
          end_time?: string | null
          evidence_url?: string | null
          evidence_urls?: Json | null
          id?: string
          is_urgent?: boolean
          justification?: string | null
          plant_id?: string
          start_time?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cleaning_gardening_schedules_area_id_fkey'
            columns: ['area_id']
            isOneToOne: false
            referencedRelation: 'cleaning_gardening_areas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cleaning_gardening_schedules_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cleaning_gardening_schedules_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
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
          next_billing_date: string | null
          package_alert_days: number
          plan_type: string | null
          primary_color: string | null
          secondary_color: string | null
          status: string
          subscription_id: string | null
          trial_ends_at: string | null
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
          next_billing_date?: string | null
          package_alert_days?: number
          plan_type?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          status?: string
          subscription_id?: string | null
          trial_ends_at?: string | null
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
          next_billing_date?: string | null
          package_alert_days?: number
          plan_type?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          status?: string
          subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          url_slug?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
          service_type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
          service_type: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          service_type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'companies_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      contracted_headcount: {
        Row: {
          client_id: string
          company_id: string | null
          created_at: string
          equipment_id: string | null
          function_id: string | null
          id: string
          location_id: string | null
          plant_id: string
          quantity: number
          reference_month: string
          type: string
        }
        Insert: {
          client_id: string
          company_id?: string | null
          created_at?: string
          equipment_id?: string | null
          function_id?: string | null
          id?: string
          location_id?: string | null
          plant_id: string
          quantity?: number
          reference_month?: string
          type: string
        }
        Update: {
          client_id?: string
          company_id?: string | null
          created_at?: string
          equipment_id?: string | null
          function_id?: string | null
          id?: string
          location_id?: string | null
          plant_id?: string
          quantity?: number
          reference_month?: string
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
            foreignKeyName: 'contracted_headcount_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
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
          is_published: boolean
          plant_id: string
          reference_id: string
          status: boolean
          type: string
        }
        Insert: {
          client_id?: string
          created_at?: string
          date: string
          id?: string
          is_published?: boolean
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
          is_published?: boolean
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
      employee_training_records: {
        Row: {
          client_id: string
          completion_date: string
          created_at: string
          document_url: string
          employee_id: string
          id: string
          training_id: string
        }
        Insert: {
          client_id: string
          completion_date: string
          created_at?: string
          document_url: string
          employee_id: string
          id?: string
          training_id: string
        }
        Update: {
          client_id?: string
          completion_date?: string
          created_at?: string
          document_url?: string
          employee_id?: string
          id?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'employee_training_records_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employee_training_records_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employee_training_records_training_id_fkey'
            columns: ['training_id']
            isOneToOne: false
            referencedRelation: 'trainings'
            referencedColumns: ['id']
          },
        ]
      }
      employees: {
        Row: {
          client_id: string
          company_id: string | null
          company_name: string
          created_at: string
          function_id: string | null
          id: string
          location_id: string | null
          name: string
          plant_id: string
          reference_month: string
          registration_number: string | null
          status: string
        }
        Insert: {
          client_id: string
          company_id?: string | null
          company_name: string
          created_at?: string
          function_id?: string | null
          id?: string
          location_id?: string | null
          name: string
          plant_id: string
          reference_month?: string
          registration_number?: string | null
          status?: string
        }
        Update: {
          client_id?: string
          company_id?: string | null
          company_name?: string
          created_at?: string
          function_id?: string | null
          id?: string
          location_id?: string | null
          name?: string
          plant_id?: string
          reference_month?: string
          registration_number?: string | null
          status?: string
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
            foreignKeyName: 'employees_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
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
          status: string
          type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
          plant_id: string
          quantity?: number
          status?: string
          type: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          plant_id?: string
          quantity?: number
          status?: string
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
      function_required_trainings: {
        Row: {
          client_id: string
          function_id: string
          id: string
          training_id: string
        }
        Insert: {
          client_id: string
          function_id: string
          id?: string
          training_id: string
        }
        Update: {
          client_id?: string
          function_id?: string
          id?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'function_required_trainings_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'function_required_trainings_function_id_fkey'
            columns: ['function_id']
            isOneToOne: false
            referencedRelation: 'functions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'function_required_trainings_training_id_fkey'
            columns: ['training_id']
            isOneToOne: false
            referencedRelation: 'trainings'
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
      inventory_products: {
        Row: {
          category: string | null
          client_id: string | null
          created_at: string | null
          current_stock: number | null
          description: string | null
          fs_code: string | null
          id: string
          image_url: string | null
          item_value: number | null
          minimum_stock: number | null
          name: string
          sds_url: string | null
          supply_code: string | null
          unit_of_measure: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          client_id?: string | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          fs_code?: string | null
          id?: string
          image_url?: string | null
          item_value?: number | null
          minimum_stock?: number | null
          name: string
          sds_url?: string | null
          supply_code?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          client_id?: string | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          fs_code?: string | null
          id?: string
          image_url?: string | null
          item_value?: number | null
          minimum_stock?: number | null
          name?: string
          sds_url?: string | null
          supply_code?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'inventory_products_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      inventory_request_items: {
        Row: {
          id: string
          product_id: string | null
          quantity: number
          request_id: string | null
        }
        Insert: {
          id?: string
          product_id?: string | null
          quantity: number
          request_id?: string | null
        }
        Update: {
          id?: string
          product_id?: string | null
          quantity?: number
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'inventory_request_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'inventory_products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inventory_request_items_request_id_fkey'
            columns: ['request_id']
            isOneToOne: false
            referencedRelation: 'inventory_requests'
            referencedColumns: ['id']
          },
        ]
      }
      inventory_requests: {
        Row: {
          area_id: string | null
          client_id: string | null
          created_at: string | null
          id: string
          plant_id: string | null
          processed_at: string | null
          processed_by: string | null
          requester_id: string | null
          sap_reservation_number: string | null
          status: string | null
          total_items: number | null
        }
        Insert: {
          area_id?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          plant_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requester_id?: string | null
          sap_reservation_number?: string | null
          status?: string | null
          total_items?: number | null
        }
        Update: {
          area_id?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          plant_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requester_id?: string | null
          sap_reservation_number?: string | null
          status?: string | null
          total_items?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'inventory_requests_area_id_fkey'
            columns: ['area_id']
            isOneToOne: false
            referencedRelation: 'maintenance_areas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inventory_requests_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inventory_requests_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inventory_requests_processed_by_fkey'
            columns: ['processed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inventory_requests_requester_id_fkey'
            columns: ['requester_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      locations: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          plant_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          plant_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          plant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'locations_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'locations_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
            referencedColumns: ['id']
          },
        ]
      }
      locker_collaborators: {
        Row: {
          client_id: string
          company: string | null
          created_at: string
          department: string | null
          document: string | null
          id: string
          name: string
          phone: string | null
          plant_id: string | null
        }
        Insert: {
          client_id: string
          company?: string | null
          created_at?: string
          department?: string | null
          document?: string | null
          id?: string
          name: string
          phone?: string | null
          plant_id?: string | null
        }
        Update: {
          client_id?: string
          company?: string | null
          created_at?: string
          department?: string | null
          document?: string | null
          id?: string
          name?: string
          phone?: string | null
          plant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'locker_collaborators_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'locker_collaborators_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
            referencedColumns: ['id']
          },
        ]
      }
      locker_occupations: {
        Row: {
          client_id: string
          collaborator_id: string
          created_at: string
          id: string
          key_delivery_date: string
          locker_id: string
          return_date: string | null
          status: string
          term_url: string | null
        }
        Insert: {
          client_id: string
          collaborator_id: string
          created_at?: string
          id?: string
          key_delivery_date: string
          locker_id: string
          return_date?: string | null
          status?: string
          term_url?: string | null
        }
        Update: {
          client_id?: string
          collaborator_id?: string
          created_at?: string
          id?: string
          key_delivery_date?: string
          locker_id?: string
          return_date?: string | null
          status?: string
          term_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'locker_occupations_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'locker_occupations_collaborator_id_fkey'
            columns: ['collaborator_id']
            isOneToOne: false
            referencedRelation: 'locker_collaborators'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'locker_occupations_locker_id_fkey'
            columns: ['locker_id']
            isOneToOne: false
            referencedRelation: 'lockers'
            referencedColumns: ['id']
          },
        ]
      }
      lockers: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          id: string
          identification: string
          location: string
          plant_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          identification: string
          location: string
          plant_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          identification?: string
          location?: string
          plant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lockers_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lockers_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
            referencedColumns: ['id']
          },
        ]
      }
      maintenance_areas: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
          plant_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
          plant_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          plant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'maintenance_areas_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_areas_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
            referencedColumns: ['id']
          },
        ]
      }
      maintenance_assets: {
        Row: {
          area_id: string | null
          client_id: string
          created_at: string
          description: string | null
          id: string
          location_id: string | null
          name: string
          plant_id: string
          status: string
          sublocation_id: string | null
        }
        Insert: {
          area_id?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          location_id?: string | null
          name: string
          plant_id: string
          status?: string
          sublocation_id?: string | null
        }
        Update: {
          area_id?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          location_id?: string | null
          name?: string
          plant_id?: string
          status?: string
          sublocation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'maintenance_assets_area_id_fkey'
            columns: ['area_id']
            isOneToOne: false
            referencedRelation: 'maintenance_areas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_assets_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_assets_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_assets_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_assets_sublocation_id_fkey'
            columns: ['sublocation_id']
            isOneToOne: false
            referencedRelation: 'maintenance_sublocations'
            referencedColumns: ['id']
          },
        ]
      }
      maintenance_plan_checklist_items: {
        Row: {
          created_at: string
          description: string
          id: string
          order_index: number
          plan_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          order_index?: number
          plan_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          order_index?: number
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'maintenance_plan_checklist_items_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'maintenance_preventive_plans'
            referencedColumns: ['id']
          },
        ]
      }
      maintenance_preventive_plans: {
        Row: {
          area_id: string | null
          asset_id: string | null
          assignee_id: string | null
          client_id: string
          created_at: string
          description: string | null
          frequency: string
          id: string
          is_active: boolean
          last_generated_date: string | null
          location_id: string | null
          plant_id: string
          priority_id: string | null
          start_date: string
          title: string
          type_id: string | null
        }
        Insert: {
          area_id?: string | null
          asset_id?: string | null
          assignee_id?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_generated_date?: string | null
          location_id?: string | null
          plant_id: string
          priority_id?: string | null
          start_date: string
          title: string
          type_id?: string | null
        }
        Update: {
          area_id?: string | null
          asset_id?: string | null
          assignee_id?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_generated_date?: string | null
          location_id?: string | null
          plant_id?: string
          priority_id?: string | null
          start_date?: string
          title?: string
          type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'maintenance_preventive_plans_area_id_fkey'
            columns: ['area_id']
            isOneToOne: false
            referencedRelation: 'maintenance_areas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_preventive_plans_asset_id_fkey'
            columns: ['asset_id']
            isOneToOne: false
            referencedRelation: 'maintenance_assets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_preventive_plans_assignee_id_fkey'
            columns: ['assignee_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_preventive_plans_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_preventive_plans_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_preventive_plans_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_preventive_plans_priority_id_fkey'
            columns: ['priority_id']
            isOneToOne: false
            referencedRelation: 'maintenance_priorities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_preventive_plans_type_id_fkey'
            columns: ['type_id']
            isOneToOne: false
            referencedRelation: 'maintenance_types'
            referencedColumns: ['id']
          },
        ]
      }
      maintenance_priorities: {
        Row: {
          client_id: string
          color: string
          created_at: string
          id: string
          name: string
          sla_hours: number
        }
        Insert: {
          client_id: string
          color?: string
          created_at?: string
          id?: string
          name: string
          sla_hours?: number
        }
        Update: {
          client_id?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
          sla_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: 'maintenance_priorities_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      maintenance_statuses: {
        Row: {
          client_id: string
          color: string
          created_at: string
          id: string
          is_terminal: boolean
          name: string
          order_index: number
          step: string
        }
        Insert: {
          client_id: string
          color?: string
          created_at?: string
          id?: string
          is_terminal?: boolean
          name: string
          order_index?: number
          step?: string
        }
        Update: {
          client_id?: string
          color?: string
          created_at?: string
          id?: string
          is_terminal?: boolean
          name?: string
          order_index?: number
          step?: string
        }
        Relationships: [
          {
            foreignKeyName: 'maintenance_statuses_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      maintenance_sublocations: {
        Row: {
          area_id: string | null
          client_id: string
          created_at: string
          id: string
          location_id: string | null
          name: string
        }
        Insert: {
          area_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          location_id?: string | null
          name: string
        }
        Update: {
          area_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          location_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'maintenance_sublocations_area_id_fkey'
            columns: ['area_id']
            isOneToOne: false
            referencedRelation: 'maintenance_areas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_sublocations_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_sublocations_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      maintenance_tickets: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          area_id: string | null
          asset_id: string | null
          assignee_id: string | null
          checklist_responses: Json | null
          client_id: string
          closure_notes: string | null
          closure_photos: Json | null
          created_at: string
          description: string
          id: string
          location_id: string | null
          origin: string
          parent_ticket_id: string | null
          photos: Json | null
          plan_id: string | null
          planned_end: string | null
          planned_start: string | null
          plant_id: string
          priority_id: string | null
          reported_at: string
          requester_email: string | null
          requester_name: string | null
          status_id: string | null
          sublocation_id: string | null
          ticket_number: string
          type_id: string | null
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          area_id?: string | null
          asset_id?: string | null
          assignee_id?: string | null
          checklist_responses?: Json | null
          client_id: string
          closure_notes?: string | null
          closure_photos?: Json | null
          created_at?: string
          description: string
          id?: string
          location_id?: string | null
          origin?: string
          parent_ticket_id?: string | null
          photos?: Json | null
          plan_id?: string | null
          planned_end?: string | null
          planned_start?: string | null
          plant_id: string
          priority_id?: string | null
          reported_at?: string
          requester_email?: string | null
          requester_name?: string | null
          status_id?: string | null
          sublocation_id?: string | null
          ticket_number: string
          type_id?: string | null
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          area_id?: string | null
          asset_id?: string | null
          assignee_id?: string | null
          checklist_responses?: Json | null
          client_id?: string
          closure_notes?: string | null
          closure_photos?: Json | null
          created_at?: string
          description?: string
          id?: string
          location_id?: string | null
          origin?: string
          parent_ticket_id?: string | null
          photos?: Json | null
          plan_id?: string | null
          planned_end?: string | null
          planned_start?: string | null
          plant_id?: string
          priority_id?: string | null
          reported_at?: string
          requester_email?: string | null
          requester_name?: string | null
          status_id?: string | null
          sublocation_id?: string | null
          ticket_number?: string
          type_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'maintenance_tickets_area_id_fkey'
            columns: ['area_id']
            isOneToOne: false
            referencedRelation: 'maintenance_areas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_tickets_asset_id_fkey'
            columns: ['asset_id']
            isOneToOne: false
            referencedRelation: 'maintenance_assets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_tickets_assignee_id_fkey'
            columns: ['assignee_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_tickets_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_tickets_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_tickets_parent_ticket_id_fkey'
            columns: ['parent_ticket_id']
            isOneToOne: false
            referencedRelation: 'maintenance_tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_tickets_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'maintenance_preventive_plans'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_tickets_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_tickets_priority_id_fkey'
            columns: ['priority_id']
            isOneToOne: false
            referencedRelation: 'maintenance_priorities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_tickets_status_id_fkey'
            columns: ['status_id']
            isOneToOne: false
            referencedRelation: 'maintenance_statuses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_tickets_sublocation_id_fkey'
            columns: ['sublocation_id']
            isOneToOne: false
            referencedRelation: 'maintenance_sublocations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_tickets_type_id_fkey'
            columns: ['type_id']
            isOneToOne: false
            referencedRelation: 'maintenance_types'
            referencedColumns: ['id']
          },
        ]
      }
      maintenance_types: {
        Row: {
          client_id: string
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          client_id: string
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          client_id?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'maintenance_types_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
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
      org_collaborators: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          function_id: string | null
          id: string
          manager_id: string | null
          name: string
          phone: string | null
          photo_url: string | null
          plant_id: string | null
          unit_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          function_id?: string | null
          id?: string
          manager_id?: string | null
          name: string
          phone?: string | null
          photo_url?: string | null
          plant_id?: string | null
          unit_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          function_id?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          plant_id?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'org_collaborators_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_collaborators_function_id_fkey'
            columns: ['function_id']
            isOneToOne: false
            referencedRelation: 'org_functions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_collaborators_manager_id_fkey'
            columns: ['manager_id']
            isOneToOne: false
            referencedRelation: 'org_collaborators'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_collaborators_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_collaborators_unit_id_fkey'
            columns: ['unit_id']
            isOneToOne: false
            referencedRelation: 'org_units'
            referencedColumns: ['id']
          },
        ]
      }
      org_functions: {
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
            foreignKeyName: 'org_functions_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      org_units: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          plant_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          plant_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          plant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'org_units_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_units_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
            referencedColumns: ['id']
          },
        ]
      }
      package_types: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'package_types_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      packages: {
        Row: {
          arrival_date: string
          attachment_url: string | null
          client_id: string
          created_at: string
          delivery_date: string | null
          id: string
          observations: string | null
          package_type_id: string | null
          pickup_responsible: string | null
          plant_id: string
          protocol_number: string
          recipient_email: string
          recipient_name: string
          sender: string
          status: string
          tracking_code: string | null
        }
        Insert: {
          arrival_date: string
          attachment_url?: string | null
          client_id: string
          created_at?: string
          delivery_date?: string | null
          id?: string
          observations?: string | null
          package_type_id?: string | null
          pickup_responsible?: string | null
          plant_id: string
          protocol_number: string
          recipient_email: string
          recipient_name: string
          sender: string
          status?: string
          tracking_code?: string | null
        }
        Update: {
          arrival_date?: string
          attachment_url?: string | null
          client_id?: string
          created_at?: string
          delivery_date?: string | null
          id?: string
          observations?: string | null
          package_type_id?: string | null
          pickup_responsible?: string | null
          plant_id?: string
          protocol_number?: string
          recipient_email?: string
          recipient_name?: string
          sender?: string
          status?: string
          tracking_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'packages_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'packages_package_type_id_fkey'
            columns: ['package_type_id']
            isOneToOne: false
            referencedRelation: 'package_types'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'packages_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
            referencedColumns: ['id']
          },
        ]
      }
      plant_non_working_days: {
        Row: {
          client_id: string
          created_at: string
          date: string
          description: string | null
          id: string
          plant_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          date: string
          description?: string | null
          id?: string
          plant_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          plant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'plant_non_working_days_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'plant_non_working_days_plant_id_fkey'
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
          map_url: string | null
          name: string
        }
        Insert: {
          city: string
          client_id: string
          code: string
          created_at?: string
          id?: string
          map_url?: string | null
          name: string
        }
        Update: {
          city?: string
          client_id?: string
          code?: string
          created_at?: string
          id?: string
          map_url?: string | null
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
      process_flowcharts: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          flow_data: Json
          id: string
          name: string
          plant_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          flow_data?: Json
          id?: string
          name: string
          plant_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          flow_data?: Json
          id?: string
          name?: string
          plant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'process_flowcharts_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'process_flowcharts_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
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
      properties: {
        Row: {
          address: string
          city: string
          client_id: string
          created_at: string
          daily_rate: number
          description: string | null
          id: string
          name: string
          photos: Json
        }
        Insert: {
          address: string
          city: string
          client_id: string
          created_at?: string
          daily_rate?: number
          description?: string | null
          id?: string
          name: string
          photos?: Json
        }
        Update: {
          address?: string
          city?: string
          client_id?: string
          created_at?: string
          daily_rate?: number
          description?: string | null
          id?: string
          name?: string
          photos?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'properties_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      property_cost_centers: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'property_cost_centers_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      property_guests: {
        Row: {
          client_id: string
          cost_center_id: string | null
          created_at: string
          department: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          client_id: string
          cost_center_id?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          client_id?: string
          cost_center_id?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'property_guests_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'property_guests_cost_center_id_fkey'
            columns: ['cost_center_id']
            isOneToOne: false
            referencedRelation: 'property_cost_centers'
            referencedColumns: ['id']
          },
        ]
      }
      property_reservations: {
        Row: {
          bed_number: number
          check_in_date: string
          check_out_date: string
          client_id: string
          created_at: string
          guest_id: string
          id: string
          property_id: string
          room_id: string
          status: string
          total_amount: number
          voucher: string | null
        }
        Insert: {
          bed_number?: number
          check_in_date: string
          check_out_date: string
          client_id: string
          created_at?: string
          guest_id: string
          id?: string
          property_id: string
          room_id: string
          status?: string
          total_amount?: number
          voucher?: string | null
        }
        Update: {
          bed_number?: number
          check_in_date?: string
          check_out_date?: string
          client_id?: string
          created_at?: string
          guest_id?: string
          id?: string
          property_id?: string
          room_id?: string
          status?: string
          total_amount?: number
          voucher?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'property_reservations_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'property_reservations_guest_id_fkey'
            columns: ['guest_id']
            isOneToOne: false
            referencedRelation: 'property_guests'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'property_reservations_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'property_reservations_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'property_rooms'
            referencedColumns: ['id']
          },
        ]
      }
      property_rooms: {
        Row: {
          bed_type: string
          beds_quantity: number
          capacity: number
          client_id: string
          created_at: string
          has_bathroom: boolean
          id: string
          name: string
          property_id: string
        }
        Insert: {
          bed_type?: string
          beds_quantity?: number
          capacity?: number
          client_id: string
          created_at?: string
          has_bathroom?: boolean
          id?: string
          name: string
          property_id: string
        }
        Update: {
          bed_type?: string
          beds_quantity?: number
          capacity?: number
          client_id?: string
          created_at?: string
          has_bathroom?: boolean
          id?: string
          name?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'property_rooms_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'property_rooms_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
        ]
      }
      sector_documents: {
        Row: {
          alert_lead_days: number
          client_id: string
          created_at: string
          document_type: string
          expiration_date: string
          file_url: string | null
          file_urls: Json | null
          frequency: string | null
          id: string
          name: string
          plant_id: string
        }
        Insert: {
          alert_lead_days?: number
          client_id: string
          created_at?: string
          document_type: string
          expiration_date: string
          file_url?: string | null
          file_urls?: Json | null
          frequency?: string | null
          id?: string
          name: string
          plant_id: string
        }
        Update: {
          alert_lead_days?: number
          client_id?: string
          created_at?: string
          document_type?: string
          expiration_date?: string
          file_url?: string | null
          file_urls?: Json | null
          frequency?: string | null
          id?: string
          name?: string
          plant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sector_documents_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sector_documents_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
            referencedColumns: ['id']
          },
        ]
      }
      task_statuses: {
        Row: {
          client_id: string
          color: string
          created_at: string
          freeze_sla: boolean
          id: string
          ignore_sla: boolean
          is_terminal: boolean
          name: string
          return_to_requester: boolean
          sla_days: number
        }
        Insert: {
          client_id: string
          color?: string
          created_at?: string
          freeze_sla?: boolean
          id?: string
          ignore_sla?: boolean
          is_terminal?: boolean
          name: string
          return_to_requester?: boolean
          sla_days?: number
        }
        Update: {
          client_id?: string
          color?: string
          created_at?: string
          freeze_sla?: boolean
          id?: string
          ignore_sla?: boolean
          is_terminal?: boolean
          name?: string
          return_to_requester?: boolean
          sla_days?: number
        }
        Relationships: [
          {
            foreignKeyName: 'task_statuses_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      task_timeline: {
        Row: {
          action_type: string
          content: string
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          action_type?: string
          content: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          action_type?: string
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'task_timeline_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_timeline_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      task_types: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
          sla_hours: number
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
          sla_hours?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          sla_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: 'task_types_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      tasks: {
        Row: {
          accident_id: string | null
          assignee_id: string
          attachment_url: string | null
          attachment_urls: Json | null
          client_id: string
          closed_at: string | null
          created_at: string
          description: string
          due_date: string | null
          frozen_time_minutes: number
          id: string
          participants_ids: string[] | null
          plant_id: string
          po_generated_date: string | null
          rc_created_date: string | null
          requester_id: string
          status_id: string
          status_updated_at: string
          task_number: string
          title: string
          type_id: string
        }
        Insert: {
          accident_id?: string | null
          assignee_id: string
          attachment_url?: string | null
          attachment_urls?: Json | null
          client_id: string
          closed_at?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          frozen_time_minutes?: number
          id?: string
          participants_ids?: string[] | null
          plant_id: string
          po_generated_date?: string | null
          rc_created_date?: string | null
          requester_id: string
          status_id: string
          status_updated_at?: string
          task_number: string
          title?: string
          type_id: string
        }
        Update: {
          accident_id?: string | null
          assignee_id?: string
          attachment_url?: string | null
          attachment_urls?: Json | null
          client_id?: string
          closed_at?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          frozen_time_minutes?: number
          id?: string
          participants_ids?: string[] | null
          plant_id?: string
          po_generated_date?: string | null
          rc_created_date?: string | null
          requester_id?: string
          status_id?: string
          status_updated_at?: string
          task_number?: string
          title?: string
          type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_accident_id_fkey'
            columns: ['accident_id']
            isOneToOne: false
            referencedRelation: 'accidents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_assignee_id_fkey'
            columns: ['assignee_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_requester_id_fkey'
            columns: ['requester_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_status_id_fkey'
            columns: ['status_id']
            isOneToOne: false
            referencedRelation: 'task_statuses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_type_id_fkey'
            columns: ['type_id']
            isOneToOne: false
            referencedRelation: 'task_types'
            referencedColumns: ['id']
          },
        ]
      }
      trainings: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          validity_months: number | null
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          validity_months?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          validity_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'trainings_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      user_plants: {
        Row: {
          created_at: string | null
          id: string
          plant_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          plant_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          plant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'user_plants_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_duplicate_employees: {
        Args: { p_client_id: string; p_dry_run?: boolean; p_plant_id?: string }
        Returns: number
      }
      cleanup_duplicate_functions: {
        Args: { p_client_id: string; p_dry_run?: boolean; p_plant_id?: string }
        Returns: number
      }
      create_package: { Args: { p_payload: Json }; Returns: Json }
      get_attendance_employees:
        | {
            Args: {
              p_client_id: string
              p_plant_ids?: string[]
              p_reference_month?: string
            }
            Returns: {
              client_id: string
              company_id: string | null
              company_name: string
              created_at: string
              function_id: string | null
              id: string
              location_id: string | null
              name: string
              plant_id: string
              reference_month: string
              registration_number: string | null
              status: string
            }[]
            SetofOptions: {
              from: '*'
              to: 'employees'
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: { p_date: string; p_plant_id: string }
            Returns: {
              company_name: string
              function_id: string
              id: string
              location_id: string
              log_id: string
              log_status: boolean
              name: string
              status: string
            }[]
          }
        | {
            Args: {
              p_plant_id: string
              p_reference_month: string
              p_staff_log_ids?: string[]
            }
            Returns: {
              client_id: string
              company_id: string | null
              company_name: string
              created_at: string
              function_id: string | null
              id: string
              location_id: string | null
              name: string
              plant_id: string
              reference_month: string
              registration_number: string | null
              status: string
            }[]
            SetofOptions: {
              from: '*'
              to: 'employees'
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: {
              p_plant_id: string
              p_reference_month: string
              p_staff_log_ids: string[]
            }
            Returns: {
              company_name: string
              created_at: string
              function_id: string
              id: string
              name: string
              reference_month: string
              registration_number: string
              status: string
            }[]
          }
      get_maintenance_public_options: {
        Args: { p_slug: string }
        Returns: Json
      }
      get_user_authorized_plants: { Args: never; Returns: Json }
      get_user_client_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      is_client_active: { Args: never; Returns: boolean }
      is_plant_authorized: { Args: { p_id: string }; Returns: boolean }
      migrate_client_data: {
        Args: { source_client_id: string; target_client_id: string }
        Returns: undefined
      }
      submit_audit_execution:
        | {
            Args: {
              p_answers: Json
              p_execution_id: string
              p_is_draft?: boolean
              p_participants: string
              p_signatures?: Json
            }
            Returns: Json
          }
        | {
            Args: {
              p_answers: Json
              p_execution_id: string
              p_is_draft?: boolean
              p_participants: string
              p_signatures?: Json
            }
            Returns: Json
          }
      submit_maintenance_ticket: {
        Args: {
          p_area_id: string
          p_asset_id: string
          p_client_id: string
          p_description: string
          p_photos: Json
          p_plant_id: string
          p_requester_email: string
          p_requester_name: string
          p_sublocation_id: string
        }
        Returns: Json
      }
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
// Table: accidents
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   plant_id: uuid (not null)
//   event_date: timestamp with time zone (not null)
//   location: text (not null)
//   department: text (not null)
//   severity: text (not null)
//   description: text (not null)
//   photos: jsonb (nullable, default: '[]'::jsonb)
//   created_at: timestamp with time zone (not null, default: now())
//   created_by: uuid (nullable)
//   company_id: uuid (nullable)
// Table: audit_actions
//   id: uuid (not null, default: gen_random_uuid())
//   audit_id: uuid (not null)
//   title: text (not null)
//   evidence_required: boolean (not null, default: false)
//   order_index: integer (not null, default: 0)
//   created_at: timestamp with time zone (not null, default: now())
//   weight: numeric (not null, default: 1)
//   comments_required: boolean (not null, default: false)
// Table: audit_assignments
//   id: uuid (not null, default: gen_random_uuid())
//   audit_id: uuid (not null)
//   plant_id: uuid (not null)
//   assignee_id: uuid (not null)
//   created_at: timestamp with time zone (not null, default: now())
// Table: audit_execution_answers
//   id: uuid (not null, default: gen_random_uuid())
//   execution_id: uuid (not null)
//   action_id: uuid (not null)
//   score: integer (nullable)
//   evidence_url: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   observations: text (nullable)
//   corrective_assignee_id: uuid (nullable)
//   corrective_due_date: timestamp with time zone (nullable)
// Table: audit_executions
//   id: uuid (not null, default: gen_random_uuid())
//   audit_id: uuid (not null)
//   task_id: uuid (nullable)
//   assignee_id: uuid (not null)
//   plant_id: uuid (not null)
//   status: text (not null, default: 'Pendente'::text)
//   realization_date: date (nullable)
//   participants: text (nullable)
//   final_score: numeric (nullable)
//   max_score: numeric (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   signatures: jsonb (nullable, default: '[]'::jsonb)
// Table: audit_logs
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   user_id: uuid (not null)
//   action_type: text (not null)
//   details: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
// Table: audits
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   title: text (not null)
//   type: text (not null, default: 'Geral'::text)
//   frequency: text (not null, default: 'Única'::text)
//   start_date: date (not null)
//   created_at: timestamp with time zone (not null, default: now())
//   advance_notice_days: integer (nullable, default: 0)
//   scoring_settings: jsonb (nullable, default: '[{"score": 1, "description": "Muito Ruim", "trigger_task": true}, {"score": 2, "description": "Ruim", "trigger_task": true}, {"score": 3, "description": "Regular", "trigger_task": false}, {"score": 4, "description": "Bom", "trigger_task": false}, {"score": 5, "description": "Excelente", "trigger_task": false}]'::jsonb)
//   status: text (not null, default: 'Ativo'::text)
//   sla_days: numeric (nullable)
// Table: budget_accounts
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   code: text (nullable)
//   name: text (not null)
//   type: text (not null)
//   created_at: timestamp with time zone (not null, default: now())
// Table: budget_cost_centers
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   code: text (nullable)
//   name: text (not null)
//   created_at: timestamp with time zone (not null, default: now())
// Table: budget_entries
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   account_id: uuid (not null)
//   reference_month: date (not null)
//   budgeted_amount: numeric (not null, default: 0)
//   realized_amount: numeric (not null, default: 0)
//   created_at: timestamp with time zone (not null, default: now())
//   cost_center_id: uuid (not null)
// Table: cleaning_gardening_areas
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   plant_id: uuid (not null)
//   name: text (not null)
//   description: text (nullable)
//   type: text (not null)
//   created_at: timestamp with time zone (not null, default: now())
//   polygon_data: jsonb (nullable)
// Table: cleaning_gardening_schedules
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   plant_id: uuid (not null)
//   area_id: uuid (not null)
//   activity_date: date (not null)
//   start_time: time without time zone (not null)
//   description: text (not null)
//   status: text (not null, default: 'Pendente'::text)
//   evidence_url: text (nullable)
//   justification: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   end_time: time without time zone (nullable)
//   evidence_urls: jsonb (nullable, default: '[]'::jsonb)
//   is_urgent: boolean (not null, default: false)
// Table: clients
//   id: uuid (not null, default: gen_random_uuid())
//   name: text (not null)
//   url_slug: text (not null)
//   admin_name: text (not null, default: ''::text)
//   logo_url: text (nullable)
//   primary_color: text (nullable, default: '#1f2937'::text)
//   secondary_color: text (nullable, default: '#1e3a8a'::text)
//   status: text (not null, default: 'Ativo'::text)
//   modules: jsonb (not null, default: '[]'::jsonb)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
//   package_alert_days: integer (not null, default: 3)
//   plan_type: text (nullable)
//   subscription_id: text (nullable)
//   trial_ends_at: timestamp with time zone (nullable)
//   next_billing_date: timestamp with time zone (nullable)
// Table: companies
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   name: text (not null)
//   service_type: text (not null)
//   created_at: timestamp with time zone (not null, default: now())
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
//   company_id: uuid (nullable)
//   reference_month: date (not null, default: date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))
// Table: daily_logs
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null, default: get_user_client_id())
//   date: date (not null)
//   plant_id: uuid (not null)
//   type: text (not null)
//   reference_id: uuid (not null)
//   status: boolean (not null, default: false)
//   created_at: timestamp with time zone (not null, default: now())
//   is_published: boolean (not null, default: false)
// Table: employee_training_records
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   employee_id: uuid (not null)
//   training_id: uuid (not null)
//   document_url: text (not null)
//   completion_date: date (not null)
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
//   company_id: uuid (nullable)
//   reference_month: date (not null, default: date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))
//   status: text (not null, default: 'Ativo'::text)
//   registration_number: text (nullable)
// Table: equipment
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   plant_id: uuid (not null)
//   name: text (not null)
//   type: text (not null)
//   quantity: integer (not null, default: 1)
//   created_at: timestamp with time zone (not null, default: now())
//   status: text (not null, default: 'Ativo'::text)
// Table: function_required_trainings
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   function_id: uuid (not null)
//   training_id: uuid (not null)
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
// Table: inventory_products
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (nullable, default: get_user_client_id())
//   name: text (not null)
//   description: text (nullable)
//   category: text (nullable)
//   unit_of_measure: text (nullable)
//   image_url: text (nullable)
//   sds_url: text (nullable)
//   current_stock: numeric (nullable, default: 0)
//   minimum_stock: numeric (nullable, default: 0)
//   created_at: timestamp with time zone (nullable, default: now())
//   updated_at: timestamp with time zone (nullable, default: now())
//   fs_code: text (nullable)
//   supply_code: text (nullable)
//   item_value: numeric (nullable, default: 0)
// Table: inventory_request_items
//   id: uuid (not null, default: gen_random_uuid())
//   request_id: uuid (nullable)
//   product_id: uuid (nullable)
//   quantity: numeric (not null)
// Table: inventory_requests
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (nullable)
//   plant_id: uuid (nullable)
//   requester_id: uuid (nullable)
//   area_id: uuid (nullable)
//   status: text (nullable, default: 'Pendente'::text)
//   sap_reservation_number: text (nullable)
//   total_items: integer (nullable, default: 0)
//   created_at: timestamp with time zone (nullable, default: now())
//   processed_at: timestamp with time zone (nullable)
//   processed_by: uuid (nullable)
// Table: locations
//   id: uuid (not null, default: gen_random_uuid())
//   plant_id: uuid (not null)
//   name: text (not null)
//   description: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   client_id: uuid (not null)
// Table: locker_collaborators
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   name: text (not null)
//   document: text (nullable)
//   phone: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   company: text (nullable)
//   department: text (nullable)
//   plant_id: uuid (nullable)
// Table: locker_occupations
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   locker_id: uuid (not null)
//   collaborator_id: uuid (not null)
//   key_delivery_date: date (not null)
//   return_date: date (nullable)
//   term_url: text (nullable)
//   status: text (not null, default: 'Ativo'::text)
//   created_at: timestamp with time zone (not null, default: now())
// Table: lockers
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   plant_id: uuid (not null)
//   location: text (not null)
//   identification: text (not null)
//   description: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
// Table: maintenance_areas
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   plant_id: uuid (not null)
//   name: text (not null)
//   created_at: timestamp with time zone (not null, default: now())
// Table: maintenance_assets
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   plant_id: uuid (not null)
//   location_id: uuid (nullable)
//   sublocation_id: uuid (nullable)
//   name: text (not null)
//   description: text (nullable)
//   status: text (not null, default: 'Ativo'::text)
//   created_at: timestamp with time zone (not null, default: now())
//   area_id: uuid (nullable)
// Table: maintenance_plan_checklist_items
//   id: uuid (not null, default: gen_random_uuid())
//   plan_id: uuid (not null)
//   description: text (not null)
//   order_index: integer (not null, default: 0)
//   created_at: timestamp with time zone (not null, default: now())
// Table: maintenance_preventive_plans
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   plant_id: uuid (not null)
//   title: text (not null)
//   description: text (nullable)
//   asset_id: uuid (nullable)
//   location_id: uuid (nullable)
//   type_id: uuid (nullable)
//   priority_id: uuid (nullable)
//   assignee_id: uuid (nullable)
//   frequency: text (not null, default: 'Mensal'::text)
//   start_date: date (not null)
//   last_generated_date: date (nullable)
//   is_active: boolean (not null, default: true)
//   created_at: timestamp with time zone (not null, default: now())
//   area_id: uuid (nullable)
// Table: maintenance_priorities
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   name: text (not null)
//   sla_hours: numeric (not null, default: 24)
//   color: text (not null, default: '#3b82f6'::text)
//   created_at: timestamp with time zone (not null, default: now())
// Table: maintenance_statuses
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   name: text (not null)
//   color: text (not null, default: '#64748b'::text)
//   step: text (not null, default: 'Aberto'::text)
//   is_terminal: boolean (not null, default: false)
//   order_index: integer (not null, default: 0)
//   created_at: timestamp with time zone (not null, default: now())
// Table: maintenance_sublocations
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   location_id: uuid (nullable)
//   name: text (not null)
//   created_at: timestamp with time zone (not null, default: now())
//   area_id: uuid (nullable)
// Table: maintenance_tickets
//   id: uuid (not null, default: gen_random_uuid())
//   ticket_number: text (not null)
//   client_id: uuid (not null)
//   plant_id: uuid (not null)
//   location_id: uuid (nullable)
//   sublocation_id: uuid (nullable)
//   asset_id: uuid (nullable)
//   type_id: uuid (nullable)
//   priority_id: uuid (nullable)
//   status_id: uuid (nullable)
//   requester_name: text (nullable)
//   requester_email: text (nullable)
//   description: text (not null)
//   photos: jsonb (nullable, default: '[]'::jsonb)
//   reported_at: timestamp with time zone (not null, default: now())
//   planned_start: timestamp with time zone (nullable)
//   planned_end: timestamp with time zone (nullable)
//   actual_start: timestamp with time zone (nullable)
//   actual_end: timestamp with time zone (nullable)
//   assignee_id: uuid (nullable)
//   closure_notes: text (nullable)
//   closure_photos: jsonb (nullable, default: '[]'::jsonb)
//   origin: text (not null, default: 'Manual'::text)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
//   area_id: uuid (nullable)
//   checklist_responses: jsonb (nullable, default: '[]'::jsonb)
//   parent_ticket_id: uuid (nullable)
//   plan_id: uuid (nullable)
// Table: maintenance_types
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   name: text (not null)
//   created_at: timestamp with time zone (not null, default: now())
//   color: text (not null, default: '#3b82f6'::text)
// Table: monthly_goals_data
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   plant_id: uuid (not null)
//   goal_id: uuid (not null)
//   reference_month: date (not null)
//   value: numeric (not null, default: 0)
//   created_at: timestamp with time zone (not null, default: now())
// Table: org_collaborators
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   plant_id: uuid (nullable)
//   unit_id: uuid (nullable)
//   function_id: uuid (nullable)
//   manager_id: uuid (nullable)
//   name: text (not null)
//   email: text (nullable)
//   phone: text (nullable)
//   photo_url: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
// Table: org_functions
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   name: text (not null)
//   description: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
// Table: org_units
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   plant_id: uuid (nullable)
//   name: text (not null)
//   description: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
// Table: package_types
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   name: text (not null)
//   created_at: timestamp with time zone (not null, default: now())
// Table: packages
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   plant_id: uuid (not null)
//   package_type_id: uuid (nullable)
//   protocol_number: text (not null)
//   arrival_date: date (not null)
//   sender: text (not null)
//   recipient_name: text (not null)
//   recipient_email: text (not null)
//   tracking_code: text (nullable)
//   observations: text (nullable)
//   status: text (not null, default: 'Aguardando Retirada'::text)
//   delivery_date: timestamp with time zone (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   pickup_responsible: text (nullable)
//   attachment_url: text (nullable)
// Table: plant_non_working_days
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   plant_id: uuid (not null)
//   date: date (not null)
//   description: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
// Table: plants
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   name: text (not null)
//   code: text (not null)
//   city: text (not null)
//   created_at: timestamp with time zone (not null, default: now())
//   map_url: text (nullable)
// Table: process_flowcharts
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   plant_id: uuid (nullable)
//   name: text (not null)
//   description: text (nullable)
//   flow_data: jsonb (not null, default: '{"edges": [], "nodes": []}'::jsonb)
//   created_at: timestamp with time zone (not null, default: now())
// Table: profiles
//   id: uuid (not null)
//   client_id: uuid (nullable)
//   name: citext (not null)
//   email: text (not null)
//   role: text (not null, default: 'Operacional'::text)
//   accessible_menus: jsonb (nullable, default: '[]'::jsonb)
//   authorized_plants: jsonb (nullable, default: '[]'::jsonb)
//   force_password_change: boolean (nullable, default: false)
//   created_at: timestamp with time zone (not null, default: now())
// Table: properties
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   name: text (not null)
//   city: text (not null)
//   address: text (not null)
//   description: text (nullable)
//   daily_rate: numeric (not null, default: 0)
//   photos: jsonb (not null, default: '[]'::jsonb)
//   created_at: timestamp with time zone (not null, default: now())
// Table: property_cost_centers
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   name: text (not null)
//   created_at: timestamp with time zone (not null, default: now())
// Table: property_guests
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   name: text (not null)
//   email: text (nullable)
//   phone: text (nullable)
//   cost_center_id: uuid (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   department: text (nullable)
// Table: property_reservations
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   property_id: uuid (not null)
//   room_id: uuid (not null)
//   guest_id: uuid (not null)
//   check_in_date: date (not null)
//   check_out_date: date (not null)
//   total_amount: numeric (not null, default: 0)
//   status: text (not null, default: 'Confirmada'::text)
//   created_at: timestamp with time zone (not null, default: now())
//   voucher: text (nullable)
//   bed_number: integer (not null, default: 1)
// Table: property_rooms
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   property_id: uuid (not null)
//   name: text (not null)
//   capacity: integer (not null, default: 1)
//   created_at: timestamp with time zone (not null, default: now())
//   bed_type: text (not null, default: 'Solteiro'::text)
//   has_bathroom: boolean (not null, default: false)
//   beds_quantity: integer (not null, default: 1)
// Table: sector_documents
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   plant_id: uuid (not null)
//   name: text (not null)
//   document_type: text (not null)
//   expiration_date: date (not null)
//   alert_lead_days: integer (not null, default: 30)
//   file_url: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   file_urls: jsonb (nullable, default: '[]'::jsonb)
//   frequency: text (nullable)
// Table: task_statuses
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   name: text (not null)
//   color: text (not null, default: '#64748b'::text)
//   is_terminal: boolean (not null, default: false)
//   created_at: timestamp with time zone (not null, default: now())
//   freeze_sla: boolean (not null, default: false)
//   sla_days: numeric (not null, default: 1)
//   return_to_requester: boolean (not null, default: false)
//   ignore_sla: boolean (not null, default: false)
// Table: task_timeline
//   id: uuid (not null, default: gen_random_uuid())
//   task_id: uuid (not null)
//   user_id: uuid (not null)
//   content: text (not null)
//   action_type: text (not null, default: 'comment'::text)
//   created_at: timestamp with time zone (not null, default: now())
// Table: task_types
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   name: text (not null)
//   sla_hours: numeric (not null, default: 24)
//   created_at: timestamp with time zone (not null, default: now())
// Table: tasks
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   plant_id: uuid (not null)
//   type_id: uuid (not null)
//   status_id: uuid (not null)
//   requester_id: uuid (not null)
//   assignee_id: uuid (not null)
//   task_number: text (not null)
//   description: text (not null)
//   attachment_url: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   closed_at: timestamp with time zone (nullable)
//   frozen_time_minutes: integer (not null, default: 0)
//   status_updated_at: timestamp with time zone (not null, default: now())
//   title: text (not null, default: ''::text)
//   attachment_urls: jsonb (nullable, default: '[]'::jsonb)
//   due_date: timestamp with time zone (nullable)
//   participants_ids: _uuid (nullable, default: '{}'::uuid[])
//   rc_created_date: timestamp with time zone (nullable)
//   po_generated_date: timestamp with time zone (nullable)
//   accident_id: uuid (nullable)
// Table: trainings
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   name: text (not null)
//   description: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   validity_months: integer (nullable, default: 0)
// Table: user_plants
//   id: uuid (not null, default: gen_random_uuid())
//   user_id: uuid (nullable)
//   plant_id: uuid (nullable)
//   created_at: timestamp with time zone (nullable, default: now())

// --- CONSTRAINTS ---
// Table: accidents
//   FOREIGN KEY accidents_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   FOREIGN KEY accidents_company_id_fkey: FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
//   FOREIGN KEY accidents_created_by_fkey: FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
//   PRIMARY KEY accidents_pkey: PRIMARY KEY (id)
//   FOREIGN KEY accidents_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
//   CHECK accidents_severity_check: CHECK ((severity = ANY (ARRAY['Leve'::text, 'Moderado'::text, 'Grave'::text])))
// Table: audit_actions
//   FOREIGN KEY audit_actions_audit_id_fkey: FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
//   PRIMARY KEY audit_actions_pkey: PRIMARY KEY (id)
// Table: audit_assignments
//   FOREIGN KEY audit_assignments_assignee_id_fkey: FOREIGN KEY (assignee_id) REFERENCES profiles(id) ON DELETE CASCADE
//   FOREIGN KEY audit_assignments_audit_id_fkey: FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
//   PRIMARY KEY audit_assignments_pkey: PRIMARY KEY (id)
//   FOREIGN KEY audit_assignments_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
// Table: audit_execution_answers
//   FOREIGN KEY audit_execution_answers_action_id_fkey: FOREIGN KEY (action_id) REFERENCES audit_actions(id) ON DELETE CASCADE
//   FOREIGN KEY audit_execution_answers_corrective_assignee_id_fkey: FOREIGN KEY (corrective_assignee_id) REFERENCES profiles(id) ON DELETE SET NULL
//   UNIQUE audit_execution_answers_execution_action_key: UNIQUE (execution_id, action_id)
//   FOREIGN KEY audit_execution_answers_execution_id_fkey: FOREIGN KEY (execution_id) REFERENCES audit_executions(id) ON DELETE CASCADE
//   PRIMARY KEY audit_execution_answers_pkey: PRIMARY KEY (id)
// Table: audit_executions
//   FOREIGN KEY audit_executions_assignee_id_fkey: FOREIGN KEY (assignee_id) REFERENCES profiles(id)
//   FOREIGN KEY audit_executions_audit_id_fkey: FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
//   PRIMARY KEY audit_executions_pkey: PRIMARY KEY (id)
//   FOREIGN KEY audit_executions_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id)
//   FOREIGN KEY audit_executions_task_id_fkey: FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
// Table: audit_logs
//   FOREIGN KEY audit_logs_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY audit_logs_pkey: PRIMARY KEY (id)
//   FOREIGN KEY audit_logs_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
// Table: audits
//   FOREIGN KEY audits_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY audits_pkey: PRIMARY KEY (id)
// Table: budget_accounts
//   UNIQUE budget_accounts_client_id_code_key: UNIQUE (client_id, code)
//   FOREIGN KEY budget_accounts_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY budget_accounts_pkey: PRIMARY KEY (id)
// Table: budget_cost_centers
//   FOREIGN KEY budget_cost_centers_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY budget_cost_centers_pkey: PRIMARY KEY (id)
// Table: budget_entries
//   FOREIGN KEY budget_entries_account_id_fkey: FOREIGN KEY (account_id) REFERENCES budget_accounts(id) ON DELETE CASCADE
//   UNIQUE budget_entries_client_id_cost_center_id_account_id_ref_key: UNIQUE (client_id, cost_center_id, account_id, reference_month)
//   FOREIGN KEY budget_entries_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   FOREIGN KEY budget_entries_cost_center_id_fkey: FOREIGN KEY (cost_center_id) REFERENCES budget_cost_centers(id) ON DELETE CASCADE
//   PRIMARY KEY budget_entries_pkey: PRIMARY KEY (id)
// Table: cleaning_gardening_areas
//   FOREIGN KEY cleaning_gardening_areas_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY cleaning_gardening_areas_pkey: PRIMARY KEY (id)
//   FOREIGN KEY cleaning_gardening_areas_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
//   CHECK cleaning_gardening_areas_type_check: CHECK ((type = ANY (ARRAY['cleaning'::text, 'gardening'::text])))
// Table: cleaning_gardening_schedules
//   FOREIGN KEY cleaning_gardening_schedules_area_id_fkey: FOREIGN KEY (area_id) REFERENCES cleaning_gardening_areas(id) ON DELETE CASCADE
//   FOREIGN KEY cleaning_gardening_schedules_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY cleaning_gardening_schedules_pkey: PRIMARY KEY (id)
//   FOREIGN KEY cleaning_gardening_schedules_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
//   CHECK cleaning_gardening_schedules_status_check: CHECK ((status = ANY (ARRAY['Pendente'::text, 'Realizado'::text, 'Não Realizado'::text])))
// Table: clients
//   PRIMARY KEY clients_pkey: PRIMARY KEY (id)
//   UNIQUE clients_url_slug_key: UNIQUE (url_slug)
// Table: companies
//   FOREIGN KEY companies_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY companies_pkey: PRIMARY KEY (id)
// Table: contracted_headcount
//   FOREIGN KEY contracted_headcount_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   FOREIGN KEY contracted_headcount_company_id_fkey: FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
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
// Table: employee_training_records
//   FOREIGN KEY employee_training_records_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   FOREIGN KEY employee_training_records_employee_id_fkey: FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
//   UNIQUE employee_training_records_employee_id_training_id_key: UNIQUE (employee_id, training_id)
//   PRIMARY KEY employee_training_records_pkey: PRIMARY KEY (id)
//   FOREIGN KEY employee_training_records_training_id_fkey: FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE
// Table: employees
//   FOREIGN KEY employees_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   FOREIGN KEY employees_company_id_fkey: FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
//   FOREIGN KEY employees_function_id_fkey: FOREIGN KEY (function_id) REFERENCES functions(id) ON DELETE SET NULL
//   FOREIGN KEY employees_location_id_fkey: FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
//   PRIMARY KEY employees_pkey: PRIMARY KEY (id)
//   FOREIGN KEY employees_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
// Table: equipment
//   FOREIGN KEY equipment_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY equipment_pkey: PRIMARY KEY (id)
//   FOREIGN KEY equipment_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
// Table: function_required_trainings
//   FOREIGN KEY function_required_trainings_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   FOREIGN KEY function_required_trainings_function_id_fkey: FOREIGN KEY (function_id) REFERENCES functions(id) ON DELETE CASCADE
//   UNIQUE function_required_trainings_function_id_training_id_key: UNIQUE (function_id, training_id)
//   PRIMARY KEY function_required_trainings_pkey: PRIMARY KEY (id)
//   FOREIGN KEY function_required_trainings_training_id_fkey: FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE
// Table: functions
//   FOREIGN KEY functions_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY functions_pkey: PRIMARY KEY (id)
// Table: goals_book
//   FOREIGN KEY goals_book_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY goals_book_pkey: PRIMARY KEY (id)
// Table: inventory_products
//   FOREIGN KEY inventory_products_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY inventory_products_pkey: PRIMARY KEY (id)
// Table: inventory_request_items
//   PRIMARY KEY inventory_request_items_pkey: PRIMARY KEY (id)
//   FOREIGN KEY inventory_request_items_product_id_fkey: FOREIGN KEY (product_id) REFERENCES inventory_products(id) ON DELETE RESTRICT
//   FOREIGN KEY inventory_request_items_request_id_fkey: FOREIGN KEY (request_id) REFERENCES inventory_requests(id) ON DELETE CASCADE
// Table: inventory_requests
//   FOREIGN KEY inventory_requests_area_id_fkey: FOREIGN KEY (area_id) REFERENCES maintenance_areas(id) ON DELETE RESTRICT
//   FOREIGN KEY inventory_requests_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY inventory_requests_pkey: PRIMARY KEY (id)
//   FOREIGN KEY inventory_requests_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE RESTRICT
//   FOREIGN KEY inventory_requests_processed_by_fkey: FOREIGN KEY (processed_by) REFERENCES profiles(id) ON DELETE RESTRICT
//   FOREIGN KEY inventory_requests_requester_id_fkey: FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE RESTRICT
//   CHECK inventory_requests_status_check: CHECK ((status = ANY (ARRAY['Pendente'::text, 'Aprovado'::text, 'Entregue'::text, 'Rejeitado'::text])))
// Table: locations
//   FOREIGN KEY locations_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY locations_pkey: PRIMARY KEY (id)
//   FOREIGN KEY locations_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
// Table: locker_collaborators
//   FOREIGN KEY locker_collaborators_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY locker_collaborators_pkey: PRIMARY KEY (id)
//   FOREIGN KEY locker_collaborators_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
// Table: locker_occupations
//   FOREIGN KEY locker_occupations_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   FOREIGN KEY locker_occupations_collaborator_id_fkey: FOREIGN KEY (collaborator_id) REFERENCES locker_collaborators(id) ON DELETE CASCADE
//   FOREIGN KEY locker_occupations_locker_id_fkey: FOREIGN KEY (locker_id) REFERENCES lockers(id) ON DELETE CASCADE
//   PRIMARY KEY locker_occupations_pkey: PRIMARY KEY (id)
// Table: lockers
//   FOREIGN KEY lockers_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY lockers_pkey: PRIMARY KEY (id)
//   FOREIGN KEY lockers_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
// Table: maintenance_areas
//   FOREIGN KEY maintenance_areas_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY maintenance_areas_pkey: PRIMARY KEY (id)
//   FOREIGN KEY maintenance_areas_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
// Table: maintenance_assets
//   FOREIGN KEY maintenance_assets_area_id_fkey: FOREIGN KEY (area_id) REFERENCES maintenance_areas(id) ON DELETE SET NULL
//   FOREIGN KEY maintenance_assets_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   FOREIGN KEY maintenance_assets_location_id_fkey: FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
//   PRIMARY KEY maintenance_assets_pkey: PRIMARY KEY (id)
//   FOREIGN KEY maintenance_assets_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
//   FOREIGN KEY maintenance_assets_sublocation_id_fkey: FOREIGN KEY (sublocation_id) REFERENCES maintenance_sublocations(id) ON DELETE SET NULL
// Table: maintenance_plan_checklist_items
//   PRIMARY KEY maintenance_plan_checklist_items_pkey: PRIMARY KEY (id)
//   FOREIGN KEY maintenance_plan_checklist_items_plan_id_fkey: FOREIGN KEY (plan_id) REFERENCES maintenance_preventive_plans(id) ON DELETE CASCADE
// Table: maintenance_preventive_plans
//   FOREIGN KEY maintenance_preventive_plans_area_id_fkey: FOREIGN KEY (area_id) REFERENCES maintenance_areas(id) ON DELETE SET NULL
//   FOREIGN KEY maintenance_preventive_plans_asset_id_fkey: FOREIGN KEY (asset_id) REFERENCES maintenance_assets(id) ON DELETE SET NULL
//   FOREIGN KEY maintenance_preventive_plans_assignee_id_fkey: FOREIGN KEY (assignee_id) REFERENCES profiles(id) ON DELETE SET NULL
//   FOREIGN KEY maintenance_preventive_plans_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   FOREIGN KEY maintenance_preventive_plans_location_id_fkey: FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
//   PRIMARY KEY maintenance_preventive_plans_pkey: PRIMARY KEY (id)
//   FOREIGN KEY maintenance_preventive_plans_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
//   FOREIGN KEY maintenance_preventive_plans_priority_id_fkey: FOREIGN KEY (priority_id) REFERENCES maintenance_priorities(id) ON DELETE SET NULL
//   FOREIGN KEY maintenance_preventive_plans_type_id_fkey: FOREIGN KEY (type_id) REFERENCES maintenance_types(id) ON DELETE SET NULL
// Table: maintenance_priorities
//   FOREIGN KEY maintenance_priorities_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY maintenance_priorities_pkey: PRIMARY KEY (id)
// Table: maintenance_statuses
//   FOREIGN KEY maintenance_statuses_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY maintenance_statuses_pkey: PRIMARY KEY (id)
// Table: maintenance_sublocations
//   FOREIGN KEY maintenance_sublocations_area_id_fkey: FOREIGN KEY (area_id) REFERENCES maintenance_areas(id) ON DELETE CASCADE
//   FOREIGN KEY maintenance_sublocations_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   FOREIGN KEY maintenance_sublocations_location_id_fkey: FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
//   PRIMARY KEY maintenance_sublocations_pkey: PRIMARY KEY (id)
// Table: maintenance_tickets
//   FOREIGN KEY maintenance_tickets_area_id_fkey: FOREIGN KEY (area_id) REFERENCES maintenance_areas(id) ON DELETE SET NULL
//   FOREIGN KEY maintenance_tickets_asset_id_fkey: FOREIGN KEY (asset_id) REFERENCES maintenance_assets(id) ON DELETE SET NULL
//   FOREIGN KEY maintenance_tickets_assignee_id_fkey: FOREIGN KEY (assignee_id) REFERENCES profiles(id) ON DELETE SET NULL
//   FOREIGN KEY maintenance_tickets_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   FOREIGN KEY maintenance_tickets_location_id_fkey: FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
//   FOREIGN KEY maintenance_tickets_parent_ticket_id_fkey: FOREIGN KEY (parent_ticket_id) REFERENCES maintenance_tickets(id) ON DELETE SET NULL
//   PRIMARY KEY maintenance_tickets_pkey: PRIMARY KEY (id)
//   FOREIGN KEY maintenance_tickets_plan_id_fkey: FOREIGN KEY (plan_id) REFERENCES maintenance_preventive_plans(id) ON DELETE SET NULL
//   FOREIGN KEY maintenance_tickets_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
//   FOREIGN KEY maintenance_tickets_priority_id_fkey: FOREIGN KEY (priority_id) REFERENCES maintenance_priorities(id) ON DELETE SET NULL
//   FOREIGN KEY maintenance_tickets_status_id_fkey: FOREIGN KEY (status_id) REFERENCES maintenance_statuses(id) ON DELETE SET NULL
//   FOREIGN KEY maintenance_tickets_sublocation_id_fkey: FOREIGN KEY (sublocation_id) REFERENCES maintenance_sublocations(id) ON DELETE SET NULL
//   FOREIGN KEY maintenance_tickets_type_id_fkey: FOREIGN KEY (type_id) REFERENCES maintenance_types(id) ON DELETE SET NULL
// Table: maintenance_types
//   FOREIGN KEY maintenance_types_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY maintenance_types_pkey: PRIMARY KEY (id)
// Table: monthly_goals_data
//   FOREIGN KEY monthly_goals_data_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   FOREIGN KEY monthly_goals_data_goal_id_fkey: FOREIGN KEY (goal_id) REFERENCES goals_book(id) ON DELETE CASCADE
//   PRIMARY KEY monthly_goals_data_pkey: PRIMARY KEY (id)
//   FOREIGN KEY monthly_goals_data_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
//   UNIQUE monthly_goals_data_plant_id_goal_id_reference_month_key: UNIQUE (plant_id, goal_id, reference_month)
// Table: org_collaborators
//   FOREIGN KEY org_collaborators_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   FOREIGN KEY org_collaborators_function_id_fkey: FOREIGN KEY (function_id) REFERENCES org_functions(id) ON DELETE SET NULL
//   FOREIGN KEY org_collaborators_manager_id_fkey: FOREIGN KEY (manager_id) REFERENCES org_collaborators(id) ON DELETE SET NULL
//   PRIMARY KEY org_collaborators_pkey: PRIMARY KEY (id)
//   FOREIGN KEY org_collaborators_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
//   FOREIGN KEY org_collaborators_unit_id_fkey: FOREIGN KEY (unit_id) REFERENCES org_units(id) ON DELETE SET NULL
// Table: org_functions
//   FOREIGN KEY org_functions_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY org_functions_pkey: PRIMARY KEY (id)
// Table: org_units
//   FOREIGN KEY org_units_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY org_units_pkey: PRIMARY KEY (id)
//   FOREIGN KEY org_units_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
// Table: package_types
//   FOREIGN KEY package_types_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY package_types_pkey: PRIMARY KEY (id)
// Table: packages
//   FOREIGN KEY packages_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   UNIQUE packages_client_id_protocol_number_key: UNIQUE (client_id, protocol_number)
//   FOREIGN KEY packages_package_type_id_fkey: FOREIGN KEY (package_type_id) REFERENCES package_types(id) ON DELETE SET NULL
//   PRIMARY KEY packages_pkey: PRIMARY KEY (id)
//   FOREIGN KEY packages_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
// Table: plant_non_working_days
//   FOREIGN KEY plant_non_working_days_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY plant_non_working_days_pkey: PRIMARY KEY (id)
//   FOREIGN KEY plant_non_working_days_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
// Table: plants
//   FOREIGN KEY plants_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY plants_pkey: PRIMARY KEY (id)
// Table: process_flowcharts
//   FOREIGN KEY process_flowcharts_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY process_flowcharts_pkey: PRIMARY KEY (id)
//   FOREIGN KEY process_flowcharts_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
// Table: profiles
//   FOREIGN KEY profiles_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   FOREIGN KEY profiles_id_fkey: FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
//   PRIMARY KEY profiles_pkey: PRIMARY KEY (id)
// Table: properties
//   FOREIGN KEY properties_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY properties_pkey: PRIMARY KEY (id)
// Table: property_cost_centers
//   FOREIGN KEY property_cost_centers_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY property_cost_centers_pkey: PRIMARY KEY (id)
// Table: property_guests
//   FOREIGN KEY property_guests_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   FOREIGN KEY property_guests_cost_center_id_fkey: FOREIGN KEY (cost_center_id) REFERENCES property_cost_centers(id) ON DELETE SET NULL
//   PRIMARY KEY property_guests_pkey: PRIMARY KEY (id)
// Table: property_reservations
//   FOREIGN KEY property_reservations_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   FOREIGN KEY property_reservations_guest_id_fkey: FOREIGN KEY (guest_id) REFERENCES property_guests(id) ON DELETE CASCADE
//   PRIMARY KEY property_reservations_pkey: PRIMARY KEY (id)
//   FOREIGN KEY property_reservations_property_id_fkey: FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
//   FOREIGN KEY property_reservations_room_id_fkey: FOREIGN KEY (room_id) REFERENCES property_rooms(id) ON DELETE CASCADE
// Table: property_rooms
//   FOREIGN KEY property_rooms_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY property_rooms_pkey: PRIMARY KEY (id)
//   FOREIGN KEY property_rooms_property_id_fkey: FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
// Table: sector_documents
//   FOREIGN KEY sector_documents_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY sector_documents_pkey: PRIMARY KEY (id)
//   FOREIGN KEY sector_documents_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
// Table: task_statuses
//   FOREIGN KEY task_statuses_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY task_statuses_pkey: PRIMARY KEY (id)
// Table: task_timeline
//   PRIMARY KEY task_timeline_pkey: PRIMARY KEY (id)
//   FOREIGN KEY task_timeline_task_id_fkey: FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
//   FOREIGN KEY task_timeline_user_id_fkey: FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
// Table: task_types
//   FOREIGN KEY task_types_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY task_types_pkey: PRIMARY KEY (id)
// Table: tasks
//   FOREIGN KEY tasks_accident_id_fkey: FOREIGN KEY (accident_id) REFERENCES accidents(id) ON DELETE SET NULL
//   FOREIGN KEY tasks_assignee_id_fkey: FOREIGN KEY (assignee_id) REFERENCES profiles(id) ON DELETE CASCADE
//   FOREIGN KEY tasks_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   UNIQUE tasks_client_id_task_number_key: UNIQUE (client_id, task_number)
//   PRIMARY KEY tasks_pkey: PRIMARY KEY (id)
//   FOREIGN KEY tasks_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
//   FOREIGN KEY tasks_requester_id_fkey: FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE CASCADE
//   FOREIGN KEY tasks_status_id_fkey: FOREIGN KEY (status_id) REFERENCES task_statuses(id) ON DELETE CASCADE
//   FOREIGN KEY tasks_type_id_fkey: FOREIGN KEY (type_id) REFERENCES task_types(id) ON DELETE CASCADE
// Table: trainings
//   FOREIGN KEY trainings_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY trainings_pkey: PRIMARY KEY (id)
// Table: user_plants
//   PRIMARY KEY user_plants_pkey: PRIMARY KEY (id)
//   FOREIGN KEY user_plants_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
//   FOREIGN KEY user_plants_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
//   UNIQUE user_plants_user_id_plant_id_key: UNIQUE (user_id, plant_id)

// --- ROW LEVEL SECURITY POLICIES ---
// Table: accidents
//   Policy "accidents_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (is_client_active() AND (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id)))
//   Policy "accidents_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (is_client_active() AND ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())))
//   Policy "accidents_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (is_client_active() AND (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id)))
//   Policy "accidents_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (is_client_active() AND (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id)))
//     WITH CHECK: (is_client_active() AND (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id)))
// Table: audit_actions
//   Policy "generic_access_audit_actions" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (EXISTS ( SELECT 1    FROM audits   WHERE ((audits.id = audit_actions.audit_id) AND (audits.client_id = get_user_client_id())))))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (EXISTS ( SELECT 1    FROM audits   WHERE ((audits.id = audit_actions.audit_id) AND (audits.client_id = get_user_client_id())))))
// Table: audit_assignments
//   Policy "tenant_and_plant_isolation_audit_assignments" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (is_plant_authorized(plant_id) AND ((get_user_role() = 'Master'::text) OR (EXISTS ( SELECT 1    FROM audits   WHERE ((audits.id = audit_assignments.audit_id) AND (audits.client_id = get_user_client_id()))))))
//     WITH CHECK: (is_plant_authorized(plant_id) AND ((get_user_role() = 'Master'::text) OR (EXISTS ( SELECT 1    FROM audits   WHERE ((audits.id = audit_assignments.audit_id) AND (audits.client_id = get_user_client_id()))))))
// Table: audit_execution_answers
//   Policy "generic_access_audit_execution_answers" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (EXISTS ( SELECT 1    FROM (audit_executions e      JOIN audits a ON ((a.id = e.audit_id)))   WHERE ((e.id = audit_execution_answers.execution_id) AND (a.client_id = get_user_client_id())))))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (EXISTS ( SELECT 1    FROM (audit_executions e      JOIN audits a ON ((a.id = e.audit_id)))   WHERE ((e.id = audit_execution_answers.execution_id) AND (a.client_id = get_user_client_id())))))
// Table: audit_executions
//   Policy "plant_isolation_audit_executions_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = ANY (ARRAY['Master'::text, 'Administrador'::text])) AND is_plant_authorized(plant_id) AND ((get_user_role() = 'Master'::text) OR (EXISTS ( SELECT 1    FROM audits   WHERE ((audits.id = audit_executions.audit_id) AND (audits.client_id = get_user_client_id()))))))
//   Policy "plant_isolation_audit_executions_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (is_plant_authorized(plant_id) AND ((get_user_role() = 'Master'::text) OR (EXISTS ( SELECT 1    FROM audits   WHERE ((audits.id = audit_executions.audit_id) AND (audits.client_id = get_user_client_id()))))))
//   Policy "plant_isolation_audit_executions_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (is_plant_authorized(plant_id) AND ((get_user_role() = 'Master'::text) OR (EXISTS ( SELECT 1    FROM audits   WHERE ((audits.id = audit_executions.audit_id) AND (audits.client_id = get_user_client_id()))))))
//   Policy "plant_isolation_audit_executions_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (is_plant_authorized(plant_id) AND ((get_user_role() = 'Master'::text) OR (EXISTS ( SELECT 1    FROM audits   WHERE ((audits.id = audit_executions.audit_id) AND (audits.client_id = get_user_client_id()))))))
//     WITH CHECK: (is_plant_authorized(plant_id) AND ((get_user_role() = 'Master'::text) OR (EXISTS ( SELECT 1    FROM audits   WHERE ((audits.id = audit_executions.audit_id) AND (audits.client_id = get_user_client_id()))))))
// Table: audit_logs
//   Policy "tenant_isolation_audit_logs" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: audits
//   Policy "tenant_isolation_audits" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: budget_accounts
//   Policy "tenant_isolation_budget_accounts" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: budget_cost_centers
//   Policy "tenant_isolation_budget_cost_centers" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: budget_entries
//   Policy "tenant_isolation_budget_entries" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: cleaning_gardening_areas
//   Policy "plant_isolation_cleaning_gardening_areas" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
//     WITH CHECK: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
// Table: cleaning_gardening_schedules
//   Policy "authenticated_delete_schedules" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_insert_schedules" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "authenticated_select_schedules" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_update_schedules" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
//   Policy "plant_isolation_cleaning_gardening_schedules" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
//     WITH CHECK: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
// Table: clients
//   Policy "tenant_isolation_clients" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (id = get_user_client_id()))
// Table: companies
//   Policy "tenant_isolation_companies" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: contracted_headcount
//   Policy "plant_isolation_contracted_headcount" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
//     WITH CHECK: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
// Table: daily_logs
//   Policy "daily_logs_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "daily_logs_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "daily_logs_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "daily_logs_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: employee_training_records
//   Policy "tenant_isolation_employee_training_records" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: employees
//   Policy "employees_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.id = auth.uid()) AND ((p.client_id = employees.client_id) OR (p.role = 'Master'::text)) AND ((p.role = ANY (ARRAY['Administrador'::text, 'Master'::text, 'Gestor'::text])) OR ((p.authorized_plants IS NOT NULL) AND ((p.authorized_plants @> to_jsonb(employees.plant_id)) OR (p.authorized_plants @> to_jsonb((employees.plant_id)::text))))))))
//   Policy "employees_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.id = auth.uid()) AND ((p.client_id = employees.client_id) OR (p.role = 'Master'::text)) AND ((p.role = ANY (ARRAY['Administrador'::text, 'Master'::text, 'Gestor'::text])) OR ((p.authorized_plants IS NOT NULL) AND ((p.authorized_plants @> to_jsonb(employees.plant_id)) OR (p.authorized_plants @> to_jsonb((employees.plant_id)::text))))))))
//   Policy "employees_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((client_id = get_user_client_id()) AND is_plant_authorized(plant_id))
//   Policy "employees_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.id = auth.uid()) AND ((p.client_id = employees.client_id) OR (p.role = 'Master'::text)) AND ((p.role = ANY (ARRAY['Administrador'::text, 'Master'::text, 'Gestor'::text])) OR ((p.authorized_plants IS NOT NULL) AND ((p.authorized_plants @> to_jsonb(employees.plant_id)) OR (p.authorized_plants @> to_jsonb((employees.plant_id)::text))))))))
// Table: equipment
//   Policy "plant_isolation_equipment" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
//     WITH CHECK: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
// Table: function_required_trainings
//   Policy "tenant_isolation_function_required_trainings" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: functions
//   Policy "tenant_isolation_functions" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: goals_book
//   Policy "tenant_isolation_goals_book" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: inventory_products
//   Policy "authenticated_delete_inventory_products" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (client_id = get_user_client_id())
//   Policy "authenticated_insert_inventory_products" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (client_id = get_user_client_id())
//   Policy "authenticated_select_inventory_products" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (client_id = get_user_client_id())
//   Policy "authenticated_update_inventory_products" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (client_id = get_user_client_id())
//     WITH CHECK: (client_id = get_user_client_id())
//   Policy "inventory_products_all" (ALL, PERMISSIVE) roles={public}
//     USING: true
//   Policy "inventory_products_select" (SELECT, PERMISSIVE) roles={public}
//     USING: true
// Table: inventory_request_items
//   Policy "inventory_request_items_all" (ALL, PERMISSIVE) roles={public}
//     USING: true
//   Policy "inventory_request_items_select" (SELECT, PERMISSIVE) roles={public}
//     USING: true
// Table: inventory_requests
//   Policy "inventory_requests_all" (ALL, PERMISSIVE) roles={public}
//     USING: true
//   Policy "inventory_requests_select" (SELECT, PERMISSIVE) roles={public}
//     USING: true
// Table: locations
//   Policy "plant_isolation_locations" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
//     WITH CHECK: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
// Table: locker_collaborators
//   Policy "plant_isolation_locker_collaborators" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND ((plant_id IS NULL) OR is_plant_authorized(plant_id)))
//     WITH CHECK: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND ((plant_id IS NULL) OR is_plant_authorized(plant_id)))
// Table: locker_occupations
//   Policy "plant_isolation_locker_occupations" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(( SELECT lockers.plant_id    FROM lockers   WHERE (lockers.id = locker_occupations.locker_id))))
//     WITH CHECK: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(( SELECT lockers.plant_id    FROM lockers   WHERE (lockers.id = locker_occupations.locker_id))))
// Table: lockers
//   Policy "plant_isolation_lockers" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
//     WITH CHECK: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
// Table: maintenance_areas
//   Policy "maintenance_areas_all" (ALL, PERMISSIVE) roles={public}
//     USING: true
//   Policy "maintenance_areas_select" (SELECT, PERMISSIVE) roles={public}
//     USING: true
//   Policy "tenant_isolation_maintenance_areas" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: maintenance_assets
//   Policy "tenant_isolation_maintenance_assets" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: maintenance_plan_checklist_items
//   Policy "tenant_isolation_maintenance_plan_checklist_items" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM maintenance_preventive_plans   WHERE ((maintenance_preventive_plans.id = maintenance_plan_checklist_items.plan_id) AND ((get_user_role() = 'Master'::text) OR (maintenance_preventive_plans.client_id = get_user_client_id())))))
//     WITH CHECK: (EXISTS ( SELECT 1    FROM maintenance_preventive_plans   WHERE ((maintenance_preventive_plans.id = maintenance_plan_checklist_items.plan_id) AND ((get_user_role() = 'Master'::text) OR (maintenance_preventive_plans.client_id = get_user_client_id())))))
// Table: maintenance_preventive_plans
//   Policy "tenant_isolation_maintenance_preventive_plans" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: maintenance_priorities
//   Policy "tenant_isolation_maintenance_priorities" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: maintenance_statuses
//   Policy "tenant_isolation_maintenance_statuses" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: maintenance_sublocations
//   Policy "tenant_isolation_maintenance_sublocations" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: maintenance_tickets
//   Policy "tenant_isolation_maintenance_tickets" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (is_client_active() AND ((get_user_role() = 'Master'::text) OR ((client_id = get_user_client_id()) AND is_plant_authorized(plant_id))))
//     WITH CHECK: (is_client_active() AND ((get_user_role() = 'Master'::text) OR ((client_id = get_user_client_id()) AND is_plant_authorized(plant_id))))
// Table: maintenance_types
//   Policy "tenant_isolation_maintenance_types" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: monthly_goals_data
//   Policy "plant_isolation_monthly_goals_data" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
//     WITH CHECK: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
// Table: org_collaborators
//   Policy "tenant_isolation_org_collaborators" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: org_functions
//   Policy "tenant_isolation_org_functions" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: org_units
//   Policy "tenant_isolation_org_units" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: package_types
//   Policy "tenant_isolation_package_types" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: packages
//   Policy "plant_isolation_packages" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
//     WITH CHECK: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
// Table: plant_non_working_days
//   Policy "Enable delete for authorized users" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: is_plant_authorized(plant_id)
//   Policy "Enable insert for authorized users" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: is_plant_authorized(plant_id)
//   Policy "Enable read access for authorized users" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: is_plant_authorized(plant_id)
//   Policy "Enable update for authorized users" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: is_plant_authorized(plant_id)
//     WITH CHECK: is_plant_authorized(plant_id)
//   Policy "plant_isolation_plant_non_working_days" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
//     WITH CHECK: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
//   Policy "plant_non_working_days_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.id = auth.uid()) AND ((p.client_id = plant_non_working_days.client_id) OR (p.role = 'Master'::text)) AND ((p.role = ANY (ARRAY['Administrador'::text, 'Master'::text, 'Gestor'::text])) OR ((p.authorized_plants IS NOT NULL) AND ((p.authorized_plants @> to_jsonb(plant_non_working_days.plant_id)) OR (p.authorized_plants @> to_jsonb((plant_non_working_days.plant_id)::text))))))))
//   Policy "plant_non_working_days_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.id = auth.uid()) AND ((p.client_id = plant_non_working_days.client_id) OR (p.role = 'Master'::text)) AND ((p.role = ANY (ARRAY['Administrador'::text, 'Master'::text, 'Gestor'::text])) OR ((p.authorized_plants IS NOT NULL) AND ((p.authorized_plants @> to_jsonb(plant_non_working_days.plant_id)) OR (p.authorized_plants @> to_jsonb((plant_non_working_days.plant_id)::text))))))))
// Table: plants
//   Policy "authenticated_delete_plants" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(id))
//   Policy "authenticated_insert_plants" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(id))
//   Policy "authenticated_select_plants" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//   Policy "authenticated_update_plants" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(id))
//     WITH CHECK: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(id))
// Table: process_flowcharts
//   Policy "tenant_isolation_process_flowcharts" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: profiles
//   Policy "Profiles access" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((id = auth.uid()) OR (get_user_role() = 'Master'::text) OR ((get_user_role() = ANY (ARRAY['Administrador'::text, 'Gestor'::text])) AND (client_id = get_user_client_id())))
//     WITH CHECK: ((id = auth.uid()) OR (get_user_role() = 'Master'::text) OR ((get_user_role() = ANY (ARRAY['Administrador'::text, 'Gestor'::text])) AND (client_id = get_user_client_id())))
//   Policy "profiles_select_client" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: properties
//   Policy "tenant_isolation_properties" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: property_cost_centers
//   Policy "tenant_isolation_property_cost_centers" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: property_guests
//   Policy "tenant_isolation_property_guests" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: property_reservations
//   Policy "tenant_isolation_property_reservations" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: property_rooms
//   Policy "tenant_isolation_property_rooms" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: sector_documents
//   Policy "sector_documents_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (is_client_active() AND ((get_user_role() = 'Master'::text) OR ((client_id = get_user_client_id()) AND is_plant_authorized(plant_id))))
//   Policy "sector_documents_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (is_client_active() AND ((get_user_role() = 'Master'::text) OR ((client_id = get_user_client_id()) AND is_plant_authorized(plant_id))))
//   Policy "sector_documents_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (is_client_active() AND ((get_user_role() = 'Master'::text) OR ((client_id = get_user_client_id()) AND is_plant_authorized(plant_id))))
//   Policy "sector_documents_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (is_client_active() AND ((get_user_role() = 'Master'::text) OR ((client_id = get_user_client_id()) AND is_plant_authorized(plant_id))))
//     WITH CHECK: (is_client_active() AND ((get_user_role() = 'Master'::text) OR ((client_id = get_user_client_id()) AND is_plant_authorized(plant_id))))
// Table: task_statuses
//   Policy "authenticated_delete_ts" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_insert_ts" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "authenticated_select_ts" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_update_ts" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
//   Policy "tenant_isolation_task_statuses" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: task_timeline
//   Policy "authenticated_delete_tl" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_insert_tl" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "authenticated_select_tl" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "generic_access_task_timeline" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: task_types
//   Policy "authenticated_delete_tt" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_insert_tt" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "authenticated_select_tt" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_update_tt" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
//   Policy "tenant_isolation_task_types" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: tasks
//   Policy "authenticated_delete_t" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_delete_tasks" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (is_client_active() AND ((get_user_role() = 'Master'::text) OR ((client_id = get_user_client_id()) AND is_plant_authorized(plant_id))))
//   Policy "authenticated_insert_t" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "authenticated_insert_tasks" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (is_client_active() AND ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())))
//   Policy "authenticated_select_t" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_select_tasks" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (is_client_active() AND ((get_user_role() = 'Master'::text) OR ((client_id = get_user_client_id()) AND (is_plant_authorized(plant_id) OR (requester_id = auth.uid()) OR (assignee_id = auth.uid())))))
//   Policy "authenticated_update_t" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
//   Policy "authenticated_update_tasks" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (is_client_active() AND ((get_user_role() = 'Master'::text) OR ((client_id = get_user_client_id()) AND (is_plant_authorized(plant_id) OR (requester_id = auth.uid()) OR (assignee_id = auth.uid())))))
//     WITH CHECK: (is_client_active() AND ((get_user_role() = 'Master'::text) OR ((client_id = get_user_client_id()) AND (is_plant_authorized(plant_id) OR (requester_id = auth.uid()) OR (assignee_id = auth.uid())))))
//   Policy "tasks_select_audit_generated" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((assignee_id = auth.uid()) OR (requester_id = auth.uid()) OR ((participants_ids IS NOT NULL) AND (participants_ids @> ARRAY[auth.uid()])))
// Table: trainings
//   Policy "tenant_isolation_trainings" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: user_plants
//   Policy "user_plants_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true

// --- DATABASE FUNCTIONS ---
// FUNCTION check_duplicate_employee()
//   CREATE OR REPLACE FUNCTION public.check_duplicate_employee()
//    RETURNS trigger
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     IF NEW.registration_number IS NOT NULL AND NEW.registration_number != '' THEN
//       IF EXISTS (
//         SELECT 1 FROM public.employees
//         WHERE client_id = NEW.client_id
//           AND plant_id = NEW.plant_id
//           AND registration_number = NEW.registration_number
//           AND reference_month = NEW.reference_month
//           AND id != NEW.id
//       ) THEN
//         RAISE EXCEPTION 'Colaborador com esta matrícula já existe neste mês e planta.';
//       END IF;
//     END IF;
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION clean_old_audit_logs()
//   CREATE OR REPLACE FUNCTION public.clean_old_audit_logs()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     DELETE FROM public.audit_logs WHERE created_at < NOW() - INTERVAL '2 months';
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION cleanup_duplicate_employees(uuid, uuid, boolean)
//   CREATE OR REPLACE FUNCTION public.cleanup_duplicate_employees(p_client_id uuid, p_plant_id uuid DEFAULT NULL::uuid, p_dry_run boolean DEFAULT true)
//    RETURNS integer
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_duplicate_count integer := 0;
//     r RECORD;
//     v_primary_id UUID;
//     v_dup_ids UUID[];
//   BEGIN
//     -- Iterate over sets of employees with identical names and reference_month
//     FOR r IN (
//       SELECT lower(trim(e.name)) as emp_name, e.reference_month, array_agg(e.id ORDER BY e.created_at ASC) as all_ids
//       FROM public.employees e
//       WHERE e.client_id = p_client_id
//         AND (p_plant_id IS NULL OR e.plant_id = p_plant_id)
//       GROUP BY lower(trim(e.name)), e.reference_month
//       HAVING count(*) > 1
//     ) LOOP
//
//       v_primary_id := r.all_ids[1];
//       v_dup_ids := r.all_ids[2:array_length(r.all_ids, 1)];
//
//       v_duplicate_count := v_duplicate_count + array_length(v_dup_ids, 1);
//
//       IF NOT p_dry_run THEN
//         -- Resolve unique constraint conflicts on daily_logs
//         DELETE FROM public.daily_logs
//         WHERE reference_id = ANY(v_dup_ids) AND type = 'staff'
//           AND EXISTS (
//             SELECT 1 FROM public.daily_logs dl2
//             WHERE dl2.reference_id = v_primary_id
//               AND dl2.type = 'staff'
//               AND dl2.date = public.daily_logs.date
//           );
//
//         UPDATE public.daily_logs
//         SET reference_id = v_primary_id
//         WHERE reference_id = ANY(v_dup_ids) AND type = 'staff';
//
//         -- Resolve unique constraint conflicts on employee_training_records
//         DELETE FROM public.employee_training_records
//         WHERE employee_id = ANY(v_dup_ids)
//           AND EXISTS (
//             SELECT 1 FROM public.employee_training_records r2
//             WHERE r2.employee_id = v_primary_id
//               AND r2.training_id = public.employee_training_records.training_id
//           );
//
//         UPDATE public.employee_training_records
//         SET employee_id = v_primary_id
//         WHERE employee_id = ANY(v_dup_ids);
//
//         -- Delete the duplicates
//         DELETE FROM public.employees WHERE id = ANY(v_dup_ids);
//       END IF;
//     END LOOP;
//
//     RETURN v_duplicate_count;
//   END;
//   $function$
//
// FUNCTION cleanup_duplicate_functions(uuid, uuid, boolean)
//   CREATE OR REPLACE FUNCTION public.cleanup_duplicate_functions(p_client_id uuid, p_plant_id uuid DEFAULT NULL::uuid, p_dry_run boolean DEFAULT true)
//    RETURNS integer
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_duplicate_count integer := 0;
//     r RECORD;
//     v_primary_id UUID;
//     v_dup_ids UUID[];
//   BEGIN
//     -- Iterate over sets of functions with identical names (case-insensitive, trimmed)
//     FOR r IN (
//       SELECT lower(trim(f.name)) as func_name, array_agg(f.id ORDER BY f.created_at ASC) as all_ids
//       FROM public.functions f
//       WHERE f.client_id = p_client_id
//       GROUP BY lower(trim(f.name))
//       HAVING count(*) > 1
//     ) LOOP
//
//       -- If a plant is specified, we only process this set if at least one of these duplicate functions
//       -- is actually used by an employee or headcount in that specific plant.
//       IF p_plant_id IS NOT NULL THEN
//         IF NOT EXISTS (
//           SELECT 1 FROM public.employees WHERE function_id = ANY(r.all_ids) AND plant_id = p_plant_id
//           UNION ALL
//           SELECT 1 FROM public.contracted_headcount WHERE function_id = ANY(r.all_ids) AND plant_id = p_plant_id
//         ) THEN
//           CONTINUE;
//         END IF;
//       END IF;
//
//       -- The primary is the first one (oldest created_at)
//       v_primary_id := r.all_ids[1];
//       -- The rest are duplicates to be merged and deleted
//       v_dup_ids := r.all_ids[2:array_length(r.all_ids, 1)];
//
//       v_duplicate_count := v_duplicate_count + array_length(v_dup_ids, 1);
//
//       -- If not a dry run, perform the merge operations
//       IF NOT p_dry_run THEN
//         -- 1. Re-map employees
//         UPDATE public.employees
//         SET function_id = v_primary_id
//         WHERE function_id = ANY(v_dup_ids);
//
//         -- 2. Re-map contracted_headcount
//         UPDATE public.contracted_headcount
//         SET function_id = v_primary_id
//         WHERE function_id = ANY(v_dup_ids);
//
//         -- 3. Re-map org_collaborators
//         UPDATE public.org_collaborators
//         SET function_id = v_primary_id
//         WHERE function_id = ANY(v_dup_ids);
//
//         -- 4. Re-map function_required_trainings (safely ignore duplicates)
//         INSERT INTO public.function_required_trainings (client_id, function_id, training_id)
//         SELECT client_id, v_primary_id, training_id
//         FROM public.function_required_trainings
//         WHERE function_id = ANY(v_dup_ids)
//         ON CONFLICT (function_id, training_id) DO NOTHING;
//
//         DELETE FROM public.function_required_trainings WHERE function_id = ANY(v_dup_ids);
//
//         -- 5. Delete the duplicate function records
//         DELETE FROM public.functions WHERE id = ANY(v_dup_ids);
//       END IF;
//     END LOOP;
//
//     RETURN v_duplicate_count;
//   END;
//   $function$
//
// FUNCTION create_package(jsonb)
//   CREATE OR REPLACE FUNCTION public.create_package(p_payload jsonb)
//    RETURNS jsonb
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_client_id UUID;
//     v_plant_id UUID;
//     v_package_type_id UUID;
//     v_arrival_date DATE;
//     v_sender TEXT;
//     v_recipient_name TEXT;
//     v_recipient_email TEXT;
//     v_tracking_code TEXT;
//     v_observations TEXT;
//     v_status TEXT;
//     v_attachment_url TEXT;
//
//     v_year TEXT;
//     v_seq INT;
//     v_protocol TEXT;
//     v_package_id UUID;
//   BEGIN
//     v_client_id := NULLIF(p_payload->>'client_id', '')::UUID;
//     v_plant_id := NULLIF(p_payload->>'plant_id', '')::UUID;
//     v_package_type_id := NULLIF(p_payload->>'package_type_id', '')::UUID;
//     v_arrival_date := NULLIF(p_payload->>'arrival_date', '')::DATE;
//     v_sender := p_payload->>'sender';
//     v_recipient_name := p_payload->>'recipient_name';
//     v_recipient_email := p_payload->>'recipient_email';
//     v_tracking_code := p_payload->>'tracking_code';
//     v_observations := p_payload->>'observations';
//     v_status := p_payload->>'status';
//     v_attachment_url := p_payload->>'attachment_url';
//
//     IF v_arrival_date IS NULL THEN
//       v_year := to_char(CURRENT_DATE, 'YYYY');
//     ELSE
//       v_year := to_char(v_arrival_date, 'YYYY');
//     END IF;
//
//     -- Use an advisory xact lock based on client_id hash to prevent concurrent insertions generating the same sequence
//     PERFORM pg_advisory_xact_lock(hashtext(v_client_id::text));
//
//     -- Calculate the next sequence for the given year
//     SELECT COALESCE(
//       MAX(
//         SUBSTRING(protocol_number FROM 'ENC-\d{4}-([0-9]+)')::INT
//       ), 0
//     ) + 1 INTO v_seq
//     FROM public.packages
//     WHERE client_id = v_client_id AND protocol_number LIKE 'ENC-' || v_year || '-%';
//
//     v_protocol := 'ENC-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
//
//     INSERT INTO public.packages (
//       client_id, plant_id, package_type_id, protocol_number, arrival_date,
//       sender, recipient_name, recipient_email, tracking_code, observations,
//       status, attachment_url
//     ) VALUES (
//       v_client_id, v_plant_id, v_package_type_id, v_protocol, COALESCE(v_arrival_date, CURRENT_DATE),
//       v_sender, v_recipient_name, v_recipient_email, v_tracking_code, v_observations,
//       COALESCE(v_status, 'Aguardando Retirada'), v_attachment_url
//     ) RETURNING id INTO v_package_id;
//
//     RETURN jsonb_build_object(
//       'success', true,
//       'id', v_package_id,
//       'protocol_number', v_protocol
//     );
//   END;
//   $function$
//
// FUNCTION generate_initial_audit_executions()
//   CREATE OR REPLACE FUNCTION public.generate_initial_audit_executions()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_next_due_date TIMESTAMP;
//     v_task_type_id UUID;
//     v_status_id UUID;
//     v_requester_id UUID;
//     v_task_title TEXT;
//     v_task_desc TEXT;
//     v_new_task_id UUID;
//     v_audit RECORD;
//     v_base_date TIMESTAMP;
//     v_next_date TIMESTAMP;
//   BEGIN
//     SELECT * INTO v_audit FROM public.audits WHERE id = NEW.audit_id;
//
//     v_base_date := v_audit.start_date::TIMESTAMP;
//
//     IF v_audit.frequency = 'Diária' THEN
//       v_next_date := v_base_date + INTERVAL '1 day';
//     ELSIF v_audit.frequency = 'Semanal' THEN
//       v_next_date := v_base_date + INTERVAL '1 week';
//     ELSIF v_audit.frequency = 'Quinzenal' THEN
//       v_next_date := v_base_date + INTERVAL '15 days';
//     ELSIF v_audit.frequency = 'Mensal' THEN
//       v_next_date := v_base_date + INTERVAL '1 month';
//     ELSIF v_audit.frequency = 'Bimestral' THEN
//       v_next_date := v_base_date + INTERVAL '2 months';
//     ELSIF v_audit.frequency = 'Trimestral' THEN
//       v_next_date := v_base_date + INTERVAL '3 months';
//     ELSIF v_audit.frequency = 'Semestral' THEN
//       v_next_date := v_base_date + INTERVAL '6 months';
//     ELSIF v_audit.frequency = 'Anual' THEN
//       v_next_date := v_base_date + INTERVAL '1 year';
//     ELSE
//       v_next_date := v_base_date;
//     END IF;
//
//     IF v_audit.sla_days IS NOT NULL THEN
//       v_next_due_date := v_next_date + (v_audit.sla_days || ' days')::INTERVAL;
//     ELSE
//       v_next_due_date := v_next_date;
//     END IF;
//
//     IF NOT EXISTS (
//       SELECT 1 FROM public.audit_executions
//       WHERE audit_id = NEW.audit_id AND plant_id = NEW.plant_id
//     ) THEN
//       SELECT id INTO v_task_type_id FROM public.task_types
//       WHERE client_id = v_audit.client_id AND name ILIKE '%Auditoria%' LIMIT 1;
//
//       IF v_task_type_id IS NULL THEN
//         SELECT id INTO v_task_type_id FROM public.task_types
//         WHERE client_id = v_audit.client_id ORDER BY created_at LIMIT 1;
//       END IF;
//
//       SELECT id INTO v_status_id FROM public.task_statuses
//       WHERE client_id = v_audit.client_id AND is_terminal = false ORDER BY created_at LIMIT 1;
//
//       IF v_task_type_id IS NOT NULL AND v_status_id IS NOT NULL THEN
//         v_task_title := 'Auditoria: ' || v_audit.title;
//         v_task_desc := 'Execução automática de auditoria: ' || v_audit.title || '. Frequência: ' || v_audit.frequency || '.';
//
//         SELECT id INTO v_requester_id FROM public.profiles
//         WHERE client_id = v_audit.client_id AND role IN ('Administrador', 'Master') LIMIT 1;
//         IF v_requester_id IS NULL THEN
//           v_requester_id := NEW.assignee_id;
//         END IF;
//
//         INSERT INTO public.tasks (
//           client_id, plant_id, type_id, status_id, requester_id, assignee_id,
//           task_number, title, description, due_date, status_updated_at
//         ) VALUES (
//           v_audit.client_id, NEW.plant_id, v_task_type_id, v_status_id, v_requester_id, NEW.assignee_id,
//           'GERANDO...', v_task_title, v_task_desc, v_next_due_date, NOW()
//         ) RETURNING id INTO v_new_task_id;
//
//         INSERT INTO public.audit_executions (
//           audit_id, task_id, assignee_id, plant_id, status
//         ) VALUES (
//           v_audit.id, v_new_task_id, NEW.assignee_id, NEW.plant_id, 'Pendente'
//         );
//       END IF;
//     END IF;
//
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION get_attendance_employees(uuid, text, uuid[])
//   CREATE OR REPLACE FUNCTION public.get_attendance_employees(p_plant_id uuid, p_reference_month text, p_staff_log_ids uuid[])
//    RETURNS TABLE(id uuid, name text, company_name text, function_id uuid, status text, registration_number text, reference_month text, created_at timestamp with time zone)
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     RETURN QUERY
//     WITH RankedEmployees AS (
//       SELECT
//         e.id,
//         e.name,
//         e.company_name,
//         e.function_id,
//         e.status,
//         e.registration_number,
//         e.reference_month,
//         e.created_at,
//         -- Group duplicates by registration number, name, or id
//         ROW_NUMBER() OVER (
//           PARTITION BY COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name)), e.id::TEXT)
//           ORDER BY
//             -- Priorities for selecting the best duplicate record
//             CASE WHEN e.id = ANY(p_staff_log_ids) THEN 0 ELSE 1 END,
//             CASE WHEN e.reference_month = p_reference_month THEN 0 ELSE 1 END,
//             CASE WHEN e.status = 'Ativo' THEN 0 ELSE 1 END,
//             e.created_at DESC
//         ) as rn
//       FROM public.employees e
//       WHERE e.plant_id = p_plant_id
//     )
//     SELECT
//       re.id,
//       re.name,
//       re.company_name,
//       re.function_id,
//       re.status,
//       re.registration_number,
//       re.reference_month,
//       re.created_at
//     FROM RankedEmployees re
//     WHERE re.rn = 1
//       AND (
//         re.id = ANY(p_staff_log_ids)
//         OR re.status = 'Ativo'
//         OR (re.status = 'Inativo' AND re.reference_month > p_reference_month)
//       );
//   END;
//   $function$
//
// FUNCTION get_attendance_employees(uuid, date)
//   CREATE OR REPLACE FUNCTION public.get_attendance_employees(p_plant_id uuid, p_date date)
//    RETURNS TABLE(id uuid, name text, company_name text, function_id uuid, location_id uuid, status text, log_status boolean, log_id uuid)
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//       IF NOT public.is_plant_authorized(p_plant_id) THEN
//           RETURN;
//       END IF;
//
//       RETURN QUERY
//       SELECT DISTINCT ON (e.id)
//           e.id,
//           e.name,
//           e.company_name,
//           e.function_id,
//           e.location_id,
//           e.status,
//           l.status as log_status,
//           l.id as log_id
//       FROM public.employees e
//       LEFT JOIN public.daily_logs l
//           ON l.reference_id = e.id
//           AND l.type = 'staff'
//           AND l.date::DATE = p_date
//       WHERE e.plant_id = p_plant_id
//         AND COALESCE(e.status, '') != 'Inativo'
//       ORDER BY e.id, l.status DESC NULLS LAST;
//   END;
//   $function$
//
// FUNCTION get_attendance_employees(uuid, uuid[], text)
//   CREATE OR REPLACE FUNCTION public.get_attendance_employees(p_client_id uuid, p_plant_ids uuid[] DEFAULT NULL::uuid[], p_reference_month text DEFAULT NULL::text)
//    RETURNS SETOF employees
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//       RETURN QUERY
//       SELECT DISTINCT ON (
//           e.plant_id,
//           COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name)))
//       )
//           e.*
//       FROM public.employees e
//       WHERE e.client_id = p_client_id
//         AND (p_plant_ids IS NULL OR e.plant_id = ANY(p_plant_ids))
//         AND e.status = 'Ativo'
//       ORDER BY
//           e.plant_id,
//           COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name))),
//           e.updated_at DESC;
//   END;
//   $function$
//
// FUNCTION get_attendance_employees(uuid, character varying, uuid[])
//   CREATE OR REPLACE FUNCTION public.get_attendance_employees(p_plant_id uuid, p_reference_month character varying, p_staff_log_ids uuid[] DEFAULT '{}'::uuid[])
//    RETURNS SETOF employees
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     RETURN QUERY
//     SELECT DISTINCT ON (LOWER(TRIM(COALESCE(e.name, e.id::TEXT))))
//       e.*
//     FROM public.employees e
//     WHERE e.plant_id = p_plant_id
//       AND (e.status = 'Ativo' OR e.id = ANY(p_staff_log_ids))
//       AND (e.reference_month = p_reference_month OR e.reference_month IS NULL)
//     ORDER BY LOWER(TRIM(COALESCE(e.name, e.id::TEXT))), e.reference_month DESC NULLS LAST, e.created_at DESC;
//   END;
//   $function$
//
// FUNCTION get_maintenance_public_options(text)
//   CREATE OR REPLACE FUNCTION public.get_maintenance_public_options(p_slug text)
//    RETURNS jsonb
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_client_id UUID;
//     v_client_name TEXT;
//     v_logo_url TEXT;
//     v_primary_color TEXT;
//     v_result JSONB;
//   BEGIN
//     SELECT id, name, logo_url, primary_color INTO v_client_id, v_client_name, v_logo_url, v_primary_color
//     FROM public.clients WHERE url_slug = p_slug AND status = 'Ativo';
//
//     IF v_client_id IS NULL THEN
//       RETURN NULL;
//     END IF;
//
//     SELECT jsonb_build_object(
//       'client', jsonb_build_object('id', v_client_id, 'name', v_client_name, 'logo_url', v_logo_url, 'primary_color', v_primary_color),
//       'plants', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name)), '[]'::jsonb) FROM public.plants WHERE client_id = v_client_id),
//       'areas', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'plant_id', plant_id)), '[]'::jsonb) FROM public.maintenance_areas WHERE client_id = v_client_id),
//       'sublocations', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'area_id', area_id)), '[]'::jsonb) FROM public.maintenance_sublocations WHERE client_id = v_client_id),
//       'assets', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'plant_id', plant_id, 'area_id', area_id, 'sublocation_id', sublocation_id)), '[]'::jsonb) FROM public.maintenance_assets WHERE client_id = v_client_id AND status = 'Ativo')
//     ) INTO v_result;
//
//     RETURN v_result;
//   END;
//   $function$
//
// FUNCTION get_user_authorized_plants()
//   CREATE OR REPLACE FUNCTION public.get_user_authorized_plants()
//    RETURNS jsonb
//    LANGUAGE sql
//    STABLE SECURITY DEFINER
//    SET search_path TO 'public'
//   AS $function$
//     SELECT authorized_plants FROM public.profiles WHERE id = auth.uid() LIMIT 1;
//   $function$
//
// FUNCTION get_user_client_id()
//   CREATE OR REPLACE FUNCTION public.get_user_client_id()
//    RETURNS uuid
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_client_id uuid;
//   BEGIN
//     SELECT client_id INTO v_client_id FROM public.profiles WHERE id = auth.uid();
//     RETURN v_client_id;
//   END;
//   $function$
//
// FUNCTION get_user_role()
//   CREATE OR REPLACE FUNCTION public.get_user_role()
//    RETURNS text
//    LANGUAGE sql
//    STABLE SECURITY DEFINER
//    SET search_path TO 'public'
//   AS $function$
//     SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
//   $function$
//
// FUNCTION handle_audit_assignment_inserted()
//   CREATE OR REPLACE FUNCTION public.handle_audit_assignment_inserted()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_audit record;
//     v_type_id uuid;
//     v_status_id uuid;
//     v_task_id uuid;
//     v_due_date timestamptz;
//     v_base_date timestamp;
//     v_next_date timestamp;
//   BEGIN
//     SELECT * INTO v_audit FROM public.audits WHERE id = NEW.audit_id;
//     IF NOT FOUND THEN RETURN NEW; END IF;
//
//     IF v_audit.status != 'Ativa' AND v_audit.status != 'Ativo' THEN RETURN NEW; END IF;
//
//     IF NOT EXISTS (SELECT 1 FROM public.audit_executions WHERE audit_id = NEW.audit_id AND assignee_id = NEW.assignee_id AND plant_id = NEW.plant_id) THEN
//       -- Get Task Type
//       SELECT id INTO v_type_id FROM public.task_types WHERE client_id = v_audit.client_id AND name ILIKE '%Auditoria%' LIMIT 1;
//       IF v_type_id IS NULL THEN
//         INSERT INTO public.task_types (client_id, name, sla_hours) VALUES (v_audit.client_id, 'Auditoria', 24) RETURNING id INTO v_type_id;
//       END IF;
//
//       -- Get Status
//       SELECT id INTO v_status_id FROM public.task_statuses WHERE client_id = v_audit.client_id AND name = 'Aberta' LIMIT 1;
//       IF v_status_id IS NULL THEN
//         SELECT id INTO v_status_id FROM public.task_statuses WHERE client_id = v_audit.client_id AND is_terminal = false ORDER BY created_at LIMIT 1;
//       END IF;
//
//       v_base_date := v_audit.start_date::timestamp;
//
//       IF v_audit.frequency = 'Diária' THEN
//         v_next_date := v_base_date + INTERVAL '1 day';
//       ELSIF v_audit.frequency = 'Semanal' THEN
//         v_next_date := v_base_date + INTERVAL '1 week';
//       ELSIF v_audit.frequency = 'Quinzenal' THEN
//         v_next_date := v_base_date + INTERVAL '15 days';
//       ELSIF v_audit.frequency = 'Mensal' THEN
//         v_next_date := v_base_date + INTERVAL '1 month';
//       ELSIF v_audit.frequency = 'Bimestral' THEN
//         v_next_date := v_base_date + INTERVAL '2 months';
//       ELSIF v_audit.frequency = 'Trimestral' THEN
//         v_next_date := v_base_date + INTERVAL '3 months';
//       ELSIF v_audit.frequency = 'Semestral' THEN
//         v_next_date := v_base_date + INTERVAL '6 months';
//       ELSIF v_audit.frequency = 'Anual' THEN
//         v_next_date := v_base_date + INTERVAL '1 year';
//       ELSE
//         v_next_date := v_base_date;
//       END IF;
//
//       IF v_audit.sla_days IS NOT NULL THEN
//         v_due_date := v_next_date + (v_audit.sla_days || ' days')::interval;
//       ELSE
//         v_due_date := v_next_date;
//       END IF;
//
//       INSERT INTO public.tasks (
//         client_id, plant_id, type_id, status_id, requester_id, assignee_id,
//         title, description, task_number, due_date
//       ) VALUES (
//         v_audit.client_id, NEW.plant_id, v_type_id, v_status_id,
//         NEW.assignee_id, NEW.assignee_id,
//         'Auditoria: ' || v_audit.title,
//         'Execução automática de auditoria: ' || v_audit.title || '. Frequência: ' || v_audit.frequency || '.',
//         'GERANDO...',
//         v_due_date
//       ) RETURNING id INTO v_task_id;
//
//       INSERT INTO public.audit_executions (
//         audit_id, plant_id, assignee_id, status, task_id
//       ) VALUES (
//         v_audit.id, NEW.plant_id, NEW.assignee_id, 'Pendente', v_task_id
//       );
//     END IF;
//
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION handle_audit_execution_finalized()
//   CREATE OR REPLACE FUNCTION public.handle_audit_execution_finalized()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_audit record;
//     v_base_date timestamp;
//     v_next_date timestamp;
//     v_next_due_date timestamp;
//     v_task_type_id uuid;
//     v_task_status_id uuid;
//     v_new_task_id uuid;
//     v_task_participants text[];
//   BEGIN
//     IF NEW.status = 'Finalizado' AND (OLD.status IS DISTINCT FROM 'Finalizado') THEN
//       SELECT * INTO v_audit FROM public.audits WHERE id = NEW.audit_id;
//
//       IF v_audit.frequency != 'Única' THEN
//         -- Base date uses realization_date, fallback to created_at
//         v_base_date := COALESCE(NEW.realization_date::TIMESTAMP, NEW.created_at);
//
//         IF v_audit.frequency = 'Diária' THEN
//           v_next_date := v_base_date + INTERVAL '1 day';
//         ELSIF v_audit.frequency = 'Semanal' THEN
//           v_next_date := v_base_date + INTERVAL '1 week';
//         ELSIF v_audit.frequency = 'Quinzenal' THEN
//           v_next_date := v_base_date + INTERVAL '15 days';
//         ELSIF v_audit.frequency = 'Mensal' THEN
//           v_next_date := v_base_date + INTERVAL '1 month';
//         ELSIF v_audit.frequency = 'Bimestral' THEN
//           v_next_date := v_base_date + INTERVAL '2 months';
//         ELSIF v_audit.frequency = 'Trimestral' THEN
//           v_next_date := v_base_date + INTERVAL '3 months';
//         ELSIF v_audit.frequency = 'Semestral' THEN
//           v_next_date := v_base_date + INTERVAL '6 months';
//         ELSIF v_audit.frequency = 'Anual' THEN
//           v_next_date := v_base_date + INTERVAL '1 year';
//         ELSE
//           v_next_date := v_base_date + INTERVAL '1 month';
//         END IF;
//
//         -- Add SLA days if defined
//         IF v_audit.sla_days IS NOT NULL THEN
//           v_next_due_date := v_next_date + (v_audit.sla_days || ' days')::interval;
//         ELSE
//           v_next_due_date := v_next_date;
//         END IF;
//
//         -- Get Task Type 'Auditoria'
//         SELECT id INTO v_task_type_id
//         FROM public.task_types
//         WHERE client_id = v_audit.client_id AND name ILIKE '%Auditoria%'
//         LIMIT 1;
//
//         -- Get Initial Status
//         SELECT id INTO v_task_status_id
//         FROM public.task_statuses
//         WHERE client_id = v_audit.client_id AND is_terminal = false
//         ORDER BY created_at ASC
//         LIMIT 1;
//
//         IF v_task_type_id IS NOT NULL AND v_task_status_id IS NOT NULL THEN
//
//           IF NEW.task_id IS NOT NULL THEN
//             SELECT participants_ids INTO v_task_participants FROM public.tasks WHERE id = NEW.task_id;
//           END IF;
//
//           INSERT INTO public.tasks (
//             client_id,
//             plant_id,
//             type_id,
//             status_id,
//             requester_id,
//             assignee_id,
//             task_number,
//             title,
//             description,
//             due_date,
//             status_updated_at,
//             participants_ids
//           ) VALUES (
//             v_audit.client_id,
//             NEW.plant_id,
//             v_task_type_id,
//             v_task_status_id,
//             NEW.assignee_id,
//             NEW.assignee_id,
//             'GERANDO...',
//             'Auditoria: ' || v_audit.title,
//             'Execução automática de auditoria: ' || v_audit.title || '. Frequência: ' || v_audit.frequency || '.',
//             v_next_due_date,
//             NOW(),
//             v_task_participants
//           ) RETURNING id INTO v_new_task_id;
//
//           INSERT INTO public.audit_executions (
//             audit_id,
//             plant_id,
//             assignee_id,
//             task_id,
//             status
//           ) VALUES (
//             v_audit.id,
//             NEW.plant_id,
//             NEW.assignee_id,
//             v_new_task_id,
//             'Pendente'
//           );
//         END IF;
//       END IF;
//     END IF;
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION handle_employee_registration_number()
//   CREATE OR REPLACE FUNCTION public.handle_employee_registration_number()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//       -- If registration_number is null or empty, check if there's another employee with the same name and plant
//       IF NEW.registration_number IS NULL OR TRIM(NEW.registration_number) = '' THEN
//           SELECT registration_number INTO NEW.registration_number
//           FROM public.employees
//           WHERE client_id = NEW.client_id
//             AND plant_id = NEW.plant_id
//             AND LOWER(TRIM(name)) = LOWER(TRIM(NEW.name))
//             AND registration_number IS NOT NULL
//             AND TRIM(registration_number) != ''
//           ORDER BY updated_at DESC
//           LIMIT 1;
//       END IF;
//       RETURN NEW;
//   END;
//   $function$
//
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
// FUNCTION handle_task_status_change()
//   CREATE OR REPLACE FUNCTION public.handle_task_status_change()
//    RETURNS trigger
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     IF NEW.status_id <> OLD.status_id THEN
//       NEW.status_updated_at := NOW();
//
//       IF EXISTS (SELECT 1 FROM task_statuses WHERE id = NEW.status_id AND is_terminal = true) THEN
//         IF NEW.closed_at IS NULL THEN
//           NEW.closed_at := NOW();
//         END IF;
//       ELSE
//         NEW.closed_at := NULL;
//       END IF;
//     END IF;
//
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION is_client_active()
//   CREATE OR REPLACE FUNCTION public.is_client_active()
//    RETURNS boolean
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_role text;
//     v_client_id uuid;
//     v_status text;
//   BEGIN
//     SELECT role, client_id INTO v_role, v_client_id FROM public.profiles WHERE id = auth.uid();
//     IF v_role = 'Master' THEN
//       RETURN true;
//     END IF;
//     IF v_client_id IS NULL THEN
//       RETURN false;
//     END IF;
//     SELECT status INTO v_status FROM public.clients WHERE id = v_client_id;
//     RETURN v_status = 'Ativo';
//   END;
//   $function$
//
// FUNCTION is_plant_authorized(uuid)
//   CREATE OR REPLACE FUNCTION public.is_plant_authorized(p_id uuid)
//    RETURNS boolean
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_authorized_plants jsonb;
//     v_role text;
//     v_client_id uuid;
//   BEGIN
//     -- Get user profile info
//     SELECT authorized_plants, lower(role), client_id INTO v_authorized_plants, v_role, v_client_id
//     FROM public.profiles
//     WHERE id = auth.uid();
//
//     -- Master has full access
//     IF v_role = 'master' THEN
//       RETURN true;
//     END IF;
//
//     -- Admin has access to all plants of their client
//     IF v_role IN ('admin', 'administrador') THEN
//       IF EXISTS (SELECT 1 FROM public.plants WHERE id = p_id AND client_id = v_client_id) THEN
//           RETURN true;
//       END IF;
//     END IF;
//
//     -- Operator / User must have the plant in authorized_plants
//     IF v_authorized_plants IS NOT NULL AND jsonb_typeof(v_authorized_plants) = 'array' THEN
//       IF v_authorized_plants @> to_jsonb(p_id::text) OR v_authorized_plants @> to_jsonb(p_id) THEN
//         RETURN true;
//       END IF;
//     END IF;
//
//     RETURN false;
//   END;
//   $function$
//
// FUNCTION log_audit_action()
//   CREATE OR REPLACE FUNCTION public.log_audit_action()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_user_id uuid;
//     v_client_id uuid;
//     v_action text;
//     v_details text;
//   BEGIN
//     -- Attempt to get the user ID making the request
//     v_user_id := auth.uid();
//
//     -- Gather details based on operation
//     IF TG_OP = 'DELETE' THEN
//       v_client_id := OLD.client_id;
//       v_details := 'Registro removido da tabela ' || TG_TABLE_NAME || ' (ID: ' || OLD.id || ')';
//       v_action := 'Exclusão';
//     ELSIF TG_OP = 'INSERT' THEN
//       v_client_id := NEW.client_id;
//       v_details := 'Novo registro adicionado na tabela ' || TG_TABLE_NAME || ' (ID: ' || NEW.id || ')';
//       v_action := 'Inclusão';
//     ELSIF TG_OP = 'UPDATE' THEN
//       v_client_id := NEW.client_id;
//       v_details := 'Registro atualizado na tabela ' || TG_TABLE_NAME || ' (ID: ' || NEW.id || ')';
//       v_action := 'Atualização';
//     END IF;
//
//     -- Only insert if we have context (user ID and client ID)
//     IF v_user_id IS NOT NULL AND v_client_id IS NOT NULL THEN
//       INSERT INTO public.audit_logs (client_id, user_id, action_type, details)
//       VALUES (v_client_id, v_user_id, v_action, v_details);
//     END IF;
//
//     -- Return appropriately
//     IF TG_OP = 'DELETE' THEN
//       RETURN OLD;
//     ELSE
//       RETURN NEW;
//     END IF;
//   END;
//   $function$
//
// FUNCTION migrate_client_data(uuid, uuid)
//   CREATE OR REPLACE FUNCTION public.migrate_client_data(source_client_id uuid, target_client_id uuid)
//    RETURNS void
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     IF source_client_id = target_client_id THEN
//       RETURN;
//     END IF;
//
//     -- Core tables
//     UPDATE public.plants SET client_id = target_client_id WHERE client_id = source_client_id;
//     UPDATE public.companies SET client_id = target_client_id WHERE client_id = source_client_id;
//     UPDATE public.functions SET client_id = target_client_id WHERE client_id = source_client_id;
//     UPDATE public.locations SET client_id = target_client_id WHERE client_id = source_client_id;
//     UPDATE public.equipment SET client_id = target_client_id WHERE client_id = source_client_id;
//     UPDATE public.trainings SET client_id = target_client_id WHERE client_id = source_client_id;
//     UPDATE public.package_types SET client_id = target_client_id WHERE client_id = source_client_id;
//     UPDATE public.task_statuses SET client_id = target_client_id WHERE client_id = source_client_id;
//     UPDATE public.task_types SET client_id = target_client_id WHERE client_id = source_client_id;
//     UPDATE public.goals_book SET client_id = target_client_id WHERE client_id = source_client_id;
//
//     -- Child tables
//     UPDATE public.employees SET client_id = target_client_id WHERE client_id = source_client_id;
//     UPDATE public.contracted_headcount SET client_id = target_client_id WHERE client_id = source_client_id;
//     UPDATE public.employee_training_records SET client_id = target_client_id WHERE client_id = source_client_id;
//     UPDATE public.function_required_trainings SET client_id = target_client_id WHERE client_id = source_client_id;
//     UPDATE public.cleaning_gardening_areas SET client_id = target_client_id WHERE client_id = source_client_id;
//     UPDATE public.cleaning_gardening_schedules SET client_id = target_client_id WHERE client_id = source_client_id;
//     UPDATE public.daily_logs SET client_id = target_client_id WHERE client_id = source_client_id;
//     UPDATE public.monthly_goals_data SET client_id = target_client_id WHERE client_id = source_client_id;
//     UPDATE public.packages SET client_id = target_client_id WHERE client_id = source_client_id;
//     UPDATE public.plant_non_working_days SET client_id = target_client_id WHERE client_id = source_client_id;
//     UPDATE public.tasks SET client_id = target_client_id WHERE client_id = source_client_id;
//     UPDATE public.audits SET client_id = target_client_id WHERE client_id = source_client_id;
//     UPDATE public.audit_logs SET client_id = target_client_id WHERE client_id = source_client_id;
//
//     -- Update profiles but leave Master alone to prevent access loss
//     UPDATE public.profiles SET client_id = target_client_id WHERE client_id = source_client_id AND role NOT IN ('Master');
//   END;
//   $function$
//
// FUNCTION prevent_duplicate_employee()
//   CREATE OR REPLACE FUNCTION public.prevent_duplicate_employee()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     IF EXISTS (
//       SELECT 1 FROM public.employees
//       WHERE client_id = NEW.client_id
//         AND lower(trim(name)) = lower(trim(NEW.name))
//         AND lower(trim(company_name)) = lower(trim(NEW.company_name))
//         AND reference_month = NEW.reference_month
//         AND id != NEW.id
//     ) THEN
//       RAISE EXCEPTION 'Um colaborador com o mesmo nome e empresa já existe neste mês de referência.';
//     END IF;
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION prevent_employee_deletion_with_logs()
//   CREATE OR REPLACE FUNCTION public.prevent_employee_deletion_with_logs()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     IF EXISTS (SELECT 1 FROM public.daily_logs WHERE reference_id = OLD.id AND type = 'staff') THEN
//       RAISE EXCEPTION 'Não é possível sobrescrever/excluir o colaborador pois existem lançamentos de presença vinculados a ele.';
//     END IF;
//     RETURN OLD;
//   END;
//   $function$
//
// FUNCTION prevent_equipment_deletion_with_logs()
//   CREATE OR REPLACE FUNCTION public.prevent_equipment_deletion_with_logs()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     IF EXISTS (SELECT 1 FROM public.daily_logs WHERE reference_id = OLD.id AND type = 'equipment') THEN
//       RAISE EXCEPTION 'Não é possível sobrescrever/excluir o equipamento pois existem lançamentos vinculados a ele.';
//     END IF;
//     RETURN OLD;
//   END;
//   $function$
//
// FUNCTION process_inventory_request()
//   CREATE OR REPLACE FUNCTION public.process_inventory_request()
//    RETURNS trigger
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     IF OLD.status != 'Entregue' AND NEW.status = 'Entregue' THEN
//       -- decrement stock
//       UPDATE public.inventory_products p
//       SET current_stock = p.current_stock - i.quantity
//       FROM public.inventory_request_items i
//       WHERE i.request_id = NEW.id AND p.id = i.product_id;
//     END IF;
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION set_audit_action_id_if_null()
//   CREATE OR REPLACE FUNCTION public.set_audit_action_id_if_null()
//    RETURNS trigger
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     IF NEW.id IS NULL THEN
//       NEW.id := gen_random_uuid();
//     END IF;
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION set_task_number()
//   CREATE OR REPLACE FUNCTION public.set_task_number()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_year TEXT;
//     v_seq INT;
//     v_max_retries INT := 3;
//     v_attempts INT := 0;
//   BEGIN
//     -- We use an advisory lock to prevent concurrent inserts for the same client
//     PERFORM pg_advisory_xact_lock(hashtext(NEW.client_id::text));
//
//     v_year := to_char(COALESCE(NEW.created_at, CURRENT_TIMESTAMP), 'YYYY');
//
//     LOOP
//       -- Calculate the next sequence for the given year
//       SELECT COALESCE(
//         MAX(
//           SUBSTRING(task_number FROM 'TSK-\d{4}-([0-9]+)')::INT
//         ), 0
//       ) + 1 INTO v_seq
//       FROM public.tasks
//       WHERE client_id = NEW.client_id AND task_number LIKE 'TSK-' || v_year || '-%';
//
//       NEW.task_number := 'TSK-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
//
//       -- Edge case check to retry if it already exists, as requested
//       IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE client_id = NEW.client_id AND task_number = NEW.task_number) THEN
//         EXIT;
//       END IF;
//
//       v_attempts := v_attempts + 1;
//       IF v_attempts >= v_max_retries THEN
//         RAISE EXCEPTION 'Failed to generate a unique task number after % attempts.', v_max_retries;
//       END IF;
//     END LOOP;
//
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION submit_audit_execution(uuid, jsonb, text, boolean, jsonb)
//   CREATE OR REPLACE FUNCTION public.submit_audit_execution(p_execution_id uuid, p_answers jsonb, p_participants text, p_is_draft boolean DEFAULT false, p_signatures jsonb DEFAULT '[]'::jsonb)
//    RETURNS jsonb
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_client_id uuid;
//     v_plant_id uuid;
//     v_task_id uuid;
//     v_terminal_status_id uuid;
//     v_final_score numeric := 0;
//     v_max_score numeric := 0;
//     v_action_count int := 0;
//     v_answer record;
//     v_answer_score numeric;
//     v_answer_max_score numeric;
//     v_action_weight numeric;
//     v_audit_max_scale numeric := 5;
//     v_scoring_settings jsonb;
//     v_participants_arr text[];
//     v_count int := 0;
//     v_p text;
//     v_audit_title text;
//     v_audit_sla numeric;
//     v_action_title text;
//     v_task_type_id uuid;
//     v_sla_hours numeric;
//     v_open_status_id uuid;
//     v_task_number text;
//     v_task_seq int;
//     v_task_year text;
//     v_user_id uuid;
//     v_new_status text;
//     v_due_date timestamptz;
//   BEGIN
//     v_user_id := auth.uid();
//
//     IF p_is_draft = false AND p_participants IS NOT NULL AND trim(p_participants) <> '' THEN
//       v_participants_arr := string_to_array(trim(p_participants), ',');
//       FOREACH v_p IN ARRAY v_participants_arr LOOP
//         IF trim(v_p) <> '' THEN
//           v_count := v_count + 1;
//         END IF;
//       END LOOP;
//       IF v_count > 0 AND (p_signatures IS NULL OR jsonb_array_length(p_signatures) < v_count) THEN
//         RAISE EXCEPTION 'Assinaturas obrigatórias não foram fornecidas para todos os participantes.';
//       END IF;
//     END IF;
//
//     SELECT a.client_id, e.task_id, a.scoring_settings, e.plant_id, a.title, a.sla_days
//     INTO v_client_id, v_task_id, v_scoring_settings, v_plant_id, v_audit_title, v_audit_sla
//     FROM public.audit_executions e
//     JOIN public.audits a ON a.id = e.audit_id
//     WHERE e.id = p_execution_id;
//
//     IF v_client_id IS NULL THEN
//       RAISE EXCEPTION 'Execution not found';
//     END IF;
//
//     IF v_scoring_settings IS NOT NULL AND jsonb_typeof(v_scoring_settings) = 'array' AND jsonb_array_length(v_scoring_settings) > 0 THEN
//       SELECT COALESCE(MAX((value->>'score')::numeric), 5) INTO v_audit_max_scale
//       FROM jsonb_array_elements(v_scoring_settings);
//     END IF;
//
//     SELECT id, sla_hours INTO v_task_type_id, v_sla_hours FROM public.task_types WHERE client_id = v_client_id AND name ILIKE '%Corretiva%' LIMIT 1;
//     IF v_task_type_id IS NULL THEN
//       SELECT id, sla_hours INTO v_task_type_id, v_sla_hours FROM public.task_types WHERE client_id = v_client_id ORDER BY created_at ASC LIMIT 1;
//     END IF;
//
//     SELECT id INTO v_open_status_id FROM public.task_statuses WHERE client_id = v_client_id AND is_terminal = false ORDER BY created_at ASC LIMIT 1;
//     v_task_year := to_char(NOW(), 'YYYY');
//
//     IF p_answers IS NOT NULL AND jsonb_typeof(p_answers) = 'array' THEN
//       FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers) LOOP
//         v_answer_score := (v_answer.value->>'score')::numeric;
//
//         SELECT COALESCE(weight, 1), title INTO v_action_weight, v_action_title
//         FROM public.audit_actions
//         WHERE id = (v_answer.value->>'action_id')::uuid;
//
//         v_answer_max_score := v_audit_max_scale * COALESCE(v_action_weight, 1);
//
//         IF v_answer_score IS NOT NULL THEN
//           v_answer_score := v_answer_score * COALESCE(v_action_weight, 1);
//         ELSIF v_answer_score IS NULL THEN
//           v_answer_max_score := 0;
//         END IF;
//
//         INSERT INTO public.audit_execution_answers (
//           execution_id, action_id, score, observations, evidence_url, corrective_assignee_id, corrective_due_date
//         ) VALUES (
//           p_execution_id,
//           (v_answer.value->>'action_id')::uuid,
//           (v_answer.value->>'score')::integer,
//           v_answer.value->>'observations',
//           v_answer.value->>'evidence_url',
//           NULLIF(v_answer.value->>'corrective_assignee_id', '')::uuid,
//           NULLIF(v_answer.value->>'corrective_due_date', '')::timestamptz
//         )
//         ON CONFLICT (execution_id, action_id) DO UPDATE SET
//           score = EXCLUDED.score,
//           observations = EXCLUDED.observations,
//           evidence_url = EXCLUDED.evidence_url,
//           corrective_assignee_id = EXCLUDED.corrective_assignee_id,
//           corrective_due_date = EXCLUDED.corrective_due_date;
//
//         v_final_score := v_final_score + COALESCE(v_answer_score, 0);
//         v_max_score := v_max_score + COALESCE(v_answer_max_score, 0);
//         v_action_count := v_action_count + 1;
//
//         IF p_is_draft = false AND v_answer.value->>'score' IS NOT NULL AND v_scoring_settings IS NOT NULL THEN
//           IF EXISTS (
//             SELECT 1 FROM jsonb_array_elements(v_scoring_settings) AS s
//             WHERE (s->>'score')::numeric = (v_answer.value->>'score')::numeric
//               AND (s->>'trigger_task')::boolean = true
//           ) AND NULLIF(v_answer.value->>'corrective_assignee_id', '') IS NOT NULL THEN
//
//             PERFORM pg_advisory_xact_lock(hashtext(v_client_id::text));
//             SELECT COALESCE(MAX(SUBSTRING(task_number FROM 'TSK-\d{4}-([0-9]+)')::INT), 0) + 1 INTO v_task_seq
//             FROM public.tasks
//             WHERE client_id = v_client_id AND task_number LIKE 'TSK-' || v_task_year || '-%';
//             v_task_number := 'TSK-' || v_task_year || '-' || LPAD(v_task_seq::TEXT, 4, '0');
//
//             v_due_date := COALESCE(
//               NULLIF(v_answer.value->>'corrective_due_date', '')::timestamptz,
//               NOW() + (COALESCE(v_audit_sla, COALESCE(v_sla_hours, 24) / 24.0, 1) * interval '1 day')
//             );
//
//             INSERT INTO public.tasks (
//               client_id, plant_id, type_id, status_id, requester_id, assignee_id,
//               task_number, title, description, due_date, status_updated_at
//             ) VALUES (
//               v_client_id,
//               v_plant_id,
//               v_task_type_id,
//               v_open_status_id,
//               COALESCE(v_user_id, NULLIF(v_answer.value->>'corrective_assignee_id', '')::uuid),
//               NULLIF(v_answer.value->>'corrective_assignee_id', '')::uuid,
//               v_task_number,
//               'Ação Corretiva: ' || v_audit_title || ' - ' || v_action_title,
//               COALESCE(v_answer.value->>'observations', 'Ação corretiva gerada automaticamente a partir de auditoria.'),
//               v_due_date,
//               NOW()
//             );
//           END IF;
//         END IF;
//
//       END LOOP;
//     END IF;
//
//     v_new_status := CASE WHEN p_is_draft THEN 'Rascunho' ELSE 'Finalizado' END;
//
//     UPDATE public.audit_executions SET
//       status = v_new_status,
//       realization_date = CURRENT_DATE,
//       participants = p_participants,
//       signatures = COALESCE(p_signatures, '[]'::jsonb),
//       final_score = v_final_score,
//       max_score = v_max_score
//     WHERE id = p_execution_id;
//
//     IF p_is_draft = false AND v_task_id IS NOT NULL THEN
//       SELECT id INTO v_terminal_status_id
//       FROM public.task_statuses
//       WHERE client_id = v_client_id AND is_terminal = true
//       ORDER BY created_at ASC LIMIT 1;
//
//       IF v_terminal_status_id IS NOT NULL THEN
//         UPDATE public.tasks SET
//           status_id = v_terminal_status_id,
//           closed_at = NOW(),
//           status_updated_at = NOW()
//         WHERE id = v_task_id;
//       END IF;
//     END IF;
//
//     RETURN jsonb_build_object(
//       'success', true,
//       'final_score', v_final_score,
//       'max_score', v_max_score,
//       'status', v_new_status
//     );
//   END;
//   $function$
//
// FUNCTION submit_audit_execution(uuid, json, text, boolean, json)
//   CREATE OR REPLACE FUNCTION public.submit_audit_execution(p_execution_id uuid, p_answers json, p_participants text, p_is_draft boolean DEFAULT false, p_signatures json DEFAULT NULL::json)
//    RETURNS json
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_execution record;
//     v_audit record;
//     v_answer record;
//     v_total_score numeric := 0;
//     v_max_score numeric := 0;
//     v_task_type_id uuid;
//     v_task_status_id uuid;
//     v_due_date timestamptz;
//     v_sla_hours numeric;
//   BEGIN
//     -- Get execution and audit details
//     SELECT * INTO v_execution FROM public.audit_executions WHERE id = p_execution_id;
//     IF NOT FOUND THEN RAISE EXCEPTION 'Execution not found'; END IF;
//
//     SELECT * INTO v_audit FROM public.audits WHERE id = v_execution.audit_id;
//
//     -- Update execution status and participants
//     UPDATE public.audit_executions
//     SET
//       status = CASE WHEN p_is_draft THEN 'Em Andamento' ELSE 'Finalizada' END,
//       participants = p_participants,
//       signatures = p_signatures,
//       realization_date = CASE WHEN NOT p_is_draft THEN NOW() ELSE realization_date END
//     WHERE id = p_execution_id;
//
//     -- If finalizing task
//     IF NOT p_is_draft AND v_execution.task_id IS NOT NULL THEN
//       UPDATE public.tasks
//       SET
//         status_id = COALESCE((SELECT id FROM public.task_statuses WHERE client_id = v_audit.client_id AND is_terminal = true LIMIT 1), status_id),
//         closed_at = NOW()
//       WHERE id = v_execution.task_id;
//     END IF;
//
//     DELETE FROM public.audit_execution_answers WHERE execution_id = p_execution_id;
//
//     FOR v_answer IN SELECT * FROM json_array_elements(p_answers)
//     LOOP
//       INSERT INTO public.audit_execution_answers (
//         execution_id, action_id, score, observations, evidence_url, corrective_assignee_id, corrective_due_date
//       ) VALUES (
//         p_execution_id,
//         (v_answer.value->>'action_id')::uuid,
//         (v_answer.value->>'score')::numeric,
//         v_answer.value->>'observations',
//         v_answer.value->>'evidence_url',
//         NULLIF(v_answer.value->>'corrective_assignee_id', '')::uuid,
//         (v_answer.value->>'corrective_due_date')::timestamp
//       );
//
//       IF (v_answer.value->>'score')::numeric IS NOT NULL THEN
//         v_total_score := v_total_score + (v_answer.value->>'score')::numeric;
//         v_max_score := v_max_score + COALESCE((SELECT weight FROM public.audit_actions WHERE id = (v_answer.value->>'action_id')::uuid), 1);
//       END IF;
//
//       IF NOT p_is_draft AND NULLIF(v_answer.value->>'corrective_assignee_id', '') IS NOT NULL THEN
//         SELECT id, sla_hours INTO v_task_type_id, v_sla_hours FROM public.task_types WHERE client_id = v_audit.client_id AND name = 'Ação Corretiva' LIMIT 1;
//         IF v_task_type_id IS NULL THEN
//           INSERT INTO public.task_types (client_id, name, sla_hours) VALUES (v_audit.client_id, 'Ação Corretiva', 48) RETURNING id, 48 INTO v_task_type_id, v_sla_hours;
//         END IF;
//
//         SELECT id INTO v_task_status_id FROM public.task_statuses WHERE client_id = v_audit.client_id AND name = 'Aberta' LIMIT 1;
//
//         IF v_answer.value->>'corrective_due_date' IS NOT NULL THEN
//           v_due_date := (v_answer.value->>'corrective_due_date')::timestamptz;
//         ELSE
//           v_due_date := NOW() + (COALESCE(v_audit.sla_days, COALESCE(v_sla_hours, 48) / 24.0, 2) * interval '1 day');
//         END IF;
//
//         INSERT INTO public.tasks (
//           client_id, plant_id, type_id, status_id, requester_id, assignee_id,
//           title, description, task_number, due_date
//         ) VALUES (
//           v_audit.client_id, v_execution.plant_id, v_task_type_id, v_task_status_id,
//           v_execution.assignee_id, (v_answer.value->>'corrective_assignee_id')::uuid,
//           'Ação Corretiva: ' || v_audit.title,
//           'Ação corretiva gerada pela auditoria. Obs: ' || COALESCE(v_answer.value->>'observations', ''),
//           'COR-' || upper(substr(md5(random()::text), 1, 6)),
//           v_due_date
//         );
//       END IF;
//     END LOOP;
//
//     UPDATE public.audit_executions
//     SET final_score = v_total_score, max_score = v_max_score
//     WHERE id = p_execution_id;
//
//     RETURN json_build_object('success', true, 'execution_id', p_execution_id);
//   END;
//   $function$
//
// FUNCTION submit_maintenance_ticket(uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb)
//   CREATE OR REPLACE FUNCTION public.submit_maintenance_ticket(p_client_id uuid, p_plant_id uuid, p_area_id uuid, p_sublocation_id uuid, p_asset_id uuid, p_requester_name text, p_requester_email text, p_description text, p_photos jsonb)
//    RETURNS jsonb
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_ticket_number TEXT;
//     v_status_id UUID;
//     v_ticket_id UUID;
//     v_year TEXT;
//     v_seq INT;
//   BEGIN
//     SELECT id INTO v_status_id FROM public.maintenance_statuses WHERE client_id = p_client_id ORDER BY order_index ASC LIMIT 1;
//     v_year := to_char(NOW(), 'YYYY');
//     SELECT COUNT(*) + 1 INTO v_seq FROM public.maintenance_tickets WHERE client_id = p_client_id AND ticket_number LIKE 'MAN-' || v_year || '-%';
//     v_ticket_number := 'MAN-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
//
//     INSERT INTO public.maintenance_tickets (
//       ticket_number, client_id, plant_id, area_id, sublocation_id, asset_id, status_id,
//       requester_name, requester_email, description, photos, origin
//     ) VALUES (
//       v_ticket_number, p_client_id, p_plant_id, p_area_id, p_sublocation_id, p_asset_id, v_status_id,
//       p_requester_name, p_requester_email, p_description, p_photos, 'Portal'
//     ) RETURNING id INTO v_ticket_id;
//
//     RETURN jsonb_build_object('success', true, 'ticket_number', v_ticket_number, 'id', v_ticket_id);
//   END;
//   $function$
//
// FUNCTION trigger_audit_daily_logs()
//   CREATE OR REPLACE FUNCTION public.trigger_audit_daily_logs()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_user_id uuid;
//   BEGIN
//     v_user_id := auth.uid();
//     IF v_user_id IS NULL THEN
//       v_user_id := '00000000-0000-0000-0000-000000000000'::uuid;
//     END IF;
//
//     INSERT INTO public.audit_logs (action_type, client_id, user_id, details)
//     VALUES (
//       TG_OP,
//       COALESCE(NEW.client_id, OLD.client_id),
//       v_user_id,
//       'Daily Log ' || TG_OP || ' for reference ' || COALESCE(NEW.reference_id, OLD.reference_id) || ' on date ' || COALESCE(NEW.date, OLD.date)::text
//     );
//
//     RETURN COALESCE(NEW, OLD);
//   END;
//   $function$
//

// --- TRIGGERS ---
// Table: audit_actions
//   ensure_audit_action_id: CREATE TRIGGER ensure_audit_action_id BEFORE INSERT ON public.audit_actions FOR EACH ROW WHEN ((new.id IS NULL)) EXECUTE FUNCTION set_audit_action_id_if_null()
// Table: audit_assignments
//   on_audit_assignment_created: CREATE TRIGGER on_audit_assignment_created AFTER INSERT ON public.audit_assignments FOR EACH ROW EXECUTE FUNCTION generate_initial_audit_executions()
//   tr_generate_initial_executions: CREATE TRIGGER tr_generate_initial_executions AFTER INSERT ON public.audit_assignments FOR EACH ROW EXECUTE FUNCTION generate_initial_audit_executions()
//   tr_handle_audit_assignment_inserted: CREATE TRIGGER tr_handle_audit_assignment_inserted AFTER INSERT ON public.audit_assignments FOR EACH ROW EXECUTE FUNCTION handle_audit_assignment_inserted()
// Table: audit_executions
//   on_audit_execution_finalized: CREATE TRIGGER on_audit_execution_finalized AFTER UPDATE OF status ON public.audit_executions FOR EACH ROW EXECUTE FUNCTION handle_audit_execution_finalized()
// Table: audit_logs
//   trigger_clean_audit_logs: CREATE TRIGGER trigger_clean_audit_logs AFTER INSERT ON public.audit_logs FOR EACH STATEMENT EXECUTE FUNCTION clean_old_audit_logs()
// Table: audits
//   tr_generate_initial_executions: CREATE TRIGGER tr_generate_initial_executions AFTER INSERT OR UPDATE ON public.audits FOR EACH ROW EXECUTE FUNCTION generate_initial_audit_executions()
// Table: cleaning_gardening_areas
//   audit_cleaning_gardening_areas: CREATE TRIGGER audit_cleaning_gardening_areas AFTER INSERT OR DELETE OR UPDATE ON public.cleaning_gardening_areas FOR EACH ROW EXECUTE FUNCTION log_audit_action()
// Table: cleaning_gardening_schedules
//   audit_cleaning_gardening_schedules: CREATE TRIGGER audit_cleaning_gardening_schedules AFTER INSERT OR DELETE OR UPDATE ON public.cleaning_gardening_schedules FOR EACH ROW EXECUTE FUNCTION log_audit_action()
// Table: daily_logs
//   audit_daily_logs: CREATE TRIGGER audit_daily_logs AFTER INSERT OR DELETE OR UPDATE ON public.daily_logs FOR EACH ROW EXECUTE FUNCTION trigger_audit_daily_logs()
// Table: employees
//   audit_employees: CREATE TRIGGER audit_employees AFTER INSERT OR DELETE ON public.employees FOR EACH ROW EXECUTE FUNCTION log_audit_action()
//   check_duplicate_employee: CREATE TRIGGER check_duplicate_employee BEFORE INSERT OR UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION check_duplicate_employee()
//   ensure_employee_registration_number: CREATE TRIGGER ensure_employee_registration_number BEFORE INSERT OR UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION handle_employee_registration_number()
//   on_employee_insert: CREATE TRIGGER on_employee_insert BEFORE INSERT ON public.employees FOR EACH ROW EXECUTE FUNCTION handle_employee_registration_number()
//   prevent_employee_deletion_with_logs_trigger: CREATE TRIGGER prevent_employee_deletion_with_logs_trigger BEFORE DELETE ON public.employees FOR EACH ROW EXECUTE FUNCTION prevent_employee_deletion_with_logs()
// Table: equipment
//   audit_equipment: CREATE TRIGGER audit_equipment AFTER INSERT OR DELETE ON public.equipment FOR EACH ROW EXECUTE FUNCTION log_audit_action()
//   prevent_equipment_deletion_with_logs_trigger: CREATE TRIGGER prevent_equipment_deletion_with_logs_trigger BEFORE DELETE ON public.equipment FOR EACH ROW EXECUTE FUNCTION prevent_equipment_deletion_with_logs()
// Table: functions
//   audit_functions: CREATE TRIGGER audit_functions AFTER INSERT OR DELETE ON public.functions FOR EACH ROW EXECUTE FUNCTION log_audit_action()
// Table: inventory_requests
//   on_inventory_request_delivered: CREATE TRIGGER on_inventory_request_delivered AFTER UPDATE OF status ON public.inventory_requests FOR EACH ROW EXECUTE FUNCTION process_inventory_request()
// Table: locations
//   audit_locations: CREATE TRIGGER audit_locations AFTER INSERT OR DELETE ON public.locations FOR EACH ROW EXECUTE FUNCTION log_audit_action()
// Table: packages
//   audit_packages: CREATE TRIGGER audit_packages AFTER INSERT OR DELETE OR UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION log_audit_action()
// Table: plant_non_working_days
//   audit_plant_non_working_days: CREATE TRIGGER audit_plant_non_working_days AFTER INSERT OR DELETE OR UPDATE ON public.plant_non_working_days FOR EACH ROW EXECUTE FUNCTION log_audit_action()
// Table: plants
//   audit_plants: CREATE TRIGGER audit_plants AFTER INSERT OR DELETE ON public.plants FOR EACH ROW EXECUTE FUNCTION log_audit_action()
// Table: sector_documents
//   audit_sector_documents: CREATE TRIGGER audit_sector_documents AFTER INSERT OR DELETE OR UPDATE ON public.sector_documents FOR EACH ROW EXECUTE FUNCTION log_audit_action()
// Table: task_statuses
//   audit_task_statuses: CREATE TRIGGER audit_task_statuses AFTER INSERT OR DELETE OR UPDATE ON public.task_statuses FOR EACH ROW EXECUTE FUNCTION log_audit_action()
// Table: task_types
//   audit_task_types: CREATE TRIGGER audit_task_types AFTER INSERT OR DELETE OR UPDATE ON public.task_types FOR EACH ROW EXECUTE FUNCTION log_audit_action()
// Table: tasks
//   audit_tasks: CREATE TRIGGER audit_tasks AFTER INSERT OR DELETE OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION log_audit_action()
//   on_task_insert: CREATE TRIGGER on_task_insert BEFORE INSERT ON public.tasks FOR EACH ROW EXECUTE FUNCTION set_task_number()
//   on_task_status_change: CREATE TRIGGER on_task_status_change BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION handle_task_status_change()

// --- INDEXES ---
// Table: audit_execution_answers
//   CREATE UNIQUE INDEX audit_execution_answers_execution_action_key ON public.audit_execution_answers USING btree (execution_id, action_id)
// Table: budget_accounts
//   CREATE UNIQUE INDEX budget_accounts_client_id_code_key ON public.budget_accounts USING btree (client_id, code)
// Table: budget_entries
//   CREATE UNIQUE INDEX budget_entries_client_id_cost_center_id_account_id_ref_key ON public.budget_entries USING btree (client_id, cost_center_id, account_id, reference_month)
// Table: clients
//   CREATE UNIQUE INDEX clients_url_slug_key ON public.clients USING btree (url_slug)
// Table: daily_logs
//   CREATE UNIQUE INDEX daily_logs_date_type_reference_id_key ON public.daily_logs USING btree (date, type, reference_id)
// Table: employee_training_records
//   CREATE UNIQUE INDEX employee_training_records_employee_id_training_id_key ON public.employee_training_records USING btree (employee_id, training_id)
// Table: employees
//   CREATE UNIQUE INDEX unique_active_employee_per_plant_month ON public.employees USING btree (client_id, plant_id, lower(TRIM(BOTH FROM name)), reference_month) WHERE (status = 'Ativo'::text)
// Table: function_required_trainings
//   CREATE UNIQUE INDEX function_required_trainings_function_id_training_id_key ON public.function_required_trainings USING btree (function_id, training_id)
// Table: functions
//   CREATE INDEX idx_functions_name_client ON public.functions USING btree (lower(TRIM(BOTH FROM name)), client_id)
// Table: locker_occupations
//   CREATE UNIQUE INDEX one_active_locker_per_collab ON public.locker_occupations USING btree (collaborator_id) WHERE (status = 'Ativo'::text)
// Table: maintenance_plan_checklist_items
//   CREATE INDEX idx_maintenance_plan_checklist_items_plan_id ON public.maintenance_plan_checklist_items USING btree (plan_id)
// Table: maintenance_tickets
//   CREATE UNIQUE INDEX maintenance_tickets_ticket_number_idx ON public.maintenance_tickets USING btree (client_id, ticket_number)
// Table: monthly_goals_data
//   CREATE UNIQUE INDEX monthly_goals_data_plant_id_goal_id_reference_month_key ON public.monthly_goals_data USING btree (plant_id, goal_id, reference_month)
// Table: packages
//   CREATE UNIQUE INDEX packages_client_id_protocol_number_key ON public.packages USING btree (client_id, protocol_number)
// Table: plant_non_working_days
//   CREATE UNIQUE INDEX plant_non_working_days_plant_id_date_key ON public.plant_non_working_days USING btree (plant_id, date)
// Table: tasks
//   CREATE UNIQUE INDEX tasks_client_id_task_number_key ON public.tasks USING btree (client_id, task_number)
// Table: user_plants
//   CREATE UNIQUE INDEX user_plants_user_id_plant_id_key ON public.user_plants USING btree (user_id, plant_id)
