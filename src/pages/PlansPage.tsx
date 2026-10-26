import { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  Clock,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  Send,
  Trash2,
  UserPlus,
  X,
} from "lucide-react"
import {
  addActivity,
  addPlanComment,
  createPlan,
  deleteActivity,
  deletePlan,
  getFriendships,
  getPlanComments,
  getPlans,
  inviteToPlan,
  leavePlan,
  setPlanParticipantActivity,
  setPlanRsvp,
  updatePlan,
} from "../lib/db"
import { toISODate, parseISODate } from "../lib/dates"
import { inferActivityCategory, ACTIVITY_ICONS } from "../lib/activityMeta"
import type {
  ActivityPlan,
  ActivityType,
  FriendRow,
  PlanComment,
  RsvpStatus,
} from "../lib/types"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../components/Toast"
import { PageContainer, PageHeader } from "../components/PageHeader"
import { Avatar } from "../components/Avatar"
import {
  Badge,
  Button,
  Card,
  CardSkeleton,
  ConfirmDialog,
  EmptyState,
  InlineNote,
  Modal,
  Tabs,
} from "../components/ui"

const TODAY: string = toISODate(new Date())

const RSVP_OPTIONS: { value: RsvpStatus; label: string }[] = [
  { value: "going", label: "Going" },
  { value: "maybe", label: "Maybe" },
  { value: "declined", label: "Decline" },
]

const RSVP_LABELS: Record<RsvpStatus, string> = {
  invited: "Invited",
  going: "Going",
  maybe: "Maybe",
  declined: "Declined",
}

const RSVP_TONES: Record<
  RsvpStatus,
  "sage" | "warning" | "error" | "neutral" | "blue"
> = {
  invited: "blue",
  going: "sage",
  maybe: "warning",
  declined: "error",
}

interface PlanFormState {
  title: string
  activity_type: ActivityType
  plan_date: string
  plan_time: string
  duration_min: string
  location: string
  details: string
}

function emptyForm(date = TODAY): PlanFormState {
  return {
    title: "",
    activity_type: "other",
    plan_date: date,
    plan_time: "",
    duration_min: "60",
    location: "",
    details: "",
  }
}

function formFromPlan(plan: ActivityPlan): PlanFormState {
  return {
    title: plan.title,
    activity_type: plan.activity_type,
    plan_date: plan.plan_date,
    plan_time: plan.plan_time ?? "",
    duration_min: String(plan.duration_min ?? 60),
    location: plan.location ?? "",
    details: plan.details ?? "",
  }
}

function formatDate(date: string): string {
  return parseISODate(date).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return "just now"
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })
}

export default function PlansPage() {
  const { session } = useAuth()
  const userId = session?.user?.id ?? null
  const { toast } = useToast()

  const [plans, setPlans] = useState<ActivityPlan[]>([])
  const [friends, setFriends] = useState<FriendRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming")

  // Plan form (create + edit)
  const [formOpen, setFormOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<ActivityPlan | null>(null)
  const [form, setForm] = useState<PlanFormState>(emptyForm())
  const [invites, setInvites] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Invite more
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteTarget, setInviteTarget] = useState<ActivityPlan | null>(null)
  const [inviteIds, setInviteIds] = useState<string[]>([])
  const [inviting, setInviting] = useState(false)

  // Comments
  const [openComments, setOpenComments] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, PlanComment[]>>({})
  const [commentDraft, setCommentDraft] = useState("")
  const [sendingComment, setSendingComment] = useState(false)

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<ActivityPlan | null>(null)

  async function refresh() {
    if (!userId) return
    try {
      const [plansList, fs] = await Promise.all([
        getPlans(),
        getFriendships(),
      ])
      setPlans(plansList)
      setFriends(fs.friends)
    } catch (err) {
      console.error("plans load:", err)
      toast("Could not load plans", "error")
    }
  }

  useEffect(() => {
    let cancelled = false
    if (!userId) {
      setPlans([])
      setFriends([])
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all([getPlans(), getFriendships()])
      .then(([plansList, fs]) => {
        if (cancelled) return
        setPlans(plansList)
        setFriends(fs.friends)
      })
      .catch((err) => {
        console.error("plans load:", err)
        toast("Could not load plans", "error")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, toast])

  const { upcoming, past } = useMemo(() => {
    const upcoming: ActivityPlan[] = []
    const past: ActivityPlan[] = []
    for (const plan of plans) {
      if (plan.plan_date >= TODAY) upcoming.push(plan)
      else past.push(plan)
    }
    return { upcoming, past }
  }, [plans])

  function openCreate() {
    setEditingPlan(null)
    setForm(emptyForm())
    setInvites([])
    setFormOpen(true)
  }

  function openEdit(plan: ActivityPlan) {
    setEditingPlan(plan)
    setForm(formFromPlan(plan))
    setInvites([])
    setFormOpen(true)
  }

  function toggleInvite(id: string) {
    setInvites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const title = form.title.trim()
    if (!title) {
      toast("Add a name for the activity", "error")
      return
    }
    const duration = Number(form.duration_min)
    if (!Number.isFinite(duration) || duration < 1) {
      toast("Duration must be at least 1 minute", "error")
      return
    }
    setSaving(true)
    try {
      const payload = {
        title,
        activity_type: inferActivityCategory(title),
        plan_date: form.plan_date,
        plan_time: form.plan_time.trim() || null,
        location: form.location.trim() || null,
        details: form.details.trim() || null,
        duration_min: Math.round(duration),
      }
      if (editingPlan) {
        await updatePlan(editingPlan.id, payload)
        toast("Plan updated")
      } else {
        await createPlan(payload, invites)
        toast(`Plan created${invites.length ? " — invitations sent" : ""}`)
      }
      setFormOpen(false)
      await refresh()
    } catch (err) {
      console.error("save plan:", err)
      toast("Could not save the plan", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleRsvp(plan: ActivityPlan, rsvp: RsvpStatus) {
    const me = plan.participants.find((p) => p.user_id === userId)
    if (!me || me.rsvp === rsvp) return
    try {
      const updated = await setPlanRsvp(plan.id, rsvp)

      if (rsvp === "going" && !me.activity_id) {
        const act = await addActivity({
          date: plan.plan_date,
          activity_type: plan.activity_type,
          duration_min: plan.duration_min ?? 60,
          status: "planned",
          scheduled_time: plan.plan_time ?? null,
          notes: `Group plan: ${plan.title}`,
          name: plan.title,
        })
        await setPlanParticipantActivity(updated.id, act.id)
      } else if (rsvp !== "going" && me.activity_id) {
        await deleteActivity(me.activity_id).catch(() => {})
        await setPlanParticipantActivity(updated.id, null)
      }

      await refresh()
      toast(`You're ${RSVP_LABELS[rsvp].toLowerCase()} for ${plan.title}`)
    } catch (err) {
      console.error("rsvp:", err)
      toast("Could not update your response", "error")
    }
  }

  async function handleLeave(plan: ActivityPlan) {
    const me = plan.participants.find((p) => p.user_id === userId)
    try {
      if (me?.activity_id) {
        await deleteActivity(me.activity_id).catch(() => {})
      }
      await leavePlan(plan.id)
      await refresh()
      toast("You left the plan", "info")
    } catch (err) {
      console.error("leavePlan:", err)
      toast("Could not leave the plan", "error")
    }
  }

  function openInvite(plan: ActivityPlan) {
    setInviteTarget(plan)
    const existing = new Set(plan.participants.map((p) => p.user_id))
    setInviteIds(friends.filter((f) => !existing.has(f.peer.id)).map((f) => f.peer.id))
    setInviteOpen(true)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteTarget) return
    setInviting(true)
    try {
      await inviteToPlan(inviteTarget.id, inviteIds)
      setInviteOpen(false)
      await refresh()
      toast("Invitations sent")
    } catch (err) {
      console.error("inviteToPlan:", err)
      toast("Could not invite", "error")
    } finally {
      setInviting(false)
    }
  }

  async function toggleComments(plan: ActivityPlan) {
    if (openComments === plan.id) {
      setOpenComments(null)
      setCommentDraft("")
      return
    }
    setOpenComments(plan.id)
    setCommentDraft("")
    if (comments[plan.id]) return
    try {
      const list = await getPlanComments(plan.id)
      setComments((prev) => ({ ...prev, [plan.id]: list }))
    } catch (err) {
      console.error("getPlanComments:", err)
      toast("Could not load comments", "error")
    }
  }

  async function handleSendComment(e: React.FormEvent) {
    e.preventDefault()
    if (!openComments) return
    const trimmed = commentDraft.trim()
    if (!trimmed) return
    setSendingComment(true)
    try {
      await addPlanComment(openComments, trimmed)
      const list = await getPlanComments(openComments)
      setComments((prev) => ({ ...prev, [openComments]: list }))
      setCommentDraft("")
    } catch (err) {
      console.error("addPlanComment:", err)
      toast("Could not send the comment", "error")
    } finally {
      setSendingComment(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deletePlan(deleteTarget.id)
      setDeleteTarget(null)
      await refresh()
      toast("Plan deleted", "info")
    } catch (err) {
      console.error("deletePlan:", err)
      toast("Could not delete the plan", "error")
    }
  }

  const field =
    "rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"

  function renderPlanCard(plan: ActivityPlan) {
    const isCreator = plan.creator_id === userId
    const me = plan.participants.find((p) => p.user_id === userId)
    const isOpen = openComments === plan.id
    const Icon = ACTIVITY_ICONS[plan.activity_type] ?? ACTIVITY_ICONS.other
    const commentList = comments[plan.id]

    return (
      <Card key={plan.id}>
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-sage p-2.5 text-secondary-foreground">
            <Icon size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-foreground">
                  {plan.title}
                </h3>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays size={12} />
                    {formatDate(plan.plan_date)}
                  </span>
                  {plan.plan_time && (
                    <span className="inline-flex items-center gap-1">
                      <Clock size={12} />
                      {plan.plan_time}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} />
                    {plan.duration_min} min
                  </span>
                  {plan.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} />
                      {plan.location}
                    </span>
                  )}
                </p>
              </div>
              {isCreator && (
                <div className="flex items-center gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Edit plan"
                    onClick={() => openEdit(plan)}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Delete plan"
                    className="hover:text-error"
                    onClick={() => setDeleteTarget(plan)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              )}
            </div>

            {plan.details && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {plan.details}
              </p>
            )}

            {/* Attendees */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {plan.participants.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 pl-1 pr-2 py-0.5"
                >
                  <Avatar profile={p.profile} size="sm" />
                  <span className="text-xs font-medium text-foreground">
                    {p.profile.display_name || `@${p.profile.handle}`}
                  </span>
                  <Badge tone={RSVP_TONES[p.rsvp]}>{RSVP_LABELS[p.rsvp]}</Badge>
                </span>
              ))}
              {isCreator && (
                <button
                  type="button"
                  onClick={() => openInvite(plan)}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
                >
                  <UserPlus size={13} />
                  Invite
                </button>
              )}
            </div>

            {/* RSVP + actions */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
              <div className="flex items-center gap-1.5">
                {RSVP_OPTIONS.map((opt) => {
                  const active = me?.rsvp === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleRsvp(plan, opt.value)}
                      className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => toggleComments(plan)}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <MessageCircle size={15} />
                  <span className="tabular">{commentList?.length ?? 0}</span>
                </button>
                {!isCreator && (
                  <button
                    type="button"
                    onClick={() => handleLeave(plan)}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-error"
                  >
                    <X size={14} />
                    Leave
                  </button>
                )}
              </div>
            </div>

            {/* Comments */}
            {isOpen && (
              <div className="mt-3 border-t border-border pt-3">
                {!commentList ? (
                  <p className="py-2 text-xs text-muted-foreground">
                    Loading comments…
                  </p>
                ) : commentList.length === 0 ? (
                  <p className="py-2 text-xs text-muted-foreground">
                    No comments yet — coordinate the details here.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {commentList.map((c) => (
                      <div key={c.id} className="flex gap-2">
                        <span className="mt-0.5">
                          <Avatar profile={c.author} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs">
                            <span className="font-semibold text-foreground">
                              {c.author.display_name || `@${c.author.handle}`}
                            </span>{" "}
                            <span className="text-muted-foreground">
                              {timeAgo(c.created_at)}
                            </span>
                          </p>
                          <p className="text-sm text-foreground">{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <form onSubmit={handleSendComment} className="mt-2.5 flex gap-2">
                  <input
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    placeholder="Write a comment…"
                    aria-label="Write a comment"
                    className={`${field} min-w-0 flex-1`}
                  />
                  <Button
                    type="submit"
                    size="icon-sm"
                    loading={sendingComment}
                    disabled={!commentDraft.trim()}
                    aria-label="Send comment"
                  >
                    {!sendingComment && <Send size={14} />}
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </Card>
    )
  }

  const visiblePlans = tab === "upcoming" ? upcoming : past

  return (
    <PageContainer>
      <PageHeader
        title="Plans"
        subtitle="Plan activities with friends and track who's coming."
        actions={
          userId ? (
            <Button size="sm" onClick={openCreate}>
              <Plus size={15} />
              New plan
            </Button>
          ) : undefined
        }
      />

      {!userId ? (
        <Card>
          <InlineNote tone="blue">
            Sign in to plan activities with friends, invite them, and track
            RSVPs.
          </InlineNote>
        </Card>
      ) : (
        <>
          <Tabs
            className="mb-4"
            items={[
              { id: "upcoming", label: "Upcoming", count: upcoming.length },
              { id: "past", label: "Past", count: past.length },
            ]}
            value={tab}
            onChange={setTab}
          />

          {loading ? (
            <CardSkeleton rows={3} />
          ) : visiblePlans.length === 0 ? (
            <Card>
              <EmptyState
                icon={<CalendarDays size={22} />}
                title={tab === "upcoming" ? "No upcoming plans" : "No past plans"}
                description={
                  tab === "upcoming"
                    ? "Plan a run, game, or gym session and invite your friends."
                    : "Completed plans will show up here."
                }
                action={
                  tab === "upcoming" ? (
                    <Button size="sm" onClick={openCreate}>
                      <Plus size={15} />
                      New plan
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <div className="space-y-4">
              {visiblePlans.map((plan) => renderPlanCard(plan))}
            </div>
          )}
        </>
      )}

      {/* Create / edit plan */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingPlan ? "Edit plan" : "New plan"}
        description="Pick an activity, a time, and who to invite."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Activity
            </span>
            <input
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  title: e.target.value,
                  activity_type: inferActivityCategory(e.target.value),
                }))
              }
              placeholder="e.g. Badminton, Evening run, Gym"
              maxLength={60}
              className={`${field} w-full`}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Date
              </span>
              <input
                type="date"
                value={form.plan_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, plan_date: e.target.value }))
                }
                className={`${field} w-full`}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Time (optional)
              </span>
              <input
                type="time"
                value={form.plan_time}
                onChange={(e) =>
                  setForm((f) => ({ ...f, plan_time: e.target.value }))
                }
                className={`${field} w-full`}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Duration (min)
              </span>
              <input
                type="number"
                min={1}
                value={form.duration_min}
                onChange={(e) =>
                  setForm((f) => ({ ...f, duration_min: e.target.value }))
                }
                className={`${field} w-full`}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Location (optional)
              </span>
              <input
                value={form.location}
                onChange={(e) =>
                  setForm((f) => ({ ...f, location: e.target.value }))
                }
                placeholder="e.g. Community court"
                maxLength={80}
                className={`${field} w-full`}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Details (optional)
            </span>
            <textarea
              value={form.details}
              onChange={(e) =>
                setForm((f) => ({ ...f, details: e.target.value }))
              }
              rows={2}
              maxLength={280}
              placeholder="Anything friends should know"
              className={`${field} w-full resize-none`}
            />
          </label>

          {!editingPlan && (
            <div>
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Invite friends
              </span>
              {friends.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Add friends in Community first — then you can invite them here.
                </p>
              ) : (
                <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-lg border border-border p-2">
                  {friends.map((row) => {
                    const checked = invites.includes(row.peer.id)
                    return (
                      <label
                        key={row.id}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/60"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleInvite(row.peer.id)}
                          className="h-4 w-4 rounded border-border"
                        />
                        <Avatar profile={row.peer} size="sm" />
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                          {row.peer.display_name || `@${row.peer.handle}`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          @{row.peer.handle}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFormOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={saving}>
              {editingPlan ? "Save changes" : "Create plan"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Invite more */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite friends"
        description="They'll get an invite and can respond Going / Maybe / Decline."
      >
        <form onSubmit={handleInvite} className="space-y-3">
          {friends.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Add friends in Community first — then you can invite them here.
            </p>
          ) : (
            <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-border p-2">
              {friends.map((row) => {
                const checked = inviteIds.includes(row.peer.id)
                return (
                  <label
                    key={row.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/60"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setInviteIds((prev) =>
                          prev.includes(row.peer.id)
                            ? prev.filter((x) => x !== row.peer.id)
                            : [...prev, row.peer.id],
                        )
                      }
                      className="h-4 w-4 rounded border-border"
                    />
                    <Avatar profile={row.peer} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {row.peer.display_name || `@${row.peer.handle}`}
                    </span>
                  </label>
                )
              })}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={inviting}
              disabled={inviteIds.length === 0}
            >
              <UserPlus size={14} />
              Send invites
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this plan?"
        message="Everyone's responses and comments go with it."
        confirmLabel="Delete plan"
      />
    </PageContainer>
  )
}
