import { describe, it, expect, vi } from "vitest"
import { listProductions, createProduction, joinProduction, createNote, deleteNote } from "../productions"

describe("listProductions", () => {
  it("returns empty array when user has no memberships", async () => {
    let callCount = 0
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => {
            callCount++
            // Memberships: empty
            if (callCount === 1) return resolve({ data: [], error: null })
            return resolve({ data: [], error: null })
          }
        }
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await listProductions(chain, "user-1")
    expect(result.data).toEqual([])
    expect(result.error).toBeNull()
  })

  it("returns productions for user's memberships", async () => {
    let callCount = 0
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => {
            callCount++
            // Memberships: one production
            if (callCount === 1) return resolve({
              data: [{ production_id: "p1" }],
              error: null,
            })
            // Productions: the one they belong to
            if (callCount === 2) return resolve({
              data: [{ id: "p1", name: "Hamlet" }],
              error: null,
            })
            return resolve({ data: null, error: null })
          }
        }
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await listProductions(chain, "user-1")
    expect(result.data).toHaveLength(1)
    expect(result.data![0].name).toBe("Hamlet")
  })
})

describe("createProduction", () => {
  it("enforces free tier limit", async () => {
    let callCount = 0
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => {
            callCount++
            // Profile: free tier
            if (callCount === 1) return resolve({ data: { subscription_status: "inactive" }, error: null })
            // Count: at limit (1)
            if (callCount === 2) return resolve({ data: null, error: null, count: 1 })
            return resolve({ data: null, error: null })
          }
        }
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await createProduction(chain, "user-1", { name: "Too Many" })
    expect(result.status).toBe(403)
    expect((result.error as any)?.message).toBe("Free tier limit reached")
  })

  it("creates production with invite code and adds creator as member", async () => {
    let callCount = 0
    let insertedProduction: any = null

    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => {
            callCount++
            // Profile: active subscription
            if (callCount === 1) return resolve({ data: { subscription_status: "active" }, error: null })
            // Count: under limit
            if (callCount === 2) return resolve({ data: null, error: null, count: 0 })
            // Production insert: success
            if (callCount === 3) return resolve({
              data: { id: "p1", name: "Hamlet", invite_code: "ABC12345" },
              error: null,
            })
            // Member insert: success
            if (callCount === 4) return resolve({ data: null, error: null })
            return resolve({ data: null, error: null })
          }
        }
        if (prop === "insert") {
          return vi.fn().mockImplementation((data: any) => {
            if (!insertedProduction && data.invite_code) {
              insertedProduction = data
            }
            return chain
          })
        }
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await createProduction(chain, "user-1", { name: "Hamlet" })
    expect(result.status).toBe(201)
    expect(result.data?.name).toBe("Hamlet")
    // Verify invite code was generated (8 uppercase chars)
    expect(insertedProduction?.invite_code).toMatch(/^[A-Z0-9]{8}$/)
  })
})

describe("joinProduction", () => {
  it("returns 404 for invalid invite code", async () => {
    let callCount = 0
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => {
            callCount++
            // Production lookup: not found
            if (callCount === 1) return resolve({ data: null, error: { code: "PGRST116" } })
            return resolve({ data: null, error: null })
          }
        }
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await joinProduction(chain, "user-1", "BADCODE1")
    expect(result.status).toBe(404)
    expect((result.error as any)?.message).toBe("Invalid invite code")
  })

  it("handles duplicate membership gracefully (23505)", async () => {
    let callCount = 0
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => {
            callCount++
            // Production lookup: found
            if (callCount === 1) return resolve({ data: { id: "p1" }, error: null })
            // Member insert: unique constraint violation (already member)
            if (callCount === 2) return resolve({ data: null, error: { code: "23505", message: "duplicate" } })
            return resolve({ data: null, error: null })
          }
        }
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await joinProduction(chain, "user-1", "VALID123")
    // Should succeed despite the 23505 error
    expect(result.status).toBe(200)
    expect(result.data?.production_id).toBe("p1")
  })
})

describe("createNote", () => {
  it("rejects when user is not a member", async () => {
    let callCount = 0
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => {
            callCount++
            // Membership check: not found
            if (callCount === 1) return resolve({ data: null, error: null })
            return resolve({ data: null, error: null })
          }
        }
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await createNote(chain, "user-1", "p1", "Sneaky note")
    expect(result.status).toBe(403)
    expect((result.error as any)?.message).toBe("Not a member")
  })

  it("creates note when user is a member", async () => {
    let callCount = 0
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => {
            callCount++
            // Membership check: found
            if (callCount === 1) return resolve({ data: { user_id: "user-1" }, error: null })
            // Note insert: success
            if (callCount === 2) return resolve({
              data: { id: "n1", content: "Great rehearsal today" },
              error: null,
            })
            return resolve({ data: null, error: null })
          }
        }
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await createNote(chain, "user-1", "p1", "Great rehearsal today")
    expect(result.status).toBe(201)
    expect(result.data?.content).toBe("Great rehearsal today")
  })
})

describe("deleteNote", () => {
  it("deletes note scoped to user", async () => {
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") return (resolve: any) => resolve({ error: null })
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await deleteNote(chain, "user-1", "n1")
    expect(result.error).toBeNull()
  })
})
