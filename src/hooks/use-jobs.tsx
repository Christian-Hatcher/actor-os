"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Audition, Job, RehearsalLog, Script } from "@/types"

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function fetchJobs() {
      const { data: user } = await supabase.auth.getUser()
      const userId = user.user?.id
      if (!userId) {
        if (active) setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("user_id", userId)
        .order("start_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
      if (!active) return
      if (error) setError(error.message)
      else setJobs((data || []) as Job[])
      setLoading(false)
    }
    fetchJobs()
    return () => {
      active = false
    }
  }, [])

  async function addJob(input: Omit<Job, "id" | "user_id" | "created_at" | "updated_at">) {
    const { data: user } = await supabase.auth.getUser()
    const userId = user.user?.id
    if (!userId) throw new Error("Not signed in")
    const { data, error } = await supabase
      .from("jobs")
      .insert([{ ...input, user_id: userId }])
      .select()
      .single()
    if (error) throw error
    const job = data as Job
    setJobs((prev) => [job, ...prev])
    return job
  }

  async function updateJob(id: string, updates: Partial<Job>) {
    // Drop fields the user shouldn't change directly.
    const { id: _i, user_id: _u, created_at: _c, updated_at: _up, ...safe } = updates
    const { error } = await supabase.from("jobs").update(safe).eq("id", id)
    if (error) throw error
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...updates } : j)))
  }

  return { jobs, loading, error, addJob, updateJob }
}

export function useJob(id: string | undefined) {
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function fetchOne() {
      if (!id) {
        if (active) setLoading(false)
        return
      }
      const { data, error } = await supabase.from("jobs").select("*").eq("id", id).single()
      if (!active) return
      if (error) setError(error.message)
      else setJob(data as Job)
      setLoading(false)
    }
    fetchOne()
    return () => {
      active = false
    }
  }, [id])

  return { job, loading, error, setJob }
}

export function useRehearsals(jobId: string | undefined) {
  const [rehearsals, setRehearsals] = useState<RehearsalLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function fetchRehearsals() {
      if (!jobId) {
        if (active) setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from("rehearsal_logs")
        .select("*")
        .eq("job_id", jobId)
        .order("date", { ascending: false })
      if (!active) return
      if (error) setError(error.message)
      else setRehearsals((data || []) as RehearsalLog[])
      setLoading(false)
    }
    fetchRehearsals()
    return () => {
      active = false
    }
  }, [jobId])

  async function addRehearsal(
    input: Omit<RehearsalLog, "id" | "user_id" | "created_at" | "job_id">,
  ) {
    if (!jobId) throw new Error("Missing jobId")
    const { data: user } = await supabase.auth.getUser()
    const userId = user.user?.id
    if (!userId) throw new Error("Not signed in")
    const { data, error } = await supabase
      .from("rehearsal_logs")
      .insert([{ ...input, user_id: userId, job_id: jobId }])
      .select()
      .single()
    if (error) throw error
    const row = data as RehearsalLog
    setRehearsals((prev) => [row, ...prev])
    return row
  }

  return { rehearsals, loading, error, addRehearsal }
}

export function useScripts(jobId: string | undefined) {
  const [scripts, setScripts] = useState<Script[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function fetchScripts() {
      if (!jobId) {
        if (active) setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from("scripts")
        .select("*")
        .eq("job_id", jobId)
        .order("uploaded_at", { ascending: false })
      if (!active) return
      if (error) setError(error.message)
      else setScripts((data || []) as Script[])
      setLoading(false)
    }
    fetchScripts()
    return () => {
      active = false
    }
  }, [jobId])

  return { scripts, loading, error }
}

/**
 * Promote a booked audition into a job. Used by audition-detail's
 * "Create job" CTA when audition.status === "booked" and no job_id is set yet.
 */
export async function promoteAuditionToJob(audition: Audition): Promise<Job> {
  const { data: user } = await supabase.auth.getUser()
  const userId = user.user?.id
  if (!userId) throw new Error("Not signed in")

  const payload = {
    user_id: userId,
    audition_id: audition.id,
    title: audition.project_name,
    type: "film" as const,
    role_name: audition.role_name,
    venue_or_location: audition.location,
    production_company: audition.agency,
    director: audition.casting_director,
    start_date: audition.shoot_date,
    compensation: audition.compensation,
    status: "active" as const,
  }

  const { data, error } = await supabase.from("jobs").insert([payload]).select().single()
  if (error) throw error
  const job = data as Job

  // Best-effort backlink (doesn't block the job creation if RLS denies).
  await supabase.from("auditions").update({ job_id: job.id }).eq("id", audition.id)

  return job
}
