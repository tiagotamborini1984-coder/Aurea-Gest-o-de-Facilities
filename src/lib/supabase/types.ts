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
          location_id: string | null
          name: string
          plant_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          location_id?: string | null
          name: string
          plant_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          location_id?: string | null
          name?: string
          plant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'functions_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'functions_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'functions_plant_id_fkey'
            columns: ['plant_id']
            isOneToOne: false
            referencedRelation: 'plants'
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
              p_staff_log_ids?: string[]
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
