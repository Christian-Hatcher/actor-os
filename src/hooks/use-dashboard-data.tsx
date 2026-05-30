"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import type { Audition, Contact, Contract, Reminder, SelfTape } from "@/types"

interface DashboardData {
  auditions: Audition[]
  reminders: Reminder[]
  selfTapes: SelfTape[]
  contacts: Contact[]
  contracts: Contract[]
  pendingApprovals: { id: string; needs_review: boolean }[]
  loading: boolean
  refresh: () => Promise<void>
  addAudition: (audition: Omit<Audition, "id" | "user_id" | "created_at" | "updated_at">) => Promise<any>
  updateAudition: (id: string, updates: Partial<Audition>) => Promise<void>
}

const DashboardDataContext = createContext<DashboardData | null>(null)

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [auditions, setAuditions] = useState<Audition[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [selfTapes, setSelfTapes] = useState<SelfTape[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<{ id: string; needs_review: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [fetched, setFetched] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)

    const [
      { data: aud },
      { data: rem },
      { data: tapes },
      { data: cont },
      { data: contr },
      { data: parsed },
    ] = await Promise.all([
      supabase.from("auditions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("reminders").select("*").eq("user_id", user.id).order("due_date", { ascending: true }),
      supabase.from("self_tapes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("contacts").select("*").eq("user_id", user.id).order("priority", { ascending: true }),
      supabase.from("contracts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("parsed_auditions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ])

    setAuditions((aud || []) as Audition[])
    setReminders((rem || []) as Reminder[])
    setSelfTapes((tapes || []) as SelfTape[])
    setContacts((cont || []) as Contact[])
    setContracts((contr || []) as Contract[])
    setPendingApprovals((parsed || []) as { id: string; needs_review: boolean }[])
    setLoading(false)
    setFetched(true)
  }, [user?.id])

  useEffect(() => {
    if (user?.id && !fetched) {
      fetchAll()
    } else if (!user?.id) {
      setLoading(false)
    }
  }, [user?.id, fetched, fetchAll])

  const addAudition = useCallback(async (audition: Omit<Audition, "id" | "user_id" | "created_at" | "updated_at">) => {
    if (!user?.id) throw new Error("Not authenticated")
    const { data, error } = await supabase
      .from("auditions")
      .insert([{ ...audition, user_id: user.id }])
      .select()
      .single()
    if (error) throw error
    setAuditions((prev) => [data as Audition, ...prev])
    return data
  }, [user?.id])

  const updateAudition = useCallback(async (id: string, updates: Partial<Audition>) => {
    const { user_id: _u, id: _i, created_at: _c, updated_at: _up, ...safeUpdates } = updates
    const { error } = await supabase.from("auditions").update(safeUpdates).eq("id", id)
    if (error) throw error
    setAuditions((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)))
  }, [])

  return (
    <DashboardDataContext.Provider
      value={{
        auditions, reminders, selfTapes, contacts, contracts, pendingApprovals,
        loading, refresh: fetchAll, addAudition, updateAudition,
      }}
    >
      {children}
    </DashboardDataContext.Provider>
  )
}

export function useDashboardData() {
  const ctx = useContext(DashboardDataContext)
  if (!ctx) throw new Error("useDashboardData must be used within DashboardDataProvider")
  return ctx
}
