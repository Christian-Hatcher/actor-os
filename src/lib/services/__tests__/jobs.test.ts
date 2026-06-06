import { describe, it, expect, vi, beforeEach } from "vitest"
import { listJobs, getJob, createJob, updateJob, autoCreateJobFromAudition } from "../jobs"

// Minimal chainable mock for Supabase client
function mockSupabase() {
  let resolveValue: any = { data: null, error: null }

  const chain: any = new Proxy({}, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: any) => resolve(resolveValue)
      }
      return vi.fn().mockReturnValue(chain)
    },
  })

  return {
    client: chain,
    resolve(val: any) { resolveValue = val },
  }
}

describe("listJobs", () => {
  it("queries jobs for user with filters", async () => {
    const mock = mockSupabase()
    const jobs = [{ id: "j1", title: "Test Film" }]
    mock.resolve({ data: jobs, error: null })

    const result = await listJobs(mock.client, "user-1", { status: "active" })
    expect(result.data).toEqual(jobs)
    expect(result.error).toBeNull()
  })

  it("returns empty array when no jobs", async () => {
    const mock = mockSupabase()
    mock.resolve({ data: [], error: null })

    const result = await listJobs(mock.client, "user-1")
    expect(result.data).toEqual([])
  })
})

describe("getJob", () => {
  it("returns job scoped to user", async () => {
    const mock = mockSupabase()
    const job = { id: "j1", user_id: "user-1", title: "Commercial" }
    mock.resolve({ data: job, error: null })

    const result = await getJob(mock.client, "user-1", "j1")
    expect(result.data?.title).toBe("Commercial")
  })

  it("returns error when job not found", async () => {
    const mock = mockSupabase()
    mock.resolve({ data: null, error: { message: "not found", code: "PGRST116" } })

    const result = await getJob(mock.client, "user-1", "nonexistent")
    expect(result.error).toBeTruthy()
    expect(result.data).toBeNull()
  })
})

describe("createJob", () => {
  it("enforces free tier limit", async () => {
    // Mock: profile is free tier, count is at limit
    const fromCalls: string[] = []
    let callCount = 0

    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => {
            callCount++
            // First resolve: profile (free tier)
            if (callCount === 1) return resolve({ data: { subscription_status: "inactive" }, error: null })
            // Second resolve: count at limit
            if (callCount === 2) return resolve({ data: null, error: null, count: 3 })
            return resolve({ data: null, error: null })
          }
        }
        if (prop === "from") {
          return vi.fn().mockImplementation((table: string) => {
            fromCalls.push(table)
            return chain
          })
        }
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await createJob(chain, "user-1", { title: "New Film" })
    expect(result.status).toBe(403)
    expect((result.error as any)?.message).toBe("Free tier limit reached")
  })

  it("rejects invalid contract_id", async () => {
    let callCount = 0

    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => {
            callCount++
            // Profile: active subscription
            if (callCount === 1) return resolve({ data: { subscription_status: "active" }, error: null })
            // Count: under limit
            if (callCount === 2) return resolve({ data: null, error: null, count: 0 })
            // Contract lookup: not found
            if (callCount === 3) return resolve({ data: null, error: null })
            return resolve({ data: null, error: null })
          }
        }
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await createJob(chain, "user-1", {
      title: "New Film",
      contract_id: "bad-contract-id",
    })
    expect(result.status).toBe(404)
    expect((result.error as any)?.message).toBe("Contract not found")
  })
})

describe("updateJob", () => {
  it("strips non-allowed fields", async () => {
    const insertedFields: Record<string, unknown> = {}

    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => resolve({
            data: { id: "j1", title: "Updated", status: "wrapped" },
            error: null,
          })
        }
        if (prop === "update") {
          return vi.fn().mockImplementation((fields: any) => {
            Object.assign(insertedFields, fields)
            return chain
          })
        }
        return vi.fn().mockReturnValue(chain)
      },
    })

    await updateJob(chain, "user-1", "j1", {
      status: "wrapped",
      user_id: "hacker-id", // should be stripped
      id: "fake-id", // should be stripped
      title: "Updated",
    })

    expect(insertedFields.status).toBe("wrapped")
    expect(insertedFields.title).toBe("Updated")
    expect(insertedFields.user_id).toBeUndefined()
    expect(insertedFields.id).toBeUndefined()
    expect(insertedFields.updated_at).toBeDefined()
  })
})

describe("autoCreateJobFromAudition", () => {
  it("skips if job already exists for audition", async () => {
    let callCount = 0

    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => {
            callCount++
            // First call: existing job found
            if (callCount === 1) return resolve({ data: { id: "existing-job" }, error: null })
            return resolve({ data: null, error: null })
          }
        }
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await autoCreateJobFromAudition(chain, "user-1", "aud-1")
    expect(result.data?.id).toBe("existing-job")
    expect(result.created).toBe(false)
  })
})
