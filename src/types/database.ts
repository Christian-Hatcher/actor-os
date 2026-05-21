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
          updated_at?: string
        }
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
          updated_at?: string
        }
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
      }
    }
  }
}
