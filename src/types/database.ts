export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          agency_name: string | null
          agency_email: string | null
          subscription_tier: string
          subscription_status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          // --- redesign additions ---
          splash_photo_url: string | null
          splash_mode: string | null
          currency: string
          city: string | null
          monthly_goal: number | null
          yearly_goal: number | null
          theme_id: string
          custom_theme: Json | null
          preferred_mode: string
          tax_settings: Json | null
          llm_settings: Json | null
          casting_sources: Json | null
          enabled_modules: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          agency_name?: string | null
          agency_email?: string | null
          subscription_tier?: string
          subscription_status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          splash_photo_url?: string | null
          splash_mode?: string | null
          currency?: string
          city?: string | null
          monthly_goal?: number | null
          yearly_goal?: number | null
          theme_id?: string
          custom_theme?: Json | null
          preferred_mode?: string
          tax_settings?: Json | null
          llm_settings?: Json | null
          casting_sources?: Json | null
          enabled_modules?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          agency_name?: string | null
          agency_email?: string | null
          subscription_tier?: string
          subscription_status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          splash_photo_url?: string | null
          splash_mode?: string | null
          currency?: string
          city?: string | null
          monthly_goal?: number | null
          yearly_goal?: number | null
          theme_id?: string
          custom_theme?: Json | null
          preferred_mode?: string
          tax_settings?: Json | null
          llm_settings?: Json | null
          casting_sources?: Json | null
          enabled_modules?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      auditions: {
        Row: {
          id: string
          user_id: string
          project_name: string
          role_name: string | null
          casting_director: string | null
          agency: string | null
          status: string
          submitted_date: string | null
          callback_date: string | null
          shoot_date: string | null
          location: string | null
          notes: string | null
          self_tape_url: string | null
          headshot_url: string | null
          resume_url: string | null
          compensation: string | null
          contract_url: string | null
          // --- redesign additions (shoot-day / OT) ---
          call_time: string | null
          est_wrap_time: string | null
          wrap_time: string | null
          ot_rate_multiplier: number | null
          // --- v2 additions ---
          job_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_name: string
          role_name?: string | null
          casting_director?: string | null
          agency?: string | null
          status?: string
          submitted_date?: string | null
          callback_date?: string | null
          shoot_date?: string | null
          location?: string | null
          notes?: string | null
          self_tape_url?: string | null
          headshot_url?: string | null
          resume_url?: string | null
          compensation?: string | null
          contract_url?: string | null
          call_time?: string | null
          est_wrap_time?: string | null
          wrap_time?: string | null
          ot_rate_multiplier?: number | null
          job_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          project_name?: string
          role_name?: string | null
          casting_director?: string | null
          agency?: string | null
          status?: string
          submitted_date?: string | null
          callback_date?: string | null
          shoot_date?: string | null
          location?: string | null
          notes?: string | null
          self_tape_url?: string | null
          headshot_url?: string | null
          resume_url?: string | null
          compensation?: string | null
          contract_url?: string | null
          call_time?: string | null
          est_wrap_time?: string | null
          wrap_time?: string | null
          ot_rate_multiplier?: number | null
          job_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          id: string
          user_id: string
          audition_id: string | null
          production_id: string | null
          title: string
          role_name: string | null
          project_type: string
          status: string
          location: string | null
          compensation: string | null
          start_date: string | null
          end_date: string | null
          contract_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          audition_id?: string | null
          production_id?: string | null
          title: string
          role_name?: string | null
          project_type?: string
          status?: string
          location?: string | null
          compensation?: string | null
          start_date?: string | null
          end_date?: string | null
          contract_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          audition_id?: string | null
          production_id?: string | null
          title?: string
          role_name?: string | null
          project_type?: string
          status?: string
          location?: string | null
          compensation?: string | null
          start_date?: string | null
          end_date?: string | null
          contract_id?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rehearsal_logs: {
        Row: {
          id: string
          job_id: string
          user_id: string
          date: string
          type: string
          duration_minutes: number | null
          location: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          user_id: string
          date: string
          type?: string
          duration_minutes?: number | null
          location?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          job_id?: string
          date?: string
          type?: string
          duration_minutes?: number | null
          location?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      scripts: {
        Row: {
          id: string
          job_id: string
          user_id: string
          file_name: string
          file_url: string
          file_type: string
          file_size_bytes: number
          version_label: string | null
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          user_id: string
          file_name: string
          file_url: string
          file_type: string
          file_size_bytes: number
          version_label?: string | null
          created_at?: string
        }
        Update: {
          job_id?: string
          file_name?: string
          file_url?: string
          file_type?: string
          file_size_bytes?: number
          version_label?: string | null
        }
        Relationships: []
      }
      script_annotations: {
        Row: {
          id: string
          script_id: string
          user_id: string
          page_number: number | null
          line_reference: string | null
          annotation_type: string
          content: string
          color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          script_id: string
          user_id: string
          page_number?: number | null
          line_reference?: string | null
          annotation_type?: string
          content: string
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          script_id?: string
          page_number?: number | null
          line_reference?: string | null
          annotation_type?: string
          content?: string
          color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      productions: {
        Row: {
          id: string
          created_by: string
          name: string
          description: string | null
          invite_code: string
          project_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          created_by: string
          name: string
          description?: string | null
          invite_code: string
          project_type?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          invite_code?: string
          project_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      production_members: {
        Row: {
          id: string
          production_id: string
          user_id: string
          role_label: string | null
          joined_at: string
        }
        Insert: {
          id?: string
          production_id: string
          user_id: string
          role_label?: string | null
          joined_at?: string
        }
        Update: {
          production_id?: string
          user_id?: string
          role_label?: string | null
        }
        Relationships: []
      }
      production_notes: {
        Row: {
          id: string
          production_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          production_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          content?: string
        }
        Relationships: []
      }
      self_tapes: {
        Row: {
          id: string
          user_id: string
          audition_id: string | null
          title: string
          video_url: string
          thumbnail_url: string | null
          scene_partner: string | null
          deadline: string | null
          submitted: boolean
          feedback: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          audition_id?: string | null
          title: string
          video_url: string
          thumbnail_url?: string | null
          scene_partner?: string | null
          deadline?: string | null
          submitted?: boolean
          feedback?: string | null
          created_at?: string
        }
        Update: {
          audition_id?: string | null
          title?: string
          video_url?: string
          thumbnail_url?: string | null
          scene_partner?: string | null
          deadline?: string | null
          submitted?: boolean
          feedback?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string | null
          phone: string | null
          role: string | null
          company: string | null
          last_contact_date: string | null
          notes: string | null
          priority: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email?: string | null
          phone?: string | null
          role?: string | null
          company?: string | null
          last_contact_date?: string | null
          notes?: string | null
          priority?: number
          created_at?: string
        }
        Update: {
          name?: string
          email?: string | null
          phone?: string | null
          role?: string | null
          company?: string | null
          last_contact_date?: string | null
          notes?: string | null
          priority?: number
        }
        Relationships: []
      }
      reminders: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          due_date: string
          type: string
          related_id: string | null
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          due_date: string
          type?: string
          related_id?: string | null
          completed?: boolean
          created_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          due_date?: string
          type?: string
          related_id?: string | null
          completed?: boolean
        }
        Relationships: []
      }
      contracts: {
        Row: {
          id: string
          user_id: string
          title: string
          file_url: string
          status: string
          summary: string | null
          key_clauses: Json | null
          red_flags: string[] | null
          questions: string[] | null
          analyzed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          file_url: string
          status?: string
          summary?: string | null
          key_clauses?: Json | null
          red_flags?: string[] | null
          questions?: string[] | null
          analyzed_at?: string | null
          created_at?: string
        }
        Update: {
          title?: string
          file_url?: string
          status?: string
          summary?: string | null
          key_clauses?: Json | null
          red_flags?: string[] | null
          questions?: string[] | null
          analyzed_at?: string | null
        }
        Relationships: []
      }
      outreach_logs: {
        Row: {
          id: string
          user_id: string
          contact_id: string
          type: string
          notes: string | null
          date: string
          follow_up_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          contact_id: string
          type: string
          notes?: string | null
          date: string
          follow_up_date?: string | null
          created_at?: string
        }
        Update: {
          type?: string
          notes?: string | null
          date?: string
          follow_up_date?: string | null
        }
        Relationships: []
      }
      universities: {
        Row: {
          id: string
          name: string
          department: string | null
          contact_name: string | null
          contact_email: string | null
          license_tier: string
          student_count: number | null
          active: boolean
          stripe_subscription_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          department?: string | null
          contact_name?: string | null
          contact_email?: string | null
          license_tier?: string
          student_count?: number | null
          active?: boolean
          stripe_subscription_id?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          department?: string | null
          contact_name?: string | null
          contact_email?: string | null
          license_tier?: string
          student_count?: number | null
          active?: boolean
          stripe_subscription_id?: string | null
        }
        Relationships: []
      }
      email_connections: {
        Row: {
          id: string
          user_id: string
          provider: string
          email_address: string
          display_name: string | null
          access_token: string
          refresh_token: string
          token_expires_at: string | null
          scopes: string[]
          is_active: boolean
          last_synced_at: string | null
          sync_cursor: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider?: string
          email_address: string
          display_name?: string | null
          access_token: string
          refresh_token: string
          token_expires_at?: string | null
          scopes?: string[]
          is_active?: boolean
          last_synced_at?: string | null
          sync_cursor?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          provider?: string
          email_address?: string
          display_name?: string | null
          access_token?: string
          refresh_token?: string
          token_expires_at?: string | null
          scopes?: string[]
          is_active?: boolean
          last_synced_at?: string | null
          sync_cursor?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      casting_emails: {
        Row: {
          id: string
          user_id: string
          connection_id: string
          gmail_message_id: string
          thread_id: string | null
          from_address: string
          from_name: string | null
          to_address: string
          subject: string
          body_text: string | null
          body_html: string | null
          received_at: string
          is_casting_email: boolean
          processing_status: string
          parsing_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          connection_id: string
          gmail_message_id: string
          thread_id?: string | null
          from_address: string
          from_name?: string | null
          to_address: string
          subject: string
          body_text?: string | null
          body_html?: string | null
          received_at: string
          is_casting_email?: boolean
          processing_status?: string
          parsing_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          thread_id?: string | null
          from_address?: string
          from_name?: string | null
          subject?: string
          body_text?: string | null
          body_html?: string | null
          is_casting_email?: boolean
          processing_status?: string
          parsing_error?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      parsed_auditions: {
        Row: {
          id: string
          user_id: string
          email_id: string
          source_email_id: string | null
          audition_id: string | null
          confidence_score: number
          parser_version: string
          extracted_fields: Json
          raw_snippets: string[]
          needs_review: boolean
          review_reason: string | null
          reviewed_by_user: boolean
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_id: string
          source_email_id?: string | null
          audition_id?: string | null
          confidence_score: number
          parser_version: string
          extracted_fields: Json
          raw_snippets?: string[]
          needs_review?: boolean
          review_reason?: string | null
          reviewed_by_user?: boolean
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          audition_id?: string | null
          confidence_score?: number
          extracted_fields?: Json
          raw_snippets?: string[]
          needs_review?: boolean
          review_reason?: string | null
          reviewed_by_user?: boolean
          reviewed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contract_restrictions: {
        Row: {
          id: string
          contract_id: string
          restriction_type: string
          description: string
          applies_to_platforms: string[]
          effective_date: string | null
          expiry_date: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          contract_id: string
          restriction_type: string
          description: string
          applies_to_platforms?: string[]
          effective_date?: string | null
          expiry_date?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          restriction_type?: string
          description?: string
          applies_to_platforms?: string[]
          effective_date?: string | null
          expiry_date?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
      contract_analysis_logs: {
        Row: {
          id: string
          contract_id: string
          analysis_type: string
          model_used: string
          raw_response: string | null
          processing_time_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          contract_id: string
          analysis_type: string
          model_used: string
          raw_response?: string | null
          processing_time_ms?: number | null
          created_at?: string
        }
        Update: {
          analysis_type?: string
          model_used?: string
          raw_response?: string | null
          processing_time_ms?: number | null
        }
        Relationships: []
      }
      tax_withholdings: {
        Row: {
          id: string
          user_id: string
          year: number
          month: number
          gross_income: number
          tax_rate: number
          estimated_tax: number
          actually_set_aside: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          year: number
          month: number
          gross_income?: number
          tax_rate?: number
          estimated_tax?: number
          actually_set_aside?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          year?: number
          month?: number
          gross_income?: number
          tax_rate?: number
          estimated_tax?: number
          actually_set_aside?: number
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      actor_preferences: {
        Row: {
          id: string
          user_id: string
          priorities: Json
          min_compensation: string | null
          preferred_project_types: string[]
          preferred_locations: string[]
          willing_to_travel: boolean
          career_goal: string | null
          bio_context: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          priorities?: Json
          min_compensation?: string | null
          preferred_project_types?: string[]
          preferred_locations?: string[]
          willing_to_travel?: boolean
          career_goal?: string | null
          bio_context?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          priorities?: Json
          min_compensation?: string | null
          preferred_project_types?: string[]
          preferred_locations?: string[]
          willing_to_travel?: boolean
          career_goal?: string | null
          bio_context?: string | null
          updated_at?: string
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
  }
}
