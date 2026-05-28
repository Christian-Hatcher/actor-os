"use client"

import { useRef, useState } from "react"
import { Video, Upload, Play, Plus, Loader2, X, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { useSelfTapes } from "@/hooks/use-data"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import type { SelfTape } from "@/types"

// ---------------------------------------------------------------------------
// NOTE: Supabase Storage requires a "self-tapes" bucket to be created in the
// Supabase dashboard (Storage > New Bucket). Set it to public so video URLs
// are directly accessible, or use signed URLs if you prefer private access.
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500 MB

type TapeState = "empty" | "draft" | "submitted"

function tapeState(t: SelfTape): TapeState {
  if (t.submitted) return "submitted"
  if (t.video_url) return "draft"
  return "empty"
}

function isDueToday(t: SelfTape): boolean {
  return !!t.deadline && new Date(t.deadline).toDateString() === new Date().toDateString()
}

// ---------------------------------------------------------------------------
// Upload helper
// ---------------------------------------------------------------------------

async function uploadVideo(
  file: File,
  tapeId: string,
  onProgress: (pct: number) => void,
): Promise<string> {
  const { data: user } = await supabase.auth.getUser()
  const userId = user.user?.id
  if (!userId) throw new Error("Not authenticated")

  const ext = file.name.split(".").pop() || "mp4"
  const path = `${userId}/${tapeId}/${Date.now()}.${ext}`

  // Supabase JS v2 upload does not expose per-chunk progress, so we use an
  // XMLHttpRequest to stream progress. Fall back to the SDK if XHR setup
  // fails for any reason.
  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token

  if (token) {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/self-tapes/${path}`
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("POST", url)
      xhr.setRequestHeader("Authorization", `Bearer ${token}`)
      xhr.setRequestHeader("x-upsert", "true")

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      })

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/self-tapes/${path}`
          resolve(publicUrl)
        } else {
          reject(new Error(`Upload failed (${xhr.status})`))
        }
      })

      xhr.addEventListener("error", () => reject(new Error("Upload network error")))
      xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")))

      xhr.send(file)
    })
  }

  // Fallback: SDK upload (no granular progress)
  onProgress(50)
  const { error } = await supabase.storage.from("self-tapes").upload(path, file, { upsert: true })
  if (error) throw error
  onProgress(100)

  const {
    data: { publicUrl },
  } = supabase.storage.from("self-tapes").getPublicUrl(path)
  return publicUrl
}

// ---------------------------------------------------------------------------
// State chip
// ---------------------------------------------------------------------------

function StateChip({ t }: { t: SelfTape }) {
  const state = tapeState(t)
  if (state === "submitted") {
    return <span className="chip bk">{t.feedback ? "Callback" : "Submitted"}</span>
  }
  if (state === "empty") {
    return (
      <span className={cn("chip", isDueToday(t) ? "flag" : "")}>
        {t.deadline
          ? new Date(t.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "Not recorded"}
      </span>
    )
  }
  return <span className="chip cb">Draft</span>
}

// ---------------------------------------------------------------------------
// Upload progress bar
// ---------------------------------------------------------------------------

function UploadProgress({ pct }: { pct: number }) {
  return (
    <div className="flex h-[170px] flex-col items-center justify-center gap-3 border-b border-rule bg-[#181614]">
      <Loader2 className="size-8 animate-spin text-amber" />
      <div className="w-2/3">
        <div className="h-[3px] overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-amber transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-mono mt-1.5 block text-center text-[10px] uppercase tracking-[0.14em] text-paper-dim">
          Uploading {pct}%
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Video preview (uses native <video> poster / thumbnail)
// ---------------------------------------------------------------------------

function VideoPreview({ t, state }: { t: SelfTape; state: TapeState }) {
  return (
    <div
      className="relative h-[170px] border-b border-rule"
      style={{
        background:
          "radial-gradient(ellipse 60% 50% at 50% 38%, rgba(140,100,70,.4), transparent 65%), repeating-linear-gradient(135deg, #1f1a14 0 14px, #14110d 14px 28px)",
      }}
    >
      {t.video_url && (
        <video
          src={t.video_url}
          className="absolute inset-0 size-full object-cover opacity-40"
          preload="metadata"
          muted
        />
      )}
      <div className="absolute left-1/2 top-1/2 grid size-[54px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[rgba(244,239,230,.92)]">
        <Play className="size-5 fill-bg text-bg" />
      </div>
      <span className="font-mono absolute right-3 top-2.5 rounded-[30px] bg-black/45 px-2 py-0.5 text-[10px] text-white backdrop-blur">
        {state === "submitted" ? "submitted" : "draft"}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tape card
// ---------------------------------------------------------------------------

function TapeCard({
  t,
  onUpload,
  onSubmit,
  onRewatch,
}: {
  t: SelfTape
  onUpload: (tape: SelfTape) => void
  onSubmit: (tape: SelfTape) => void
  onRewatch: (tape: SelfTape) => void
}) {
  const state = tapeState(t)
  const urgent = state === "empty" && isDueToday(t)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum size is 500 MB.")
      return
    }

    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file.")
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      const videoUrl = await uploadVideo(file, t.id, setProgress)
      onUpload({ ...t, video_url: videoUrl })
      toast.success("Video uploaded successfully")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed"
      toast.error(msg)
    } finally {
      setUploading(false)
      setProgress(0)
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function triggerFilePicker(capture?: boolean) {
    if (!fileInputRef.current) return
    if (capture) {
      fileInputRef.current.setAttribute("capture", "user")
    } else {
      fileInputRef.current.removeAttribute("capture")
    }
    fileInputRef.current.click()
  }

  return (
    <div
      className={cn(
        "mt-3.5 overflow-hidden rounded-[14px] border border-rule [background:linear-gradient(180deg,rgba(255,255,255,.015),transparent)]",
        urgent && "border-red/30 [background:linear-gradient(180deg,rgba(232,98,90,.06),transparent_50%)]",
        state === "submitted" &&
          "border-green/[0.22] [background:linear-gradient(180deg,rgba(58,168,107,.05),transparent_50%)]",
      )}
    >
      {/* Hidden file input for video selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Preview area */}
      {uploading ? (
        <UploadProgress pct={progress} />
      ) : state === "empty" ? (
        <div
          className="flex h-[170px] flex-col items-center justify-center gap-2 border-b border-rule"
          style={{
            background:
              "repeating-linear-gradient(135deg, rgba(255,255,255,.025) 0 10px, transparent 10px 20px), #181614",
          }}
        >
          <div className="grid size-12 place-items-center rounded-full border border-dashed border-rule-strong text-paper-dim">
            <Video className="size-[22px]" strokeWidth={1.6} />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper-faint">
            not recorded
          </span>
        </div>
      ) : (
        <VideoPreview t={t} state={state} />
      )}

      {/* Body */}
      <div className="px-4 py-3.5">
        <div className="flex flex-col gap-1.5">
          <div className="self-end">
            <StateChip t={t} />
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper-faint">
            {t.audition_id ? "Self-tape" : "Open submission"}
          </div>
          <div className="font-serif text-[22px] leading-[1.1] text-paper">{t.title}</div>
        </div>

        <div className="font-mono mt-2 flex flex-wrap items-center gap-2.5 text-[10px] tracking-[0.08em] text-paper-dim">
          {t.scene_partner && <span>partner: {t.scene_partner}</span>}
          {t.deadline && (
            <span>
              due {new Date(t.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>

        {/* Feedback (submitted with reply) */}
        {state === "submitted" && t.feedback && (
          <div className="mt-3 rounded-[10px] border border-green/25 bg-green/[0.05] p-3">
            <div className="font-mono mb-1.5 text-[9px] uppercase tracking-[0.2em] text-green">
              CD feedback
            </div>
            <p className="font-serif text-[15px] italic leading-[1.45] text-paper">{t.feedback}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-3.5 flex gap-2">
          {state === "empty" && (
            <>
              <button
                onClick={() => triggerFilePicker(true)}
                disabled={uploading}
                className="font-sans flex-1 rounded-[10px] border border-paper bg-paper py-2.5 text-[13px] font-medium text-bg disabled:opacity-50"
              >
                Record now
              </button>
              <button
                onClick={() => triggerFilePicker(false)}
                disabled={uploading}
                className="font-sans flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-rule-strong py-2.5 text-[13px] font-medium text-paper disabled:opacity-50"
              >
                <Upload className="size-3.5" /> Upload
              </button>
            </>
          )}
          {state === "draft" && (
            <>
              <button
                onClick={() => onSubmit(t)}
                className="font-sans flex-1 rounded-[10px] border border-paper bg-paper py-2.5 text-[13px] font-medium text-bg"
              >
                Review &amp; submit
              </button>
              <button
                onClick={() => triggerFilePicker(false)}
                disabled={uploading}
                className="font-sans flex-1 rounded-[10px] border border-rule-strong py-2.5 text-[13px] font-medium text-paper disabled:opacity-50"
              >
                Reshoot
              </button>
            </>
          )}
          {state === "submitted" && (
            <>
              <button
                onClick={() => onRewatch(t)}
                className="font-sans flex-1 rounded-[10px] border border-rule-strong py-2.5 text-[13px] font-medium text-paper"
              >
                Re-watch
              </button>
              {t.feedback && (
                <button className="font-sans flex-1 rounded-[10px] border border-green bg-green py-2.5 text-[13px] font-medium text-white">
                  Open callback
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create self-tape sheet
// ---------------------------------------------------------------------------

const EMPTY_TAPE_FORM = {
  title: "",
  audition_link: "",
  scene_partner: "",
  deadline: "",
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper-faint">
      {children}
    </span>
  )
}

function FormInput({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  type?: string
  placeholder?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <FieldLabel>
        {label}
        {required && <span className="text-amber"> *</span>}
      </FieldLabel>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="rounded-[10px] border border-rule bg-white/[0.025] px-3 py-2.5 font-sans text-[13px] text-paper outline-none placeholder:text-paper-faint focus:border-amber/50 focus:ring-1 focus:ring-amber/30"
      />
    </label>
  )
}

function CreateSelfTapeSheet({
  open,
  onOpenChange,
  addSelfTape,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  addSelfTape: (tape: Omit<SelfTape, "id" | "user_id" | "created_at">) => Promise<SelfTape>
}) {
  const [form, setForm] = useState(EMPTY_TAPE_FORM)
  const [submitting, setSubmitting] = useState(false)

  function set<K extends keyof typeof EMPTY_TAPE_FORM>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return

    setSubmitting(true)
    try {
      await addSelfTape({
        title: form.title.trim(),
        video_url: null,
        thumbnail_url: null,
        audition_id: null,
        scene_partner: form.scene_partner.trim() || null,
        deadline: form.deadline || null,
        submitted: false,
        feedback: null,
      })
      toast.success("Self-tape created -- ready to record")
      setForm(EMPTY_TAPE_FORM)
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create self-tape"
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col overflow-y-auto border-rule bg-bg p-0 sm:max-w-[420px]"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-rule bg-bg px-5 pb-4 pt-5">
          <div className="font-mono mb-1.5 text-[10px] uppercase tracking-[0.22em] text-paper-faint">
            New entry
          </div>
          <h2 className="font-serif text-[28px] leading-none tracking-[-0.01em] text-paper">
            New Self-Tape
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-5 pb-6 pt-4">
          <FormInput
            label="Title"
            value={form.title}
            onChange={(v) => set("title", v)}
            required
            placeholder="e.g. Honda Commercial -- Lead"
          />
          <FormInput
            label="Audition link"
            value={form.audition_link}
            onChange={(v) => set("audition_link", v)}
            placeholder="Optional URL or reference"
          />
          <FormInput
            label="Scene partner"
            value={form.scene_partner}
            onChange={(v) => set("scene_partner", v)}
            placeholder="e.g. Reader: Jane"
          />
          <FormInput
            label="Deadline"
            type="date"
            value={form.deadline}
            onChange={(v) => set("deadline", v)}
          />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !form.title.trim()}
            className={cn(
              "font-serif flex w-full items-center justify-center gap-2 rounded-[14px] py-3.5 text-[20px] transition-opacity",
              "bg-paper text-bg",
              (submitting || !form.title.trim()) && "opacity-50",
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="size-5 animate-spin" /> Creating...
              </>
            ) : (
              "Create self-tape"
            )}
          </button>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Video playback modal (lightweight)
// ---------------------------------------------------------------------------

function VideoModal({
  url,
  title,
  onClose,
}: {
  url: string
  title: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <div
        className="relative mx-4 w-full max-w-2xl overflow-hidden rounded-[14px] bg-bg"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-1.5 text-white backdrop-blur hover:bg-black/70"
        >
          <X className="size-5" />
        </button>
        <video
          src={url}
          controls
          autoPlay
          className="w-full"
          style={{ maxHeight: "80vh" }}
        />
        <div className="px-4 py-3">
          <span className="font-serif text-[18px] text-paper">{title}</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function SelfTapesView() {
  const { selfTapes, loading, addSelfTape, updateSelfTape } = useSelfTapes()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [watchingTape, setWatchingTape] = useState<SelfTape | null>(null)

  const due = selfTapes.filter((t) => !t.submitted)

  async function handleUpload(updated: SelfTape) {
    try {
      await updateSelfTape(updated.id, { video_url: updated.video_url })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save video URL"
      toast.error(msg)
    }
  }

  async function handleSubmit(tape: SelfTape) {
    try {
      await updateSelfTape(tape.id, { submitted: true })
      toast.success("Self-tape submitted!")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit"
      toast.error(msg)
    }
  }

  function handleRewatch(tape: SelfTape) {
    if (tape.video_url) {
      setWatchingTape(tape)
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <div className="font-mono mb-2 text-[10px] uppercase tracking-[0.22em] text-paper-faint">
            <span className="pulse-dot mr-1.5 inline-block size-[5px] rounded-full bg-green align-[1px] shadow-[0_0_8px_var(--green)]" />
            {due.length} due · {selfTapes.length} total
          </div>
          <h1 className="font-serif text-[40px] leading-none tracking-[-0.015em]">Self-tapes</h1>
        </div>
        <button
          onClick={() => setSheetOpen(true)}
          className="font-mono flex-none rounded-[30px] bg-paper px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-bg"
        >
          <Plus className="inline size-3" /> New
        </button>
      </div>

      {loading ? (
        <p className="font-serif py-12 text-center text-[18px] italic text-paper-faint">
          Loading your reel...
        </p>
      ) : selfTapes.length === 0 ? (
        <div className="py-12 text-center">
          <p className="font-serif text-[18px] italic text-paper-faint">
            No self-tapes yet.
          </p>
          <button
            onClick={() => setSheetOpen(true)}
            className="font-sans mt-4 inline-flex items-center gap-1.5 rounded-[10px] border border-paper bg-paper px-5 py-2.5 text-[13px] font-medium text-bg"
          >
            <Plus className="size-3.5" /> Create your first self-tape
          </button>
        </div>
      ) : (
        selfTapes.map((t) => (
          <TapeCard
            key={t.id}
            t={t}
            onUpload={handleUpload}
            onSubmit={handleSubmit}
            onRewatch={handleRewatch}
          />
        ))
      )}

      <CreateSelfTapeSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        addSelfTape={addSelfTape}
      />

      {watchingTape && watchingTape.video_url && (
        <VideoModal
          url={watchingTape.video_url}
          title={watchingTape.title}
          onClose={() => setWatchingTape(null)}
        />
      )}
    </div>
  )
}
