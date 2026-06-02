import { z } from "zod"

export const auditionSchema = z.object({
  project_name: z.string().min(1, "Project name is required"),
  role_name: z.string().min(1, "Role name is required"),
  casting_director: z.string().optional(),
  agency: z.string().optional(),
  status: z.enum(["received", "submitted", "callback", "pinned", "booked", "passed", "archived"]),
  submitted_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
  callback_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  shoot_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  location: z.string().optional(),
  notes: z.string().optional(),
  self_tape_url: z.string().url().optional().nullable(),
  headshot_url: z.string().url().optional().nullable(),
  resume_url: z.string().url().optional().nullable(),
  compensation: z.string().optional(),
  contract_url: z.string().url().optional().nullable(),
})

export const selfTapeSchema = z.object({
  project_name: z.string().min(1, "Project name is required"),
  role_name: z.string().min(1, "Role name is required"),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/, "Must be ISO datetime"),
  notes: z.string().optional(),
  tape_url: z.string().url().optional().nullable(),
  submitted: z.boolean().default(false),
})

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  role: z.string().optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional(),
  type: z.enum(["casting_director", "agent", "collaborator", "manager", "other"]),
  priority: z.number().min(1).max(5).default(3),
  status: z.enum(["active", "cold", "dormant", "blocked"]).default("active"),
  notes: z.string().optional(),
  last_contact_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
})

export const reminderSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(500).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/),
  type: z.enum(["general", "audition", "self_tape", "callback", "follow_up", "contract"]).default("general"),
  related_id: z.string().uuid().optional().nullable(),
  completed: z.boolean().default(false),
})

export const contractAnalysisSchema = z.object({
  contract_text: z.string().min(10, "Contract text is too short").max(50000, "Contract too long"),
  language: z.enum(["en", "ja"]).default("en"),
})

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  name: z.string().min(1, "Name is required").max(100),
})

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})
