"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Audition, DashboardStats } from "@/types"

export function useAuditions() {
  const [auditions, setAuditions] = useState<Audition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAuditions() {
      const { data, error } = await supabase
        .from("auditions")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) setError(error.message)
      else setAuditions(data || [])
      setLoading(false)
    }

    fetchAuditions()
  }, [])

  async function addAudition(audition: Omit<Audition, "id" | "user_id" | "created_at" | "updated_at">) {
    const { data: user } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from("auditions")
      .insert([{ ...audition, user_id: user.user?.id }])
      .select()
      .single()

    if (error) throw error
    setAuditions((prev) => [data, ...prev])
    return data
  }

  async function updateAudition(id: string, updates: Partial<Audition>) {
    const { error } = await supabase
      .from("auditions")
      .update(updates)
      .eq("id", id)

    if (error) throw error
    setAuditions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    )
  }

  return { auditions, loading, error, addAudition, updateAudition }
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    total_auditions: 0,
    active_callbacks: 0,
    booked_jobs: 0,
    pending_self_tapes: 0,
    upcoming_reminders: 0,
    conversion_rate: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const { data: user } = await supabase.auth.getUser()
      const userId = user.user?.id

      if (!userId) {
        setLoading(false)
        return
      }

      const { data: auditions } = await supabase
        .from("auditions")
        .select("status")
        .eq("user_id", userId)

      const total = auditions?.length || 0
      const callbacks = auditions?.filter((a) => a.status === "callback").length || 0
      const booked = auditions?.filter((a) => a.status === "booked").length || 0

      const { data: tapes } = await supabase
        .from("self_tapes")
        .select("*")
        .eq("user_id", userId)
        .eq("submitted", false)

      const { data: reminders } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", userId)
        .eq("completed", false)
        .gte("due_date", new Date().toISOString())

      setStats({
        total_auditions: total,
        active_callbacks: callbacks,
        booked_jobs: booked,
        pending_self_tapes: tapes?.length || 0,
        upcoming_reminders: reminders?.length || 0,
        conversion_rate: total > 0 ? Math.round((booked / total) * 100) : 0,
      })
      setLoading(false)
    }

    fetchStats()
  }, [])

  return { stats, loading }
}
