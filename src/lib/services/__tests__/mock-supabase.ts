import { vi } from "vitest"

/**
 * Creates a chainable mock Supabase client for service tests.
 * Each query method returns `this` so chains like .from().select().eq().single()
 * work. Call `mockResult()` to set the return value for the terminal method.
 */
export function createMockSupabase() {
  let result: any = { data: null, error: null }
  let results: any[] = []
  let callIndex = 0

  const builder: any = {}

  const chainMethods = [
    "from", "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "in", "gt", "gte", "lt", "lte",
    "order", "limit", "range", "single", "maybeSingle",
  ]

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockImplementation((..._args: any[]) => {
      // If this is a terminal method (single/maybeSingle), resolve
      if (method === "single" || method === "maybeSingle") {
        if (results.length > 0) {
          return Promise.resolve(results[callIndex++] ?? result)
        }
        return Promise.resolve(result)
      }
      return builder
    })
  }

  // Make non-terminal methods also thenable for cases like .select() without .single()
  builder.then = (resolve: any) => {
    if (results.length > 0) {
      return resolve(results[callIndex++] ?? result)
    }
    return resolve(result)
  }

  // Storage mock
  builder.storage = {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/file.pdf" } }),
      remove: vi.fn().mockResolvedValue({ error: null }),
    }),
  }

  return {
    client: builder,
    /** Set the result that the next terminal query returns */
    mockResult(data: any, error: any = null, extra: Record<string, any> = {}) {
      result = { data, error, ...extra }
    },
    /** Set a sequence of results for Promise.all patterns */
    mockResults(...res: Array<{ data: any; error?: any; count?: number | null }>) {
      results = res.map((r) => ({ data: r.data, error: r.error ?? null, count: r.count ?? null }))
      callIndex = 0
    },
    /** Reset all mocks */
    reset() {
      result = { data: null, error: null }
      results = []
      callIndex = 0
      for (const method of chainMethods) {
        builder[method].mockClear()
      }
    },
  }
}
