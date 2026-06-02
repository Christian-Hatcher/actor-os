export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  agency_name: string | null
  agency_email: string | null
  subscription_tier: "free" | "monthly" | "yearly"
  subscription_status: "active" | "inactive" | "cancelled"
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  // redesign additions
  splash_photo_url?: string | null
  splash_mode?: "headshot" | "onset" | "stage" | null
  currency?: string
  city?: string | null
  monthly_goal?: number | null
  yearly_goal?: number | null
  theme_id?: string
  custom_theme?: Record<string, unknown> | null
  preferred_mode?: "theater" | "film" | "both"
  casting_sources?: string[]
  created_at: string
  updated_at: string
}

export interface Audition {
  id: string
  user_id: string
  project_name: string
  role_name: string | null
  casting_director: string | null
  agency: string | null
  status: "submitted" | "callback" | "pinned" | "booked" | "passed" | "archived"
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
  // redesign additions (shoot-day / OT)
  call_time?: string | null
  est_wrap_time?: string | null
  wrap_time?: string | null
  ot_rate_multiplier?: number | null
  created_at: string
  updated_at: string
}

export interface SelfTape {
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

export interface Contact {
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

export interface Contract {
  id: string
  user_id: string
  title: string
  file_url: string
  status: "uploaded" | "analyzing" | "reviewed" | "signed"
  summary: string | null
  key_clauses: Record<string, unknown> | null
  red_flags: string[] | null
  questions: string[] | null
  analyzed_at: string | null
  created_at: string
}

export interface Reminder {
  id: string
  user_id: string
  title: string
  description: string | null
  due_date: string
  type: "general" | "audition" | "self_tape" | "callback" | "follow_up" | "contract"
  related_id: string | null
  completed: boolean
  created_at: string
}

export interface DashboardStats {
  total_auditions: number
  active_callbacks: number
  booked_jobs: number
  pending_self_tapes: number
  upcoming_reminders: number
  conversion_rate: number
}

export interface ParsedAuditionFields {
  project_name: string | null
  role_name: string | null
  casting_director: string | null
  agency: string | null
  location: string | null
  compensation: string | null
  deadline: string | null
  submission_deadline: string | null
  shoot_date: string | null
  callback_date: string | null
  notes: string | null
  summary: string | null
  source_platform: "actors_access" | "backstage" | "casting_networks" | "direct" | "unknown" | null
  email_type: "casting" | "callback" | "inquiry" | "admin" | "irrelevant" | null
  action_required: string | null
}

export interface ParsedAudition {
  id: string
  user_id: string
  email_id: string
  source_email_id: string | null
  audition_id: string | null
  confidence_score: number
  parser_version: string
  extracted_fields: ParsedAuditionFields
  raw_snippets: string[]
  needs_review: boolean
  review_reason: string | null
  reviewed_by_user: boolean
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface ActorPreferences {
  id: string
  user_id: string
  // What matters most — ordered by importance (1 = highest)
  priorities: {
    compensation: number      // 1-5 ranking
    experience: number        // 1-5 ranking
    networking: number        // 1-5 ranking
    project_type: number      // 1-5 ranking (film, commercial, TV, etc.)
    location_flexibility: number // 1-5 ranking
  }
  // Filters
  min_compensation: string | null       // e.g. "$200/day", "any"
  preferred_project_types: string[]     // e.g. ["commercial", "film", "tv", "theater", "voice_over", "modeling"]
  preferred_locations: string[]         // e.g. ["Tokyo", "Yokohama", "Remote"]
  willing_to_travel: boolean
  // Career stage context
  career_goal: "building_experience" | "earning_income" | "building_network" | "all_opportunities" | null
  bio_context: string | null           // Free text: "I'm a student actor looking for..." helps AI understand
  created_at: string
  updated_at: string
}

export interface OutreachLog {
  id: string
  user_id: string
  contact_id: string
  method: "email" | "call" | "meeting" | "other"
  notes: string | null
  created_at: string
}
