import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, CalendarDays, Dumbbell, Lock, Trash2 } from "lucide-react"
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
import CalorieEstimateCard from "../components/activity/CalorieEstimateCard"
import {
  ACTIVITY_ICONS,
  FEEL_META,
  activityDisplayLabel,
} from "../lib/activityMeta"
import {
  emptyActivityForm,
  toActivityInput,
  validateActivityForm,
  type ActivityFormErrors,
  type ActivityFormValue,
} from "../lib/activityForm"
import { estimateCalories } from "../lib/calorieEstimate"
import {
  addActivity,
  createPost,
  deleteActivity,
  getActivities,
  getUserProfile,
  updateActivity,
} from "../lib/db"
import { buildDemoActivities, demoProfile } from "../lib/demo"
import { FEATURES } from "../lib/features"
import { addDays, toISODate } from "../lib/dates"
import type { Activity, UserProfile } from "../lib/types"

const TODAY = toISODate(new Date())
const LIST_START = addDays(TODAY, -13)

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
                intensity: saved.intensity ?? undefined,
                feel: saved.feel ?? undefined,
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
  const durationMin = Number(form.durationMin)
  const estimate = useMemo(
    () =>
      estimateCalories({
        name: form.name.trim() || null,
        category: form.category,
        intensity: form.effort,
        durationMin: Number.isFinite(durationMin) ? durationMin : 0,
        weightKg: profile?.weight_kg ?? null,
      }),
    [form.name, form.category, form.effort, durationMin, profile],
  )

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
        subtitle="Pick a category, how long, and how it felt — done."
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
        {/* ── Form ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-3">
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

            <UniversalActivityForm
              value={form}
              errors={errors}
              onChange={patch}
              onSubmit={handleSave}
              saving={saving}
              submitLabel={
                form.share ? "Save & share activity" : "Save activity"
              }
              showShare={FEATURES.communitySharing}
              footer={<CalorieEstimateCard result={estimate} />}
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
                          {activity.feel ? (
                            <span
                              aria-hidden="true"
                              className="ml-1.5"
                              title={FEEL_META[activity.feel].label}
                            >
                              {FEEL_META[activity.feel].emoji}
                            </span>
                          ) : null}
                        </p>
                        <p className="tabular truncate text-xs text-muted-foreground">
                          {activity.duration_min} min · {activity.date}
                          {activity.scheduled_time
                            ? ` · ${activity.scheduled_time}`
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
            Nothing is published automatically — your description, effort and
            how you felt stay on this record unless you tick “Share this
            activity”.
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
