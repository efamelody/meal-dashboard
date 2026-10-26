import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Dumbbell,
  Lock,
  Trash2,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../components/Toast"
import { PageContainer, PageHeader } from "../components/PageHeader"
import {
  Badge,
  Button,
  Card,
  CardHead,
  CardSkeleton,
  EmptyState,
  ErrorState,
  InlineNote,
} from "../components/ui"
import UniversalActivityForm from "../components/activity/UniversalActivityForm"
import VoiceDescribePanel from "../components/activity/VoiceDescribePanel"
import CalorieEstimateCard from "../components/activity/CalorieEstimateCard"
import {
  ACTIVITY_ICONS,
  INTENSITY_LABELS,
  activityDisplayLabel,
  inferActivityCategory,
} from "../lib/activityMeta"
import {
  emptyActivityForm,
  providedFacts,
  toActivityInput,
  validateActivityForm,
  type ActivityFormErrors,
  type ActivityFormValue,
} from "../lib/activityForm"
import { estimateCalories } from "../lib/calorieEstimate"
import type { DraftInterpretation } from "../lib/activityAi"
import { interpretActivityDescription } from "../lib/activityAi"
import {
  addActivity,
  createPost,
  deleteActivity,
  getActivities,
  getUserProfile,
  updateActivity,
} from "../lib/db"
import { buildDemoActivities, demoProfile } from "../lib/demo"
import { addDays, toISODate } from "../lib/dates"
import type { Activity, UserProfile } from "../lib/types"

const TODAY = toISODate(new Date())
const LIST_START = addDays(TODAY, -13)

interface DraftMeta {
  source: "ai" | "local"
  notice?: string
  transcript: string
  approximate: boolean
  nameMissing: boolean
}

export default function ActivityLogPage() {
  const { session } = useAuth()
  const userId = session?.user?.id ?? null
  const { toast } = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState<ActivityFormValue>(() =>
    emptyActivityForm(TODAY),
  )
  const [errors, setErrors] = useState<ActivityFormErrors>({})
  const [saving, setSaving] = useState(false)
  const [draftMeta, setDraftMeta] = useState<DraftMeta | null>(null)
  const [reinterpreting, setReinterpreting] = useState(false)

  const [estimateOpen, setEstimateOpen] = useState(false)
  const [weightKg, setWeightKg] = useState("")

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [previewActivities, setPreviewActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    if (!userId) {
      setProfile(demoProfile)
      setActivities(buildDemoActivities(LIST_START, TODAY))
      setLoading(false)
      return
    }
    try {
      const [p, acts] = await Promise.all([
        getUserProfile(),
        getActivities(LIST_START, TODAY),
      ])
      setProfile(p)
      setActivities(acts)
    } catch (err) {
      console.error("activity load:", err)
      setLoadError("Could not load your recent activities.")
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  function patch(next: Partial<ActivityFormValue>) {
    setForm((prev) => ({ ...prev, ...next }))
    setErrors((prev) => {
      if (!Object.keys(prev).length) return prev
      const cleared = { ...prev }
      for (const key of Object.keys(next) as Array<keyof ActivityFormValue>) {
        if (key in cleared) delete cleared[(key as keyof ActivityFormErrors)]
      }
      return cleared
    })
  }

  // ── Draft application ─────────────────────────────────────────────
  function applyDraft(interpretation: DraftInterpretation, transcript: string) {
    const d = interpretation.draft
    setForm((prev) => ({
      ...prev,
      name: d.name ?? prev.name,
      durationMin:
        d.duration_min != null ? String(d.duration_min) : prev.durationMin,
      date: d.date ?? prev.date,
      time: d.time ?? prev.time,
      distanceKm:
        d.distance_km != null ? String(d.distance_km) : prev.distanceKm,
      intensity: d.intensity ?? prev.intensity,
      details: d.details ?? prev.details,
      notes: d.notes ?? prev.notes,
    }))
    setErrors({})
    setDraftMeta({
      source: interpretation.source,
      notice: interpretation.notice,
      transcript,
      approximate: d.duration_approximate,
      nameMissing: !d.name,
    })
    if (d.duration_min != null) setEstimateOpen(true)
  }

  async function retryInterpret() {
    if (!draftMeta || reinterpreting) return
    setReinterpreting(true)
    try {
      const interpretation = await interpretActivityDescription(
        draftMeta.transcript,
      )
      applyDraft(interpretation, draftMeta.transcript)
    } finally {
      setReinterpreting(false)
    }
  }

  // ── Save ──────────────────────────────────────────────────────────
  async function handleSave() {
    const found = validateActivityForm(form)
    setErrors(found)
    if (Object.keys(found).length) {
      toast("Check the highlighted fields", "error")
      const FIELD_IDS: Record<string, string> = {
        name: "act-name",
        durationMin: "act-duration",
        date: "act-date",
        distanceKm: "act-distance",
        shareNote: "act-share-note",
      }
      const first = Object.keys(found)[0]
      document.getElementById(FIELD_IDS[first] ?? "")?.focus()
      return
    }

    setSaving(true)
    try {
      const input = toActivityInput(form, TODAY)

      if (!userId) {
        const local: Activity = {
          id: `preview-${Date.now()}`,
          user_id: "preview",
          ...input,
        }
        setPreviewActivities((prev) => [local, ...prev])
        if (form.share) {
          toast(
            "Sharing needs an account — saved privately in this preview",
            "info",
          )
        } else {
          toast("Saved in this preview — sign in to keep it", "info")
        }
      } else {
        const saved = await addActivity(input)
        let shared = false
        if (form.share) {
          try {
            await createPost({
              kind: "activity",
              description: "",
              content: form.shareNote.trim(),
              snapshot: {
                activity_type: saved.activity_type,
                name: saved.name ?? undefined,
                duration_min: saved.duration_min,
                status: saved.status,
                distance_km: saved.distance_km ?? undefined,
                intensity: saved.intensity ?? undefined,
              },
            })
            shared = true
          } catch (err) {
            console.error("share activity:", err)
            toast(
              "Saved — but sharing failed. You can share it from Community.",
              "error",
            )
          }
          if (shared) {
            try {
              await updateActivity(saved.id, {
                shared_at: new Date().toISOString(),
              })
            } catch (err) {
              console.error("update shared_at:", err)
            }
          }
        }
        await load()
        if (!form.share) {
          toast("Activity saved — private to you")
        } else if (shared) {
          toast("Activity saved and shared with friends")
        }
      }

      setForm(emptyActivityForm(form.date))
      setErrors({})
      setDraftMeta(null)
      setEstimateOpen(false)
      setWeightKg("")
    } catch (err) {
      console.error("addActivity:", err)
      toast("Could not save the activity — try again", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(activity: Activity) {
    if (activity.user_id === "preview") {
      setPreviewActivities((prev) => prev.filter((a) => a.id !== activity.id))
      toast("Removed from this preview", "info")
      return
    }
    try {
      await deleteActivity(activity.id)
      await load()
      toast("Activity removed", "info")
    } catch (err) {
      console.error("deleteActivity:", err)
      toast("Could not remove the activity", "error")
    }
  }

  // ── Derived ───────────────────────────────────────────────────────
  const category = inferActivityCategory(form.name)
  const durationMin = Number(form.durationMin)
  const estimate = useMemo(
    () =>
      estimateCalories({
        name: form.name.trim() || null,
        category,
        intensity: form.intensity,
        durationMin: Number.isFinite(durationMin) ? durationMin : 0,
        weightKg: weightKg.trim() ? Number(weightKg) : null,
      }),
    [form.name, category, form.intensity, durationMin, weightKg],
  )

  const provided = useMemo(() => {
    const facts = providedFacts(form)
    if (form.intensity !== "unknown") {
      facts.push(`${INTENSITY_LABELS[form.intensity].toLowerCase()} effort`)
    }
    return facts
  }, [form])

  const inferred = useMemo(() => {
    const list: string[] = []
    const name = form.name.trim()
    if (name) {
      if (estimate.status === "ok") {
        const label = estimate.label
        list.push(
          label.toLowerCase().includes(name.toLowerCase())
            ? `Energy model: ${label}`
            : `Energy model: ${label} (from “${name}”)`,
        )
      } else {
        list.push(`No energy model yet for “${name}”`)
      }
    }
    if (form.intensity === "unknown") {
      list.push("effort not stated — full easy–vigorous range used")
    }
    if (draftMeta?.source === "local") {
      list.push("description read on this device (AI unavailable)")
    }
    return list
  }, [estimate, form.intensity, form.name, draftMeta])

  const recent = useMemo(() => {
    const merged = userId ? activities : [...previewActivities, ...activities]
    return [...merged].sort((a, b) =>
      a.date === b.date
        ? b.id.localeCompare(a.id)
        : b.date.localeCompare(a.date),
    )
  }, [activities, previewActivities, userId])

  const futureDate = form.date > TODAY

  return (
    <PageContainer>
      <PageHeader
        title="Log activity"
        subtitle="Any movement counts — swimming, walks, gym, dancing. Add the basics; everything else is optional and private by default."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/progress")}
          >
            See progress
            <ArrowRight size={14} />
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-5">
        {/* ── Voice + form ─────────────────────────────────────────── */}
        <div className="space-y-4 lg:col-span-3">
          <VoiceDescribePanel onDraft={applyDraft} />

          <Card>
            <CardHead
              title="Activity details"
              icon={<Dumbbell size={16} className="text-success" />}
              action={
                !userId ? (
                  <Badge tone="sand">Preview mode</Badge>
                ) : futureDate ? (
                  <Badge tone="blue">Planned</Badge>
                ) : (
                  <Badge tone="sage">Completed</Badge>
                )
              }
            />

            {draftMeta && (
              <div className="mb-5 animate-fade-in-up rounded-2xl border border-[#d4e0ed] bg-blue-soft/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">
                      Draft from your description
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      “{draftMeta.transcript}”
                    </p>
                  </div>
                  <Badge tone={draftMeta.source === "ai" ? "blue" : "neutral"}>
                    {draftMeta.source === "ai"
                      ? "Read with AI"
                      : "Read on device"}
                  </Badge>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {form.name.trim() && (
                    <Badge tone="sage">{form.name.trim()}</Badge>
                  )}
                  <Badge tone="neutral">
                    {draftMeta.approximate ? "≈ " : ""}
                    {form.durationMin || "?"} min
                  </Badge>
                  <Badge tone="neutral">
                    effort: {INTENSITY_LABELS[form.intensity]}
                  </Badge>
                  {form.distanceKm.trim() && (
                    <Badge tone="neutral">{form.distanceKm.trim()} km</Badge>
                  )}
                </div>

                {draftMeta.nameMissing && !form.name.trim() && (
                  <div className="mt-3">
                    <InlineNote tone="warning" icon={<AlertCircle size={13} />}>
                      We couldn&apos;t find a specific activity name in that
                      description — add it in the Activity field below.
                    </InlineNote>
                  </div>
                )}

                {draftMeta.notice && (
                  <div className="mt-3 space-y-2">
                    <InlineNote tone="warning" icon={<AlertCircle size={13} />}>
                      {draftMeta.notice}
                    </InlineNote>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={retryInterpret}
                      loading={reinterpreting}
                    >
                      Try the AI again
                    </Button>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#d4e0ed] pt-3">
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Everything below is editable — fix anything we read wrong.
                  </p>
                  <button
                    type="button"
                    onClick={() => setDraftMeta(null)}
                    className="shrink-0 text-[11px] font-medium text-primary hover:underline"
                  >
                    Clear draft
                  </button>
                </div>
              </div>
            )}

            <UniversalActivityForm
              value={form}
              errors={errors}
              onChange={patch}
              onSubmit={handleSave}
              saving={saving}
              submitLabel={
                form.share ? "Save & share activity" : "Save activity"
              }
              footer={
                <CalorieEstimateCard
                  open={estimateOpen}
                  onToggle={() => setEstimateOpen((open) => !open)}
                  result={estimate}
                  provided={provided}
                  inferred={inferred}
                  weightKg={weightKg}
                  onWeightChange={setWeightKg}
                  profileWeightKg={profile?.weight_kg ?? null}
                />
              }
            />
          </Card>
        </div>

        {/* ── Recent + privacy ─────────────────────────────────────── */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHead
              title="Recent activities"
              icon={<CalendarDays size={16} className="text-primary" />}
              action={
                recent.length > 0 ? (
                  <Badge tone="neutral">{recent.length}</Badge>
                ) : null
              }
            />

            {loading ? (
              <CardSkeleton rows={3} />
            ) : loadError ? (
              <ErrorState message={loadError} onRetry={load} />
            ) : recent.length === 0 ? (
              <EmptyState
                compact
                icon={<Dumbbell size={20} />}
                title="Nothing logged yet"
                description="Your saved sessions show up here — private unless you choose to share."
              />
            ) : (
              <ul className="space-y-2">
                {recent.slice(0, 8).map((activity) => {
                  const Icon = ACTIVITY_ICONS[activity.activity_type]
                  return (
                    <li
                      key={activity.id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sage text-secondary-foreground">
                        <Icon size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {activityDisplayLabel(activity)}
                        </p>
                        <p className="tabular truncate text-xs text-muted-foreground">
                          {activity.duration_min} min · {activity.date}
                          {activity.scheduled_time
                            ? ` · ${activity.scheduled_time}`
                            : ""}
                          {activity.distance_km
                            ? ` · ${activity.distance_km} km`
                            : ""}
                        </p>
                      </div>
                      {activity.shared_at ? (
                        <Badge tone="blue">Shared</Badge>
                      ) : (
                        <Badge tone="neutral">Private</Badge>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(activity)}
                        aria-label={`Delete ${activityDisplayLabel(activity)}`}
                        className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-error"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <InlineNote tone="sage" icon={<Lock size={14} />}>
            <span className="font-medium">Private by default. </span>
            Nothing is published automatically — your transcript, notes, effort
            and any calorie estimate stay on this record unless you tick “Share
            this activity”.
          </InlineNote>

          {!userId && (
            <InlineNote tone="sand" icon={<Lock size={13} />}>
              You&apos;re viewing sample data.{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="font-medium underline underline-offset-2"
              >
                Sign in
              </button>{" "}
              to save activities to your account and share them with friends.
            </InlineNote>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
