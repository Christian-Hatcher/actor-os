import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

const ANNOTATION_ALLOWED_FIELDS = [
  "script_id",
  "page_number",
  "line_reference",
  "annotation_type",
  "content",
  "color",
] as const

function pickAllowed(body: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of ANNOTATION_ALLOWED_FIELDS) {
    if (field in body) result[field] = body[field] ?? null
  }
  return result
}

export async function listAnnotations(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  scriptId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("script_annotations")
    .select("*")
    .eq("script_id", scriptId)
    .eq("user_id", userId)
    .order("page_number", { ascending: true })

  return { data, error }
}

export async function createAnnotation(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  body: Record<string, unknown>,
) {
  // Validate page_number >= 1 if provided
  if (body.page_number !== undefined && (body.page_number as number) < 1) {
    return { data: null, error: { message: "page_number must be >= 1" }, status: 400 }
  }

  // Verify script ownership
  const { data: script } = await supabaseAdmin
    .from("scripts")
    .select("id")
    .eq("id", body.script_id as string)
    .eq("user_id", userId)
    .single()

  if (!script) {
    return { data: null, error: { message: "Script not found" }, status: 404 }
  }

  const allowed = pickAllowed(body)

  const { data, error } = await supabaseAdmin
    .from("script_annotations")
    .insert({ ...allowed, user_id: userId } as any)
    .select()
    .single()

  return { data, error, status: error ? 500 : 201 }
}

export async function updateAnnotation(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  annotationId: string,
  body: Record<string, unknown>,
) {
  // Validate page_number >= 1 if provided
  if (body.page_number !== undefined && (body.page_number as number) < 1) {
    return { data: null, error: { message: "page_number must be >= 1" }, status: 400 }
  }

  const allowed = pickAllowed(body)
  allowed.updated_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from("script_annotations")
    .update(allowed as any)
    .eq("id", annotationId)
    .eq("user_id", userId)
    .select()
    .single()

  return { data, error }
}

export async function deleteAnnotation(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  annotationId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("script_annotations")
    .delete()
    .eq("id", annotationId)
    .eq("user_id", userId)
    .select()
    .single()

  return { data, error }
}
