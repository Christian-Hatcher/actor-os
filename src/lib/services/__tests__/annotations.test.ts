import { describe, it, expect, vi } from "vitest"
import { listAnnotations, createAnnotation, updateAnnotation, deleteAnnotation } from "../annotations"

describe("listAnnotations", () => {
  it("lists annotations for a script scoped to user", async () => {
    const annotations = [
      { id: "a1", script_id: "s1", content: "Pause here", annotation_type: "blocking" },
    ]
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") return (resolve: any) => resolve({ data: annotations, error: null })
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await listAnnotations(chain, "user-1", "s1")
    expect(result.data).toHaveLength(1)
    expect(result.data![0].content).toBe("Pause here")
  })
})

describe("createAnnotation", () => {
  it("rejects page_number < 1", async () => {
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") return (resolve: any) => resolve({ data: null, error: null })
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await createAnnotation(chain, "user-1", {
      script_id: "s1",
      content: "Note",
      page_number: 0,
    })
    expect(result.status).toBe(400)
    expect((result.error as any)?.message).toBe("page_number must be >= 1")
  })

  it("rejects negative page_number", async () => {
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") return (resolve: any) => resolve({ data: null, error: null })
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await createAnnotation(chain, "user-1", {
      script_id: "s1",
      content: "Note",
      page_number: -5,
    })
    expect(result.status).toBe(400)
  })

  it("rejects when script not owned by user", async () => {
    let callCount = 0
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => {
            callCount++
            if (callCount === 1) return resolve({ data: null, error: null }) // script not found
            return resolve({ data: null, error: null })
          }
        }
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await createAnnotation(chain, "user-1", {
      script_id: "not-my-script",
      content: "Sneaky note",
    })
    expect(result.status).toBe(404)
    expect((result.error as any)?.message).toBe("Script not found")
  })

  it("creates annotation when script owned", async () => {
    let callCount = 0
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => {
            callCount++
            // Script lookup: found
            if (callCount === 1) return resolve({ data: { id: "s1" }, error: null })
            // Insert: success
            if (callCount === 2) return resolve({
              data: { id: "a1", content: "Good note", annotation_type: "character_note" },
              error: null,
            })
            return resolve({ data: null, error: null })
          }
        }
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await createAnnotation(chain, "user-1", {
      script_id: "s1",
      content: "Good note",
      annotation_type: "character_note",
      page_number: 5,
    })
    expect(result.status).toBe(201)
    expect(result.data?.content).toBe("Good note")
  })
})

describe("updateAnnotation", () => {
  it("strips non-allowed fields", async () => {
    const updatedFields: Record<string, unknown> = {}

    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: any) => resolve({
            data: { id: "a1", content: "Updated" },
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

    await updateAnnotation(chain, "user-1", "a1", {
      content: "Updated",
      user_id: "hacker", // should be stripped
      id: "fake", // should be stripped
    })

    expect(updatedFields.content).toBe("Updated")
    expect(updatedFields.user_id).toBeUndefined()
    expect(updatedFields.id).toBeUndefined()
    expect(updatedFields.updated_at).toBeDefined()
  })

  it("rejects page_number < 1 on update", async () => {
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") return (resolve: any) => resolve({ data: null, error: null })
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await updateAnnotation(chain, "user-1", "a1", {
      page_number: 0,
      content: "Updated",
    })
    expect(result.status).toBe(400)
  })
})

describe("deleteAnnotation", () => {
  it("deletes annotation scoped to user", async () => {
    const chain: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") return (resolve: any) => resolve({ data: { id: "a1" }, error: null })
        return vi.fn().mockReturnValue(chain)
      },
    })

    const result = await deleteAnnotation(chain, "user-1", "a1")
    expect(result.error).toBeNull()
  })
})
