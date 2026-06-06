import { describe, it, expect, vi } from "vitest"
import { listAuditions, createAudition, updateAudition, deleteAudition } from "../auditions"

describe("listAuditions", () => {
  it("lists auditions scoped to user", async () => {
    const auditions = [{ id: "a1", project_name: "Toyota CM" }]
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") return (resolve: any) => resolve({ data: auditions, error: null })
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await listAuditions(chain, "user-1")
    expect(result.data).toHaveLength(1)
    expect(result.data![0].project_name).toBe("Toyota CM")
  })
})

describe("createAudition", () => {
  it("enforces free tier limit of 10", async () => {
    let callCount = 0
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => {
            callCount++
            // Profile: free tier
            if (callCount === 1) return resolve({ data: { subscription_status: "inactive" }, error: null })
            // Count: at limit
            if (callCount === 2) return resolve({ data: null, error: null, count: 10 })
            return resolve({ data: null, error: null })
          }
        }
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await createAudition(chain, "user-1", { project_name: "One Too Many" })
    expect(result.status).toBe(403)
    expect((result.error as any)?.message).toBe("Free tier limit reached")
    expect((result.error as any)?.limit).toBe(10)
  })

  it("sets default status to received", async () => {
    let insertedData: any = null
    let callCount = 0

    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => {
            callCount++
            // Profile: active
            if (callCount === 1) return resolve({ data: { subscription_status: "active" }, error: null })
            // Count: under limit
            if (callCount === 2) return resolve({ data: null, error: null, count: 0 })
            // Insert: success
            if (callCount === 3) return resolve({
              data: { id: "a1", project_name: "Film", status: "received" },
              error: null,
            })
            return resolve({ data: null, error: null })
          }
        }
        if (prop === "insert") {
          return vi.fn().mockImplementation((data: any) => {
            insertedData = data
            return chain
          })
        }
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await createAudition(chain, "user-1", { project_name: "Film" })
    expect(result.status).toBe(201)
    expect(insertedData?.status).toBe("received")
  })

  it("strips non-allowed fields (prevents injection)", async () => {
    let insertedData: any = null
    let callCount = 0

    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => {
            callCount++
            if (callCount === 1) return resolve({ data: { subscription_status: "active" }, error: null })
            if (callCount === 2) return resolve({ data: null, error: null, count: 0 })
            if (callCount === 3) return resolve({ data: { id: "a1" }, error: null })
            return resolve({ data: null, error: null })
          }
        }
        if (prop === "insert") {
          return vi.fn().mockImplementation((data: any) => {
            insertedData = data
            return chain
          })
        }
        return vi.fn().mockReturnValue(chain)
      },
    })

    await createAudition(chain, "user-1", {
      project_name: "Film",
      id: "injected-id", // should be stripped
      user_id: "injected-user", // should be stripped
      created_at: "2020-01-01", // should be stripped
    })

    expect(insertedData?.id).toBeUndefined()
    // user_id is added by the service, not from body
    expect(insertedData?.user_id).toBe("user-1")
    expect(insertedData?.created_at).toBeUndefined()
  })
})

describe("updateAudition", () => {
  it("strips non-allowed fields on update", async () => {
    const updatedFields: Record<string, unknown> = {}

    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => resolve({
            data: { id: "a1", status: "booked" },
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

    await updateAudition(chain, "user-1", "a1", {
      status: "booked",
      user_id: "hacker-id", // should be stripped
      id: "fake-id", // should be stripped
    })

    expect(updatedFields.status).toBe("booked")
    expect(updatedFields.user_id).toBeUndefined()
    expect(updatedFields.id).toBeUndefined()
  })
})

describe("deleteAudition", () => {
  it("deletes audition scoped to user", async () => {
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") return (resolve: any) => resolve({ error: null })
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await deleteAudition(chain, "user-1", "a1")
    expect(result.error).toBeNull()
  })
})
