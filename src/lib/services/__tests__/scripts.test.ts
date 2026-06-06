import { describe, it, expect, vi } from "vitest"
import { listScripts, createScriptRecord, deleteScript, FREE_TIER_SCRIPT_LIMIT } from "../scripts"

describe("listScripts", () => {
  it("lists scripts for a job scoped to user", async () => {
    const scripts = [
      { id: "s1", job_id: "j1", file_name: "scene1.pdf" },
    ]
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") return (resolve: any) => resolve({ data: scripts, error: null })
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await listScripts(chain, "user-1", "j1")
    expect(result.data).toHaveLength(1)
    expect(result.data![0].file_name).toBe("scene1.pdf")
  })
})

describe("createScriptRecord", () => {
  it("rejects when job not owned by user", async () => {
    let callCount = 0
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => {
            callCount++
            if (callCount === 1) return resolve({ data: null, error: null }) // job not found
            return resolve({ data: null, error: null })
          }
        }
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await createScriptRecord(chain, "user-1", {
      job_id: "not-my-job",
      file_name: "script.pdf",
      file_url: "https://example.com/script.pdf",
      file_type: "pdf",
      file_size_bytes: 1024,
    })
    expect(result.status).toBe(404)
    expect((result.error as any)?.message).toBe("Job not found")
  })

  it("enforces free tier limit", async () => {
    let callCount = 0
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => {
            callCount++
            // Job lookup: found
            if (callCount === 1) return resolve({ data: { id: "j1" }, error: null })
            // Profile: free tier
            if (callCount === 2) return resolve({ data: { subscription_status: "inactive" }, error: null })
            // Count: at limit
            if (callCount === 3) return resolve({ data: null, error: null, count: FREE_TIER_SCRIPT_LIMIT })
            return resolve({ data: null, error: null })
          }
        }
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await createScriptRecord(chain, "user-1", {
      job_id: "j1",
      file_name: "one-too-many.pdf",
      file_url: "https://example.com/file.pdf",
      file_type: "pdf",
      file_size_bytes: 2048,
    })
    expect(result.status).toBe(403)
    expect((result.error as any)?.message).toBe("Free tier limit reached")
  })

  it("creates script when under limit and job owned", async () => {
    let callCount = 0
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => {
            callCount++
            // Job lookup: found
            if (callCount === 1) return resolve({ data: { id: "j1" }, error: null })
            // Profile: active subscription
            if (callCount === 2) return resolve({ data: { subscription_status: "active" }, error: null })
            // Count: under limit
            if (callCount === 3) return resolve({ data: null, error: null, count: 2 })
            // Insert: success
            if (callCount === 4) return resolve({
              data: { id: "s1", file_name: "scene.pdf" },
              error: null,
            })
            return resolve({ data: null, error: null })
          }
        }
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await createScriptRecord(chain, "user-1", {
      job_id: "j1",
      file_name: "scene.pdf",
      file_url: "https://example.com/scene.pdf",
      file_type: "pdf",
      file_size_bytes: 4096,
    })
    expect(result.status).toBe(201)
    expect(result.data?.file_name).toBe("scene.pdf")
  })
})

describe("deleteScript", () => {
  it("deletes script scoped to user", async () => {
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") return (resolve: any) => resolve({ data: { id: "s1" }, error: null })
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await deleteScript(chain, "user-1", "s1")
    expect(result.error).toBeNull()
  })
})

describe("FREE_TIER_SCRIPT_LIMIT", () => {
  it("is set to 5", () => {
    expect(FREE_TIER_SCRIPT_LIMIT).toBe(5)
  })
})
