import { useEffect, useState } from "react"
import {
  Ban,
  Check,
  HeartPulse,
  ImagePlus,
  Sparkles,
  Trash2,
} from "lucide-react"
import {
  loadHealthProfile,
  saveHealthProfile,
  type HealthProfile,
} from "../lib/healthProfile"
import {
  getHealthProfile,
  saveHealthProfile as saveRemoteHealthProfile,
} from "../lib/db"
import { summarizeHealthProfile } from "../lib/gemini"
import { useAuth } from "../context/AuthContext"
import { Badge, Button, Card, CardHead } from "./ui"

const field =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tabular focus:outline-none focus:ring-2 focus:ring-ring"

export default function HealthProfileCard() {
  const { session } = useAuth()
  const userId = session?.user?.id ?? null
  const [profile, setProfile] = useState<HealthProfile>(() =>
    loadHealthProfile(),
  )
  const [notes, setNotes] = useState("")
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [analyzingMode, setAnalyzingMode] = useState<"photo" | "notes" | null>(
    null,
  )
  const [analysisError, setAnalysisError] = useState("")

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!userId) {
        setProfile(loadHealthProfile())
        return
      }
      try {
        const remote = await getHealthProfile()
        if (!cancelled && remote) {
          setProfile(remote)
          saveHealthProfile(remote)
        }
      } catch (error) {
        console.error("getHealthProfile:", error)
        if (!cancelled) setProfile(loadHealthProfile())
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [userId])

  function updateSummary(value: string) {
    setProfile((current) => ({ ...current, summary: value }))
    setSaved(false)
  }

  function removeAvoidItem(index: number) {
    setProfile((current) => ({
      ...current,
      avoid_list: (current.avoid_list ?? []).filter((_, i) => i !== index),
    }))
    setSaved(false)
  }

  function clearAvoidList() {
    setProfile((current) => ({ ...current, avoid_list: [] }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      saveHealthProfile(profile)
      if (userId) await saveRemoteHealthProfile(profile)
      setSaved(true)
    } catch (error) {
      console.error("saveHealthProfile:", error)
      setSaved(false)
    } finally {
      setSaving(false)
    }
  }

  async function runSummarize(
    input: { imageDataUrl?: string; text?: string },
    mode: "photo" | "notes",
  ) {
    setAnalyzingMode(mode)
    setAnalysisError("")
    try {
      const result = await summarizeHealthProfile(input)
      setProfile((current) => ({
        ...current,
        summary: result.summary || current.summary,
        avoid_list: result.avoid_list?.length
          ? result.avoid_list
          : (current.avoid_list ?? []),
      }))
      setSaved(false)
    } catch (error) {
      setAnalysisError(
        error instanceof Error ? error.message : "Could not summarize.",
      )
    } finally {
      setAnalyzingMode(null)
    }
  }

  function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setAnalysisError("Choose an image file.")
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setAnalysisError("Choose an image under 15 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () =>
      void runSummarize({ imageDataUrl: String(reader.result) }, "photo")
    reader.onerror = () => setAnalysisError("Could not read that image.")
    reader.readAsDataURL(file)
  }

  function handleSummarizeNotes() {
    const text = notes.trim()
    if (!text) return
    void runSummarize({ text }, "notes")
  }

  const hasSummary = Boolean(profile.summary.trim())

  return (
    <Card className="mt-4">
      <CardHead
        title="Health profile"
        icon={<HeartPulse size={16} className="text-error" />}
        action={
          <Badge tone={hasSummary ? "sage" : "neutral"}>
            {hasSummary ? "Set" : "Not set"}
          </Badge>
        }
      />
      <p className="text-sm leading-relaxed text-muted-foreground">
        Save a summary of what you want to focus on — from a check-up photo or
        your own notes. Your meal assistant uses it as context when you ask for
        advice.
      </p>

      <div className="mt-4 rounded-xl border border-dashed border-border bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ImagePlus size={15} className="text-primary" />
              Import a check-up photo
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              AI reads the sheet and writes a focus summary you can edit.
            </p>
          </div>
          <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-foreground hover:bg-muted">
            {analyzingMode === "photo" ? (
              <Sparkles size={14} className="animate-pulse" />
            ) : (
              <ImagePlus size={14} />
            )}
            {analyzingMode === "photo" ? "Reading…" : "Upload photo"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhoto}
              disabled={analyzingMode !== null}
            />
          </label>
        </div>
      </div>

      {analysisError && (
        <p className="mt-3 text-xs text-error">{analysisError}</p>
      )}

      <div className="mt-4">
        <label
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
          htmlFor="health-summary"
        >
          Focus summary
        </label>
        <textarea
          id="health-summary"
          rows={6}
          value={profile.summary}
          onChange={(event) => updateSummary(event.target.value)}
          placeholder="e.g. Bone density and muscle mass look good, so keep that up. Body fat is high, so I want to focus on lowering it — less sugar and fried food, more protein and fibre."
          className={`${field} resize-y`}
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Or type what you want to focus on…"
          aria-label="Notes to summarize"
          className={`${field} flex-1`}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleSummarizeNotes}
          loading={analyzingMode === "notes"}
          disabled={analyzingMode !== null || !notes.trim()}
        >
          Summarize
        </Button>
      </div>

      {(profile.avoid_list?.length ?? 0) > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-background p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Ban size={15} className="text-terracotta" />
              What the analysis says to avoid
            </p>
            <button
              type="button"
              onClick={clearAvoidList}
              className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-error"
            >
              Clear all
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(profile.avoid_list ?? []).map((item, index) => (
              <span
                key={`${item.food}-${index}`}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card py-0.5 pl-1 pr-2 text-[12px] text-foreground"
              >
                <Badge tone={item.severity === "avoid" ? "error" : "warning"}>
                  {item.severity === "avoid" ? "Avoid" : "Limit"}
                </Badge>
                <span className="font-medium">{item.food}</span>
                {item.reason && (
                  <span className="text-[11px] text-muted-foreground">
                    · {item.reason}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeAvoidItem(index)}
                  aria-label={`Remove ${item.food} from the avoid list`}
                  className="-mr-1 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-error"
                >
                  <Trash2 size={11} />
                </button>
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Saved with your profile. When you log a meal by photo, matching
            foods get flagged with the same avoid/limit warning.
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Used by the meal assistant and meal-photo flags as saved context.
        </p>
        <Button size="sm" loading={saving} onClick={() => void handleSave()}>
          {saved ? <Check size={14} /> : null}
          {saved ? "Saved" : "Save health profile"}
        </Button>
      </div>
    </Card>
  )
}
