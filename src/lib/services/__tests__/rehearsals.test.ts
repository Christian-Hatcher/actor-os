import { describe, it, expect, vi } from "vitest"
import { listRehearsals, createRehearsal, updateRehearsal, deleteRehearsal } from "../rehearsals"

function mockSupabase() {
  let resolveValue: any = { data: null, error: null }
  let callCount = 0

  const chain: any = new Proxy({}, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: any) => {
          callCount++
          return resolve(resolveValue)
        }
      }
      return vi.fn().mockReturnValue(chain)
    },
  })

  return {
    client: chain,
    resolve(val: any) { resolveValue = val },
    resolveSequence(...vals: any[]) {
      let i = 0
      const origGet = chain[Symbol.for("resolve")]
      Object.defineProperty(chain, "then", {
        get() {
          return (resolve: any) => resolve(vals[i++] ?? vals[vals.length - 1])
        },
        configurable: true,
      })
    },
  }
}

describe("listRehearsals", () => {
  it("lists rehearsals for a job scoped to user", async () => {
    const mock = mockSupabase()
    const rehearsals = [
      { id: "r1", job_id: "j1", date: "2026-06-01", type: "table_read" },
      { id: "r2", job_id: "j1", date: "2026-06-03", type: "blocking" },
    ]
    mock.resolve({ data: rehearsals, error: null })

    const result = await listRehearsals(mock.client, "user-1", "j1")
    expect(result.data).toHaveLength(2)
    expect(result.error).toBeNull()
  })
})

describe("createRehearsal", () => {
  it("rejects when job not owned by user", async () => {
    let callCount = 0
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => {
            callCount++
            // Job lookup: not found
            if (callCount === 1) return resolve({ data: null, error: null })
            return resolve({ data: null, error: null })
          }
        }
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await createRehearsal(chain, "user-1", {
      job_id: "not-my-job",
      date: "2026-06-10",
      type: "blocking",
    })
    expect(result.status).toBe(404)
    expect((result.error as any)?.message).toBe("Job not found")
  })

  it("creates rehearsal when job ownership verified", async () => {
    let callCount = 0
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => {
            callCount++
            // Job lookup: found
            if (callCount === 1) return resolve({ data: { id: "j1" }, error: null })
            // Insert: success
            if (callCount === 2) return resolve({
              data: { id: "r1", job_id: "j1", date: "2026-06-10", type: "blocking" },
              error: null,
            })
            return resolve({ data: null, error: null })
          }
        }
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await createRehearsal(chain, "user-1", {
      job_id: "j1",
      date: "2026-06-10",
      type: "blocking",
      duration_minutes: 90,
    })
    expect(result.status).toBe(201)
    expect(result.data?.id).toBe("r1")
  })
})

describe("updateRehearsal", () => {
  it("strips non-allowed fields", async () => {
    const updatedFields: Record<string, unknown> = {}

    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => resolve({
            data: { id: "r1", type: "run_through" },
            error: null,
          })
        }
        if (prop === "update") {
          return vi.fn().mockImplementation((fields: any) => {
            Object.assign(updatedFields, fields)
            return chain
          })
        }
        return vi.fn().mockReturnValue(chain)
      },
    })

    await updateRehearsal(chain, "user-1", "r1", {
      type: "run_through",
      user_id: "hacker", // should be stripped
      id: "fake", // should be stripped
    })

    expect(updatedFields.type).toBe("run_through")
    expect(updatedFields.user_id).toBeUndefined()
    expect(updatedFields.id).toBeUndefined()
  })
})

describe("deleteRehearsal", () => {
  it("deletes rehearsal scoped to user", async () => {
    const mock = mockSupabase()
    mock.resolve({ data: { id: "r1" }, error: null })

    const result = await deleteRehearsal(mock.client, "user-1", "r1")
    expect(result.error).toBeNull()
  })
})
