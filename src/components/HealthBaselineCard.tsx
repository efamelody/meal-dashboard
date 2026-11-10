import { useEffect, useState } from "react"
import {
  AlertTriangle,
  Check,
  HeartPulse,
  ImagePlus,
  Sparkles,
} from "lucide-react"
import {
  healthProfileIsStale,
  loadHealthProfile,
  saveHealthProfile,
  type HealthProfile,
} from "../lib/health"
import {
  getHealthProfile,
  saveHealthProfile as saveRemoteHealthProfile,
} from "../lib/db"
import { analyzeHealthCheckup, type HealthImportDraft } from "../lib/gemini"
import { useAuth } from "../context/AuthContext"
import { Badge, Button, Card, CardHead, InlineNote } from "./ui"

const field =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tabular focus:outline-none focus:ring-2 focus:ring-ring"

export default function HealthBaselineCard() {
  const { session } = useAuth()
  const userId = session?.user?.id ?? null
  const [profile, setProfile] = useState<HealthProfile>(() =>
    loadHealthProfile(),
  )
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [draft, setDraft] = useState<HealthImportDraft | null>(null)
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

  function updateMetric(index: number, value: string) {
    setProfile((current) => ({
      ...current,
      metrics: current.metrics.map((metric, metricIndex) =>
        metricIndex === index
          ? { ...metric, value: Number(value) || 0 }
          : metric,
      ),
    }))
    setSaved(false)
  }

  function updateMetricDate(index: number, measured_at: string) {
    setProfile((current) => ({
      ...current,
      metrics: current.metrics.map((metric, metricIndex) =>
        metricIndex === index ? { ...metric, measured_at } : metric,
      ),
    }))
    setSaved(false)
  }

  function updateText(
    key: "focus" | "sleep_hours_target" | "water_litres_target",
    value: string,
  ) {
    setProfile((current) => ({ ...current, [key]: value }))
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
    reader.onload = async () => {
      setAnalyzing(true)
      setAnalysisError("")
      try {
        setDraft(await analyzeHealthCheckup(String(reader.result)))
      } catch (error) {
        setAnalysisError(
          error instanceof Error
            ? error.message
            : "Could not read that check-up image.",
        )
      } finally {
        setAnalyzing(false)
      }
    }
    reader.onerror = () => setAnalysisError("Could not read that image.")
    reader.readAsDataURL(file)
  }

  function applyDraft() {
    if (!draft) return
    const extracted = new Map(
      draft.metrics.map((metric) => [metric.key, metric]),
    )
    setProfile((current) => ({
      ...current,
      summary: draft.summary || current.summary,
      focus: draft.focus || current.focus,
      goals: draft.goals.length ? draft.goals : current.goals,
      recommendations: draft.recommendations.length
        ? draft.recommendations
        : current.recommendations,
      metrics: current.metrics.map((metric) => {
        const next = extracted.get(metric.key)
        return next
          ? {
              ...metric,
              value: next.value,
              unit: next.unit || metric.unit,
              label: next.label || metric.label,
              target: next.target || metric.target,
              measured_at: draft.measured_at || metric.measured_at,
              source: "AI-extracted check-up photo",
            }
          : metric
      }),
    }))
    setDraft(null)
    setSaved(false)
  }

  const stale = healthProfileIsStale(profile)

  return (
    <Card className="mt-4">
      <CardHead
        title="Health baseline and priorities"
        icon={<HeartPulse size={16} className="text-error" />}
        action={
          <Badge tone={stale ? "warning" : "sage"}>
            {stale ? "Review needed" : "Saved locally"}
          </Badge>
        }
      />
      <p className="text-sm leading-relaxed text-muted-foreground">
        These values came from your September 2025 health-screening summary.
        They guide food-planning advice but are not diagnoses.
      </p>
      <div className="mt-4 rounded-xl border border-dashed border-border bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ImagePlus size={15} className="text-primary" />
              Import from a check-up photo
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              AI reads the sheet and creates a draft. Nothing changes until you
              review and apply it.
            </p>
          </div>
          <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-foreground hover:bg-muted">
            {analyzing ? (
              <Sparkles size={14} className="animate-pulse" />
            ) : (
              <ImagePlus size={14} />
            )}
            {analyzing ? "Reading…" : "Upload photo"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhoto}
              disabled={analyzing}
            />
          </label>
        </div>
        {analysisError && (
          <p className="mt-3 text-xs text-error">{analysisError}</p>
        )}
        {draft && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              AI draft · {draft.measured_at}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              {draft.summary}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Found {draft.metrics.length} readable measurements. Check every
              value below before applying.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {draft.metrics.map((metric) => (
                <Badge key={metric.key} tone="neutral">
                  {metric.label}: {metric.value} {metric.unit}
                </Badge>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={applyDraft}>
                Apply draft for review
              </Button>
            </div>
          </div>
        )}
      </div>
      {stale && (
        <InlineNote tone="sand" icon={<AlertTriangle size={14} />}>
          These results are more than a year old. Keep them as a baseline, but
          update them after your next check-up before treating them as current.
        </InlineNote>
      )}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        <div>
          <label
            className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
            htmlFor="health-focus"
          >
            Main focus
          </label>
          <textarea
            id="health-focus"
            rows={4}
            value={profile.focus}
            onChange={(event) => updateText("focus", event.target.value)}
            className={`${field} resize-y`}
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-xs text-muted-foreground">
              Sleep target
              <input
                value={profile.sleep_hours_target}
                onChange={(event) =>
                  updateText("sleep_hours_target", event.target.value)
                }
                className={`${field} mt-1`}
                aria-label="Sleep target"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Water litres
              <input
                value={profile.water_litres_target}
                onChange={(event) =>
                  updateText("water_litres_target", event.target.value)
                }
                className={`${field} mt-1`}
                aria-label="Water litres target"
              />
            </label>
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Measurements
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {profile.metrics.map((metric, index) => (
              <div
                key={metric.key}
                className="rounded-lg border border-border bg-background p-3"
              >
                <label
                  className="block text-xs font-medium text-foreground"
                  htmlFor={`health-${metric.key}`}
                >
                  {metric.label}
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    id={`health-${metric.key}`}
                    type="number"
                    step="0.1"
                    value={metric.value}
                    onChange={(event) =>
                      updateMetric(index, event.target.value)
                    }
                    className={`${field} min-w-0`}
                  />
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {metric.unit}
                  </span>
                </div>
                <input
                  type="date"
                  value={metric.measured_at}
                  onChange={(event) =>
                    updateMetricDate(index, event.target.value)
                  }
                  className={`${field} mt-2 text-xs`}
                  aria-label={`${metric.label} measurement date`}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Target: {metric.target}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Used by the “Plan what to eat” assistant as dated context.
        </p>
        <Button size="sm" loading={saving} onClick={() => void handleSave()}>
          {saved ? <Check size={14} /> : null}
          {saved ? "Saved" : "Save health baseline"}
        </Button>
      </div>
    </Card>
  )
}
