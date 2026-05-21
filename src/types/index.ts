     1|export interface Profile {
     2|  id: string
     3|  email: string
     4|  full_name: string | null
     5|  avatar_url: string | null
     6|  agency_name: string | null
     7|  agency_email: string | null
     8|  subscription_tier: 'free' | 'monthly' | 'yearly'
     9|  subscription_status: 'active' | 'inactive' | 'cancelled'
    10|  stripe_customer_id: string | null
    11|  stripe_subscription_id: string | null
    12|  created_at: string
    13|  updated_at: string
    14|}
    15|
    16|export interface Audition {
    17|  id: string
    18|  user_id: string
    19|  project_name: string
    20|  role_name: string | null
    21|  casting_director: string | null
    22|  agency: string | null
    23|  status: 'submitted' | 'callback' | 'pinned' | 'booked' | 'passed' | 'archived'
    24|  submitted_date: string | null
    25|  callback_date: string | null
    26|  shoot_date: string | null
    27|  location: string | null
    28|  notes: string | null
    29|  self_tape_url: string | null
    30|  headshot_url: string | null
    31|  resume_url: string | null
    32|  compensation: string | null
    33|  contract_url: string | null
    34|  created_at: string
    35|  updated_at: string
    36|}
    37|
    38|export interface SelfTape {
    39|  id: string
    40|  user_id: string
    41|  audition_id: string | null
    42|  title: string
    43|  video_url: string
    44|  thumbnail_url: string | null
    45|  scene_partner: string | null
    46|  deadline: string | null
    47|  submitted: boolean
    48|  feedback: string | null
    49|  created_at: string
    50|}
    51|
    52|export interface Contact {
    53|  id: string
    54|  user_id: string
    55|  name: string
    56|  email: string | null
    57|  phone: string | null
    58|  role: string | null
    59|  company: string | null
    60|  last_contact_date: string | null
    61|  notes: string | null
    62|  priority: number
    63|  created_at: string
    64|}
    65|
    66|export interface Contract {
    67|  id: string
    68|  user_id: string
    69|  title: string
    70|  file_url: string
    71|  status: 'uploaded' | 'analyzing' | 'reviewed' | 'signed'
    72|  summary: string | null
    73|  key_clauses: Record<string, unknown> | null
    74|  red_flags: string[] | null
    75|  questions: string[] | null
    76|  analyzed_at: string | null
    77|  created_at: string
    78|}
    79|
    80|export interface Reminder {
    81|  id: string
    82|  user_id: string
    83|  title: string
    84|  description: string | null
    85|  due_date: string
    86|  type: 'general' | 'audition' | 'self_tape' | 'callback' | 'follow_up' | 'contract'
    87|  related_id: string | null
    88|  completed: boolean
    89|  created_at: string
    90|}
    91|
    92|export interface DashboardStats {
    93|  total_auditions: number
    94|  active_callbacks: number
    95|  booked_jobs: number
    96|  pending_self_tapes: number
    97|  upcoming_reminders: number
    98|  conversion_rate: number
    99|}
   100|

export interface OutreachLog {
  id: string
  user_id: string
  contact_id: string
  method: "email" | "call" | "meeting" | "other"
  notes: string | null
  created_at: string
}