import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  Audition,
  Contact,
  Contract,
  DashboardStats,
  Reminder,
  SelfTape,
} from "@/types";

// ---------------------------------------------------------------------------
// useAuditions
// ---------------------------------------------------------------------------

export function useAuditions() {
  const [auditions, setAuditions] = useState<Audition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchAuditions() {
      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id;
      if (!userId) {
        if (active) setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("auditions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!active) return;
      if (error) setError(error.message);
      else setAuditions((data || []) as Audition[]);
      setLoading(false);
    }
    fetchAuditions();
    return () => {
      active = false;
    };
  }, []);

  async function addAudition(
    audition: Omit<Audition, "id" | "user_id" | "created_at" | "updated_at">
  ) {
    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("auditions")
      .insert([{ ...audition, user_id: user.user!.id }])
      .select()
      .single();

    if (error) throw error;
    setAuditions((prev) => [data as Audition, ...prev]);
    return data;
  }

  async function updateAudition(id: string, updates: Partial<Audition>) {
    const { user_id: _u, id: _i, created_at: _c, updated_at: _up, ...safeUpdates } = updates;
    const { error } = await supabase.from("auditions").update(safeUpdates).eq("id", id);

    if (error) throw error;
    setAuditions((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  }

  return { auditions, loading, error, addAudition, updateAudition };
}

// ---------------------------------------------------------------------------
// useDashboardStats
// ---------------------------------------------------------------------------

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    total_auditions: 0,
    active_callbacks: 0,
    booked_jobs: 0,
    pending_self_tapes: 0,
    upcoming_reminders: 0,
    conversion_rate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchStats() {
      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id;
      if (!userId) {
        if (active) setLoading(false);
        return;
      }

      const { data: auditions } = await supabase
        .from("auditions")
        .select("status")
        .eq("user_id", userId);

      const total = auditions?.length || 0;
      const callbacks = auditions?.filter((a) => a.status === "callback").length || 0;
      const booked = auditions?.filter((a) => a.status === "booked").length || 0;

      const { data: tapes } = await supabase
        .from("self_tapes")
        .select("*")
        .eq("user_id", userId)
        .eq("submitted", false);

      const { data: reminders } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", userId)
        .eq("completed", false)
        .gte("due_date", new Date().toISOString());

      if (!active) return;
      setStats({
        total_auditions: total,
        active_callbacks: callbacks,
        booked_jobs: booked,
        pending_self_tapes: tapes?.length || 0,
        upcoming_reminders: reminders?.length || 0,
        conversion_rate: total > 0 ? Math.round((booked / total) * 100) : 0,
      });
      setLoading(false);
    }
    fetchStats();
    return () => {
      active = false;
    };
  }, []);

  return { stats, loading };
}

// ---------------------------------------------------------------------------
// Generic per-user table fetch
// ---------------------------------------------------------------------------

function useUserTable<T>(table: string, orderBy: string, ascending = false) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchRows() {
      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id;
      if (!userId) {
        if (active) setLoading(false);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from(table as any) as any)
        .select("*")
        .eq("user_id", userId)
        .order(orderBy, { ascending });

      if (!active) return;
      if (error) setError(error.message);
      else setRows((data || []) as T[]);
      setLoading(false);
    }
    fetchRows();
    return () => {
      active = false;
    };
  }, [table, orderBy, ascending]);

  return { rows, loading, error };
}

// ---------------------------------------------------------------------------
// useReminders
// ---------------------------------------------------------------------------

export function useReminders() {
  const { rows, loading, error } = useUserTable<Reminder>("reminders", "due_date", true);
  return { reminders: rows, loading, error };
}

// ---------------------------------------------------------------------------
// useSelfTapes
// ---------------------------------------------------------------------------

export function useSelfTapes() {
  const [selfTapes, setSelfTapes] = useState<SelfTape[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchRows() {
      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id;
      if (!userId) {
        if (active) setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("self_tapes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!active) return;
      if (error) setError(error.message);
      else setSelfTapes((data || []) as SelfTape[]);
      setLoading(false);
    }
    fetchRows();
    return () => {
      active = false;
    };
  }, []);

  async function addSelfTape(tape: Omit<SelfTape, "id" | "user_id" | "created_at">) {
    const { data: user } = await supabase.auth.getUser();
    const userId = user.user?.id;
    if (!userId) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("self_tapes")
      .insert([{ ...tape, user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    setSelfTapes((prev) => [data as SelfTape, ...prev]);
    return data as SelfTape;
  }

  async function updateSelfTape(id: string, updates: Partial<SelfTape>) {
    const { user_id: _u, id: _i, created_at: _c, ...safeUpdates } = updates;
    const { error } = await supabase.from("self_tapes").update(safeUpdates).eq("id", id);

    if (error) throw error;
    setSelfTapes((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }

  return { selfTapes, loading, error, addSelfTape, updateSelfTape };
}

// ---------------------------------------------------------------------------
// useContacts
// ---------------------------------------------------------------------------

export function useContacts() {
  const { rows, loading, error } = useUserTable<Contact>("contacts", "priority", true);
  return { contacts: rows, loading, error };
}

// ---------------------------------------------------------------------------
// useContracts
// ---------------------------------------------------------------------------

export function useContracts() {
  const { rows, loading, error } = useUserTable<Contract>("contracts", "created_at");
  return { contracts: rows, loading, error };
}

// ---------------------------------------------------------------------------
// usePendingApprovals
// ---------------------------------------------------------------------------

export function usePendingApprovals() {
  const { rows, loading, error } = useUserTable<{ id: string; needs_review: boolean }>(
    "parsed_auditions",
    "created_at"
  );
  const pending = rows.filter((r) => r.needs_review);
  return { pending, count: pending.length, loading, error };
}

// ---------------------------------------------------------------------------
// Audition grouping helpers
// ---------------------------------------------------------------------------

export interface AuditionDayGroup {
  key: string;
  date: Date | null;
  label: string;
  auditions: Audition[];
}

export function auditionAnchorDate(a: Audition): string | null {
  return a.callback_date || a.shoot_date || a.submitted_date || null;
}

export function useAuditionGroups(auditions: Audition[]): AuditionDayGroup[] {
  return useMemo(() => {
    const byDay = new Map<string, Audition[]>();
    const awaiting: Audition[] = [];

    for (const a of auditions) {
      const anchor = auditionAnchorDate(a);
      if (!anchor) {
        awaiting.push(a);
        continue;
      }
      const key = anchor.slice(0, 10);
      const list = byDay.get(key) ?? [];
      list.push(a);
      byDay.set(key, list);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const groups: AuditionDayGroup[] = [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, list]) => {
        const date = new Date(key + "T00:00:00");
        const isToday = date.getTime() === today.getTime();
        const label = isToday
          ? `Today -- ${date.toLocaleDateString("en-US", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}`
          : date.toLocaleDateString("en-US", {
              weekday: "short",
              day: "numeric",
              month: "short",
            });
        return { key, date, label, auditions: list };
      });

    if (awaiting.length) {
      groups.push({
        key: "awaiting",
        date: null,
        label: "Awaiting reply",
        auditions: awaiting,
      });
    }

    return groups;
  }, [auditions]);
}
