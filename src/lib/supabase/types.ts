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
          created_at: string
          evidence_required: boolean
          id: string
          order_index: number
          title: string
        }
        Insert: {
          audit_id: string
          created_at?: string
          evidence_required?: boolean
          id?: string
          order_index?: number
          title: string
        }
        Update: {
          audit_id?: string
          created_at?: string
          evidence_required?: boolean
          id?: string
          order_index?: number
          title?: string
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
          created_at: string
          evidence_url: string | null
          execution_id: string
          id: string
          observations: string | null
          score: number | null
        }
        Insert: {
          action_id: string
          created_at?: string
          evidence_url?: string | null
          execution_id: string
          id?: string
          observations?: string | null
          score?: number | null
        }
        Update: {
          action_id?: string
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
          start_date: string
          title: string
          type: string
        }
        Insert: {
          advance_notice_days?: number | null
          client_id: string
          created_at?: string
          frequency?: string
          id?: string
          start_date: string
          title: string
          type?: string
        }
        Update: {
          advance_notice_days?: number | null
          client_id?: string
          created_at?: string
          frequency?: string
          id?: string
          start_date?: string
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
          type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          plant_id: string
          type: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          plant_id?: string
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
          package_alert_days: number
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
          package_alert_days?: number
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
          package_alert_days?: number
          primary_color?: string | null
          secondary_color?: string | null
          status?: string
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
        }
        Relationships: [
          {
            foreignKeyName: 'locker_collaborators_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
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
          client_id: string
          closure_notes: string | null
          closure_photos: Json | null
          created_at: string
          description: string
          id: string
          location_id: string | null
          origin: string
          photos: Json | null
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
          client_id: string
          closure_notes?: string | null
          closure_photos?: Json | null
          created_at?: string
          description: string
          id?: string
          location_id?: string | null
          origin?: string
          photos?: Json | null
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
          client_id?: string
          closure_notes?: string | null
          closure_photos?: Json | null
          created_at?: string
          description?: string
          id?: string
          location_id?: string | null
          origin?: string
          photos?: Json | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_maintenance_public_options: {
        Args: { p_slug: string }
        Returns: Json
      }
      get_user_authorized_plants: { Args: never; Returns: Json }
      get_user_client_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      is_plant_authorized: { Args: { p_id: string }; Returns: boolean }
      migrate_client_data: {
        Args: { source_client_id: string; target_client_id: string }
        Returns: undefined
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
// Table: daily_logs
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   date: date (not null)
//   plant_id: uuid (not null)
//   type: text (not null)
//   reference_id: uuid (not null)
//   status: boolean (not null, default: false)
//   created_at: timestamp with time zone (not null, default: now())
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
// Table: equipment
//   id: uuid (not null, default: gen_random_uuid())
//   client_id: uuid (not null)
//   plant_id: uuid (not null)
//   name: text (not null)
//   type: text (not null)
//   quantity: integer (not null, default: 1)
//   created_at: timestamp with time zone (not null, default: now())
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
//   name: text (not null)
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
// Table: locations
//   FOREIGN KEY locations_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY locations_pkey: PRIMARY KEY (id)
//   FOREIGN KEY locations_plant_id_fkey: FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
// Table: locker_collaborators
//   FOREIGN KEY locker_collaborators_client_id_fkey: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
//   PRIMARY KEY locker_collaborators_pkey: PRIMARY KEY (id)
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
//   PRIMARY KEY maintenance_tickets_pkey: PRIMARY KEY (id)
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

// --- ROW LEVEL SECURITY POLICIES ---
// Table: accidents
//   Policy "plant_isolation_accidents" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
//     WITH CHECK: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
// Table: audit_actions
//   Policy "generic_access_audit_actions" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: audit_assignments
//   Policy "plant_isolation_audit_assignments" (ALL, PERMISSIVE) roles={authenticated}
//     USING: is_plant_authorized(plant_id)
//     WITH CHECK: is_plant_authorized(plant_id)
// Table: audit_execution_answers
//   Policy "generic_access_audit_execution_answers" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: audit_executions
//   Policy "plant_isolation_audit_executions" (ALL, PERMISSIVE) roles={authenticated}
//     USING: is_plant_authorized(plant_id)
//     WITH CHECK: is_plant_authorized(plant_id)
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
//   Policy "authenticated_delete_areas" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_insert_areas" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "authenticated_select_areas" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_update_areas" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
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
//   Policy "plant_isolation_daily_logs" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
//     WITH CHECK: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
// Table: employee_training_records
//   Policy "tenant_isolation_employee_training_records" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: employees
//   Policy "plant_isolation_employees" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
//     WITH CHECK: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
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
// Table: locations
//   Policy "plant_isolation_locations" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
//     WITH CHECK: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
// Table: locker_collaborators
//   Policy "tenant_isolation_locker_collaborators" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: locker_occupations
//   Policy "plant_isolation_locker_occupations" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(( SELECT lockers.plant_id    FROM lockers   WHERE (lockers.id = locker_occupations.locker_id))))
//     WITH CHECK: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(( SELECT lockers.plant_id    FROM lockers   WHERE (lockers.id = locker_occupations.locker_id))))
// Table: lockers
//   Policy "plant_isolation_lockers" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
//     WITH CHECK: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
// Table: maintenance_areas
//   Policy "tenant_isolation_maintenance_areas" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
// Table: maintenance_assets
//   Policy "tenant_isolation_maintenance_assets" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
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
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
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
//   Policy "plant_isolation_plant_non_working_days" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
//     WITH CHECK: (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
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
//     USING: ((get_user_role() = 'Master'::text) OR ((client_id = get_user_client_id()) AND is_plant_authorized(plant_id)))
//   Policy "authenticated_insert_t" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "authenticated_insert_tasks" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//   Policy "authenticated_select_t" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_select_tasks" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR ((client_id = get_user_client_id()) AND (is_plant_authorized(plant_id) OR (requester_id = auth.uid()) OR (assignee_id = auth.uid()))))
//   Policy "authenticated_update_t" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
//   Policy "authenticated_update_tasks" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR ((client_id = get_user_client_id()) AND (is_plant_authorized(plant_id) OR (requester_id = auth.uid()) OR (assignee_id = auth.uid()))))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR ((client_id = get_user_client_id()) AND (is_plant_authorized(plant_id) OR (requester_id = auth.uid()) OR (assignee_id = auth.uid()))))
// Table: trainings
//   Policy "tenant_isolation_trainings" (ALL, PERMISSIVE) roles={authenticated}
//     USING: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
//     WITH CHECK: ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))

// --- DATABASE FUNCTIONS ---
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
//    LANGUAGE sql
//    STABLE SECURITY DEFINER
//    SET search_path TO 'public'
//   AS $function$
//     SELECT client_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
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
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_old_status_freeze BOOLEAN;
//     v_old_status_ignore BOOLEAN;
//     v_new_status_return BOOLEAN;
//     v_new_status_name TEXT;
//   BEGIN
//     -- If status changes
//     IF NEW.status_id <> OLD.status_id THEN
//       -- Check if the old status was flagged to freeze SLA or ignore SLA
//       SELECT freeze_sla, ignore_sla INTO v_old_status_freeze, v_old_status_ignore FROM public.task_statuses WHERE id = OLD.status_id;
//
//       IF v_old_status_freeze OR v_old_status_ignore THEN
//         -- Accumulate the frozen time spent in the old status
//         NEW.frozen_time_minutes := OLD.frozen_time_minutes + GREATEST(0, EXTRACT(EPOCH FROM (NOW() - COALESCE(OLD.status_updated_at, OLD.created_at)))/60);
//       END IF;
//
//       -- Reset the timer start for the new status
//       NEW.status_updated_at := NOW();
//
//       -- Check if new status returns to requester
//       SELECT return_to_requester, name INTO v_new_status_return, v_new_status_name FROM public.task_statuses WHERE id = NEW.status_id;
//       IF v_new_status_return THEN
//         NEW.assignee_id := NEW.requester_id;
//       END IF;
//
//       -- Capture RC created date if status matches exactly
//       IF v_new_status_name ILIKE 'Requisição Criada' OR v_new_status_name ILIKE 'Requisicao Criada' THEN
//         IF NEW.rc_created_date IS NULL THEN
//           NEW.rc_created_date := NOW();
//         END IF;
//       END IF;
//
//       -- Capture PO generated date if status matches exactly (Fallback)
//       IF v_new_status_name ILIKE 'Pedido Gerado' THEN
//         IF NEW.po_generated_date IS NULL THEN
//           NEW.po_generated_date := NOW();
//         END IF;
//       END IF;
//
//       -- Capture Closed Date if status matches exactly (Fallback)
//       IF v_new_status_name ILIKE 'Finalizado' THEN
//         IF NEW.closed_at IS NULL THEN
//           NEW.closed_at := NOW();
//         END IF;
//       END IF;
//
//     END IF;
//
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION is_plant_authorized(uuid)
//   CREATE OR REPLACE FUNCTION public.is_plant_authorized(p_id uuid)
//    RETURNS boolean
//    LANGUAGE plpgsql
//    STABLE SECURITY DEFINER
//    SET search_path TO 'public'
//   AS $function$
//   DECLARE
//     v_role text;
//     v_plants jsonb;
//   BEGIN
//     v_role := public.get_user_role();
//     IF v_role IN ('Master', 'Administrador') THEN
//       RETURN true;
//     END IF;
//
//     v_plants := public.get_user_authorized_plants();
//     IF v_plants IS NULL OR jsonb_typeof(v_plants) != 'array' OR jsonb_array_length(v_plants) = 0 THEN
//       RETURN false;
//     END IF;
//
//     RETURN v_plants @> to_jsonb(p_id::text);
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

// --- TRIGGERS ---
// Table: audit_logs
//   trigger_clean_audit_logs: CREATE TRIGGER trigger_clean_audit_logs AFTER INSERT ON public.audit_logs FOR EACH STATEMENT EXECUTE FUNCTION clean_old_audit_logs()
// Table: cleaning_gardening_areas
//   audit_cleaning_gardening_areas: CREATE TRIGGER audit_cleaning_gardening_areas AFTER INSERT OR DELETE OR UPDATE ON public.cleaning_gardening_areas FOR EACH ROW EXECUTE FUNCTION log_audit_action()
// Table: cleaning_gardening_schedules
//   audit_cleaning_gardening_schedules: CREATE TRIGGER audit_cleaning_gardening_schedules AFTER INSERT OR DELETE OR UPDATE ON public.cleaning_gardening_schedules FOR EACH ROW EXECUTE FUNCTION log_audit_action()
// Table: daily_logs
//   audit_daily_logs: CREATE TRIGGER audit_daily_logs AFTER INSERT OR DELETE ON public.daily_logs FOR EACH ROW EXECUTE FUNCTION log_audit_action()
// Table: employees
//   audit_employees: CREATE TRIGGER audit_employees AFTER INSERT OR DELETE ON public.employees FOR EACH ROW EXECUTE FUNCTION log_audit_action()
// Table: equipment
//   audit_equipment: CREATE TRIGGER audit_equipment AFTER INSERT OR DELETE ON public.equipment FOR EACH ROW EXECUTE FUNCTION log_audit_action()
// Table: functions
//   audit_functions: CREATE TRIGGER audit_functions AFTER INSERT OR DELETE ON public.functions FOR EACH ROW EXECUTE FUNCTION log_audit_action()
// Table: locations
//   audit_locations: CREATE TRIGGER audit_locations AFTER INSERT OR DELETE ON public.locations FOR EACH ROW EXECUTE FUNCTION log_audit_action()
// Table: packages
//   audit_packages: CREATE TRIGGER audit_packages AFTER INSERT OR DELETE OR UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION log_audit_action()
// Table: plant_non_working_days
//   audit_plant_non_working_days: CREATE TRIGGER audit_plant_non_working_days AFTER INSERT OR DELETE OR UPDATE ON public.plant_non_working_days FOR EACH ROW EXECUTE FUNCTION log_audit_action()
// Table: plants
//   audit_plants: CREATE TRIGGER audit_plants AFTER INSERT OR DELETE ON public.plants FOR EACH ROW EXECUTE FUNCTION log_audit_action()
// Table: task_statuses
//   audit_task_statuses: CREATE TRIGGER audit_task_statuses AFTER INSERT OR DELETE OR UPDATE ON public.task_statuses FOR EACH ROW EXECUTE FUNCTION log_audit_action()
// Table: task_types
//   audit_task_types: CREATE TRIGGER audit_task_types AFTER INSERT OR DELETE OR UPDATE ON public.task_types FOR EACH ROW EXECUTE FUNCTION log_audit_action()
// Table: tasks
//   audit_tasks: CREATE TRIGGER audit_tasks AFTER INSERT OR DELETE OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION log_audit_action()
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
// Table: function_required_trainings
//   CREATE UNIQUE INDEX function_required_trainings_function_id_training_id_key ON public.function_required_trainings USING btree (function_id, training_id)
// Table: locker_occupations
//   CREATE UNIQUE INDEX one_active_locker_per_collab ON public.locker_occupations USING btree (collaborator_id) WHERE (status = 'Ativo'::text)
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
