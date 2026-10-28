import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  CalendarDays,
  Check,
  Clock,
  Copy,
  Heart,
  Link2,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import {
  acceptFriendRequest,
  addPostComment,
  createPost,
  deleteFriendship,
  deletePost,
  getActivities,
  getAppProfileByHandle,
  getFeed,
  getFriendships,
  getMeals,
  getOrCreateAppProfile,
  getPostComments,
  saveAppProfile,
  searchAppProfiles,
  sendFriendRequest,
  togglePostLike,
} from "../lib/db"
import { entriesForDate } from "../lib/mealLog"
import { useMealLog } from "../context/MealLogContext"
import { startOfWeek, toISODate } from "../lib/dates"
import type {
  Activity,
  AppProfile,
  FeedComment,
  FeedPost,
  FriendRow,
  ISODate,
  Meal,
  PostKind,
  PostSnapshot,
} from "../lib/types"
import {
  ACTIVITY_ICONS,
  ACTIVITY_LABELS,
  INTENSITY_LABELS,
  activityDisplayLabel,
  isGenericActivityName,
} from "../lib/activityMeta"
import { demoFeed } from "../lib/demo"
import { useAuth } from "../context/AuthContext"
import { useNotifications } from "../context/NotificationsContext"
import { useToast } from "../components/Toast"
import { Avatar } from "../components/Avatar"
import { PageContainer, PageHeader } from "../components/PageHeader"
import {
  Badge,
  Button,
  Card,
  CardHead,
  CardSkeleton,
  ConfirmDialog,
  InlineNote,
  Modal,
} from "../components/ui"

const TODAY: ISODate = toISODate(new Date())

const POST_KINDS: PostKind[] = ["update", "meal", "recipe", "activity"]

const KIND_LABELS: Record<PostKind, string> = {
  update: "Update",
  meal: "Meal",
  recipe: "Recipe",
  activity: "Activity",
}

const KIND_TONES: Record<PostKind, "sage" | "sand" | "blue" | "neutral"> = {
  update: "neutral",
  meal: "sage",
  recipe: "sand",
  activity: "blue",
}

const KIND_PLACEHOLDERS: Record<PostKind, string> = {
  update: "What's on the menu?",
  meal: "Say something about this meal (optional)",
  recipe: "What makes this recipe good? (optional)",
  activity: "How did it go? (optional)",
}

const emptyFriendships = (): {
  friends: FriendRow[]
  incoming: FriendRow[]
  outgoing: FriendRow[]
} => ({
  friends: [],
  incoming: [],
  outgoing: [],
})

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

function SnapshotCard({ post }: { post: FeedPost }) {
  const s = post.snapshot

  if (post.kind === "activity") {
    const type = s.activity_type ?? "other"
    const Icon = ACTIVITY_ICONS[type]
    return (
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-muted/60 px-3.5 py-3">
        <span className="rounded-lg bg-sage p-2 text-secondary-foreground">
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {s.name && !isGenericActivityName(s.name)
              ? s.name
              : ACTIVITY_LABELS[type]}
          </p>
          <p className="tabular truncate text-xs text-muted-foreground">
            {s.duration_min} min
            {s.distance_km ? ` · ${s.distance_km} km` : ""}
            {s.intensity && s.intensity !== "unknown"
              ? ` · ${INTENSITY_LABELS[s.intensity].toLowerCase()}`
              : ""}
          </p>
        </div>
        <Badge tone={s.status === "completed" ? "sage" : "blue"}>
          {s.status === "completed" ? "Done" : "Planned"}
        </Badge>
      </div>
    )
  }

  if (post.kind === "meal" || post.kind === "recipe") {
    if (!s.name) return null
    return (
      <div className="mt-3 rounded-xl border border-border bg-muted/60 px-3.5 py-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-foreground">{s.name}</p>
          <span className="tabular shrink-0 text-sm font-semibold text-terracotta">
            {s.calories} kcal
          </span>
        </div>
        <p className="tabular mt-1 text-xs text-muted-foreground">
          P {s.protein_g} g · C {s.carbs_g} g · F {s.fat_g} g
        </p>
        {s.ingredients && s.ingredients.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {s.ingredients.slice(0, 5).map((name) => (
              <Badge key={name} tone="neutral">
                {name}
              </Badge>
            ))}
            {(s.ingredient_count ?? 0) > 5 && (
              <Badge tone="neutral">
                +{(s.ingredient_count ?? 0) - 5} more
              </Badge>
            )}
          </div>
        )}
        {post.kind === "recipe" && s.prep_time_min != null && (
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={12} />
            {s.prep_time_min} min prep
          </p>
        )}
      </div>
    )
  }

  return null
}

export default function CommunityPage() {
  const { session } = useAuth()
  const userId = session?.user?.id ?? null
  const { toast } = useToast()
  const { log } = useMealLog()
  const { refreshNotifications } = useNotifications()
  const [searchParams] = useSearchParams()

  const [myProfile, setMyProfile] = useState<AppProfile | null>(null)
  const [feed, setFeed] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [friendships, setFriendships] = useState(emptyFriendships())
  const [meals, setMeals] = useState<Meal[]>([])
  const [activities, setActivities] = useState<Activity[]>([])

  // Composer
  const [kind, setKind] = useState<PostKind>("update")
  const [description, setDescription] = useState("")
  const [content, setContent] = useState("")
  const [attachId, setAttachId] = useState("")
  const [posting, setPosting] = useState(false)

  // Comments
  const [openComments, setOpenComments] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, FeedComment[]>>({})
  const [commentDraft, setCommentDraft] = useState("")
  const [sendingComment, setSendingComment] = useState(false)

  // Delete a post
  const [deleteTarget, setDeleteTarget] = useState<FeedPost | null>(null)

  // Friend search
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<AppProfile[]>([])
  const [searching, setSearching] = useState(false)

  // Add by handle
  const [addInput, setAddInput] = useState("")
  const [directResult, setDirectResult] = useState<AppProfile | null>(null)
  const [directLoading, setDirectLoading] = useState(false)

  // Edit my community profile
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editHandle, setEditHandle] = useState("")
  const [editBio, setEditBio] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)

  const addParam = searchParams.get("add")

  useEffect(() => {
    if (!userId || !addParam) return
    resolveHandle(addParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, addParam])

  useEffect(() => {
    let cancelled = false
    if (!userId) {
      setFeed(demoFeed)
      setFriendships(emptyFriendships())
      setMyProfile(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const weekStart = startOfWeek()
    Promise.all([
      getOrCreateAppProfile(),
      getFriendships(),
      getFeed(),
      getMeals(),
      getActivities(weekStart, TODAY),
    ])
      .then(([profile, fs, fd, ml, acts]) => {
        if (cancelled) return
        setMyProfile(profile)
        setFriendships(fs)
        setFeed(fd)
        setMeals(ml)
        setActivities(acts)
      })
      .catch((err) => {
        console.error("community load:", err)
        toast("Could not load the community", "error")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, toast])

  async function refreshFeed() {
    try {
      setFeed(await getFeed())
    } catch (err) {
      console.error("getFeed:", err)
      toast("Could not refresh the feed", "error")
    }
  }

  async function refreshFriendships() {
    try {
      setFriendships(await getFriendships())
    } catch (err) {
      console.error("getFriendships:", err)
      toast("Could not refresh friends", "error")
    }
  }

  // ── Friend search (debounced) ───────────────────────────────────
  useEffect(() => {
    if (!userId || query.trim().length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(() => {
      searchAppProfiles(query)
        .then((res) => {
          if (cancelled) return
          setResults(res)
          setSearching(false)
        })
        .catch(() => {
          if (!cancelled) setSearching(false)
        })
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, userId])

  function relationWith(
    id: string,
  ): "none" | "friend" | "incoming" | "outgoing" {
    if (friendships.friends.some((f) => f.peer.id === id)) return "friend"
    if (friendships.incoming.some((f) => f.peer.id === id)) return "incoming"
    if (friendships.outgoing.some((f) => f.peer.id === id)) return "outgoing"
    return "none"
  }

  async function handleAdd(profile: AppProfile) {
    try {
      await sendFriendRequest(profile.id)
      await refreshFriendships()
      toast(`Request sent to ${profile.display_name || `@${profile.handle}`}`)
    } catch (err) {
      console.error("sendFriendRequest:", err)
      toast("Could not send the request", "error")
    }
  }

  async function handleAccept(row: FriendRow) {
    try {
      await acceptFriendRequest(row.id)
      await refreshFriendships()
      await refreshFeed()
      refreshNotifications()
      toast(
        `${row.peer.display_name || `@${row.peer.handle}`} is now your friend`,
      )
    } catch (err) {
      console.error("acceptFriendRequest:", err)
      toast("Could not accept the request", "error")
    }
  }

  async function handleDeleteFriendship(row: FriendRow, verb: string) {
    try {
      await deleteFriendship(row.id)
      await refreshFriendships()
      refreshNotifications()
      toast(verb, "info")
    } catch (err) {
      console.error("deleteFriendship:", err)
      toast("Could not update the request", "error")
    }
  }

  // ── Share handle & add by handle ─────────────────────────────────
  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast(`${label} copied`)
    } catch {
      toast("Could not copy to clipboard", "error")
    }
  }

  function copyHandle() {
    if (myProfile) copyText(`@${myProfile.handle}`, "Handle")
  }

  function copyInviteLink() {
    if (myProfile) {
      copyText(
        `${window.location.origin}/community?add=${myProfile.handle}`,
        "Invite link",
      )
    }
  }

  async function resolveHandle(handle: string) {
    const clean = handle.trim().replace(/^@/, "")
    if (!userId) return
    if (clean.length < 2) {
      toast("Enter a handle to look up", "error")
      return
    }
    setDirectLoading(true)
    try {
      const profile = await getAppProfileByHandle(clean)
      setDirectResult(profile)
      if (!profile) toast(`No one found with @${clean}`, "error")
    } catch (err) {
      console.error("getAppProfileByHandle:", err)
      toast("Could not look up that handle", "error")
    } finally {
      setDirectLoading(false)
    }
  }

  async function handleAddByHandle(e: React.FormEvent) {
    e.preventDefault()
    await resolveHandle(addInput)
  }

  // ── Composer ────────────────────────────────────────────────────
  const loggedToday = useMemo(() => entriesForDate(log, TODAY), [log])

  const attachOptions = useMemo(() => {
    if (kind === "update") return []
    if (kind === "meal") {
      const logged = loggedToday.flatMap((e) =>
        e.entry.foods.map((food) => ({
          value: `logged:${e.type}:${food.id}`,
          label: `${e.type} · ${food.food} (${food.calories} kcal)`,
        })),
      )
      const saved = meals.map((m) => ({
        value: `meal:${m.id}`,
        label: `${m.name} (${m.calories} kcal)`,
      }))
      return [...logged, ...saved]
    }
    if (kind === "recipe") {
      return meals
        .filter((m) => m.ingredients.length > 0)
        .map((m) => ({
          value: `meal:${m.id}`,
          label: `${m.name} · ${m.ingredients.length} ingredients`,
        }))
    }
    return [...activities]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((a) => ({
        value: `act:${a.id}`,
        label: `${a.date.slice(5)} · ${activityDisplayLabel(a)} · ${a.duration_min} min`,
      }))
  }, [kind, meals, activities, loggedToday])

  function snapshotFor(): PostSnapshot {
    if (kind === "update" || !attachId) return {}
    const sep = attachId.indexOf(":")
    const prefix = attachId.slice(0, sep)
    const id = attachId.slice(sep + 1)

    if (prefix === "logged") {
      const [, type, foodId] = attachId.split(":")
      const found = loggedToday
        .find((e) => e.type === type)
        ?.entry.foods.find((food) => food.id === foodId)
      if (!found) return {}
      return {
        name: found.food,
        calories: found.calories,
        protein_g: found.protein_g,
        carbs_g: found.carbs_g,
        fat_g: found.fat_g,
      }
    }
    if (prefix === "meal") {
      const meal = meals.find((m) => m.id === id)
      if (!meal) return {}
      const base: PostSnapshot = {
        name: meal.name,
        calories: meal.calories,
        protein_g: meal.protein_g,
        carbs_g: meal.carbs_g,
        fat_g: meal.fat_g,
        prep_time_min: meal.prep_time_min ?? null,
      }
      if (kind === "recipe") {
        base.ingredients = meal.ingredients.slice(0, 6).map((i) => i.item_name)
        base.ingredient_count = meal.ingredients.length
      }
      return base
    }
    if (prefix === "act") {
      const activity = activities.find((a) => a.id === id)
      if (!activity) return {}
      return {
        activity_type: activity.activity_type,
        name: activity.name ?? undefined,
        duration_min: activity.duration_min,
        status: activity.status,
        distance_km: activity.distance_km ?? undefined,
        intensity: activity.intensity ?? undefined,
      }
    }
    return {}
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    const trimmed = content.trim()
    if (!trimmed && !attachId) {
      toast("Write something or attach a snapshot first", "error")
      return
    }
    setPosting(true)
    try {
      await createPost({
        kind,
        description: description.trim(),
        content: trimmed,
        snapshot: snapshotFor(),
      })
      setDescription("")
      setContent("")
      setAttachId("")
      await refreshFeed()
      toast("Posted to your friends")
    } catch (err) {
      console.error("createPost:", err)
      toast("Could not post", "error")
    } finally {
      setPosting(false)
    }
  }

  // ── Likes & comments ────────────────────────────────────────────
  async function handleLike(post: FeedPost) {
    const next = !post.likedByMe
    setFeed(
      feed.map((p) =>
        p.id === post.id
          ? {
              ...p,
              likedByMe: next,
              likes: p.likes + (next ? 1 : -1),
            }
          : p,
      ),
    )
    try {
      await togglePostLike(post.id, next)
    } catch (err) {
      console.error("togglePostLike:", err)
      setFeed(
        feed.map((p) =>
          p.id === post.id
            ? {
                ...p,
                likedByMe: post.likedByMe,
                likes: post.likes,
              }
            : p,
        ),
      )
      toast("Could not update the like", "error")
    }
  }

  async function toggleComments(post: FeedPost) {
    if (openComments === post.id) {
      setOpenComments(null)
      setCommentDraft("")
      return
    }
    setOpenComments(post.id)
    setCommentDraft("")
    if (comments[post.id]) return
    try {
      const list = await getPostComments(post.id)
      setComments((prev) => ({
        ...prev,
        [post.id]: list,
      }))
    } catch (err) {
      console.error("getPostComments:", err)
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
      await addPostComment(openComments, trimmed)
      const list = await getPostComments(openComments)
      setComments((prev) => ({
        ...prev,
        [openComments]: list,
      }))
      setCommentDraft("")
      await refreshFeed()
    } catch (err) {
      console.error("addPostComment:", err)
      toast("Could not send the comment", "error")
    } finally {
      setSendingComment(false)
    }
  }

  async function handleDeletePost() {
    if (!deleteTarget) return
    try {
      await deletePost(deleteTarget.id)
      setDeleteTarget(null)
      await refreshFeed()
      toast("Post deleted", "info")
    } catch (err) {
      console.error("deletePost:", err)
      toast("Could not delete the post", "error")
    }
  }

  // ── My community profile ────────────────────────────────────────
  function openEditProfile() {
    if (!myProfile) return
    setEditName(myProfile.display_name)
    setEditHandle(myProfile.handle)
    setEditBio(myProfile.bio)
    setEditOpen(true)
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    const handle = editHandle.trim().toLowerCase()
    if (!handle) {
      toast("Handle cannot be empty", "error")
      return
    }
    setSavingProfile(true)
    try {
      const updated = await saveAppProfile({
        display_name: editName.trim(),
        handle,
        bio: editBio.trim(),
      })
      setMyProfile(updated)
      setEditOpen(false)
      await refreshFeed()
      toast("Profile updated")
    } catch (err) {
      console.error("saveAppProfile:", err)
      toast("Could not save — that handle may already be taken", "error")
    } finally {
      setSavingProfile(false)
    }
  }

  const field =
    "rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"

  return (
    <PageContainer>
      <PageHeader
        title="Community"
        subtitle="Share meals, recipes, and activity with friends."
        actions={
          <Link
            to="/plans"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            <CalendarDays size={15} />
            Plans
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ── Feed column ─────────────────────────────────────── */}
        <div className="space-y-4 lg:col-span-2">
          {/* Composer */}
          <Card>
            <CardHead
              title="Share with friends"
              icon={<Plus size={16} className="text-primary" />}
            />
            {!userId ? (
              <InlineNote tone="blue">
                Sign in to post meals, recipes, and activity to your
                friends&apos; feed.
              </InlineNote>
            ) : (
              <form onSubmit={handlePost}>
                <div className="flex flex-wrap gap-1.5">
                  {POST_KINDS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setKind(k)
                        setAttachId("")
                      }}
                      className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                        kind === k
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {KIND_LABELS[k]}
                    </button>
                  ))}
                </div>

                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Headline (optional)"
                  maxLength={120}
                  aria-label="Post headline"
                  className={`${field} mt-3 w-full rounded-xl font-medium`}
                />

                <textarea
                  rows={2}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={KIND_PLACEHOLDERS[kind]}
                  aria-label="Post text"
                  className={`${field} mt-2 w-full resize-none rounded-xl`}
                />

                {attachOptions.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Attach:
                    </span>
                    <select
                      value={attachId}
                      onChange={(e) => setAttachId(e.target.value)}
                      aria-label="Attach a snapshot"
                      className={`${field} max-w-full`}
                    >
                      <option value="">Nothing</option>
                      {attachOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {myProfile
                      ? `Posting as @${myProfile.handle}`
                      : "Posting to friends only"}
                  </p>
                  <Button type="submit" size="sm" loading={posting}>
                    Post
                  </Button>
                </div>
              </form>
            )}
          </Card>

          {/* Posts */}
          {loading ? (
            <CardSkeleton rows={3} />
          ) : feed.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card">
              <div className="p-8 text-center">
                <p className="text-sm font-medium text-foreground">
                  Your feed is quiet
                </p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                  {userId
                    ? "Add friends from the panel, or share the first post — meals, recipes, and workouts from friends land here."
                    : ""}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {feed.map((post) => {
                const isMine = post.author_id === userId
                const isOpen = openComments === post.id
                const commentList = comments[post.id]
                return (
                  <article
                    key={post.id}
                    className="rounded-2xl border border-border bg-card p-4 lg:p-5"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar profile={post.author} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="truncate text-sm font-semibold text-foreground">
                            {post.author.display_name || "Member"}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            @{post.author.handle}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            · {timeAgo(post.created_at)}
                          </span>
                        </div>

                        <div className="mt-1.5 flex items-center gap-2">
                          <Badge tone={KIND_TONES[post.kind]}>
                            {KIND_LABELS[post.kind]}
                          </Badge>
                          {isMine && (
                            <button
                              type="button"
                              aria-label="Delete post"
                              onClick={() => setDeleteTarget(post)}
                              className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-error"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        {post.description && (
                          <p className="mt-2 text-[15px] font-semibold leading-snug text-foreground">
                            {post.description}
                          </p>
                        )}

                        {post.content && (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                            {post.content}
                          </p>
                        )}

                        <SnapshotCard post={post} />

                        {/* Actions */}
                        <div className="mt-3 flex items-center gap-4 border-t border-border pt-3">
                          <button
                            type="button"
                            aria-pressed={post.likedByMe}
                            aria-label={post.likedByMe ? "Unlike" : "Like"}
                            onClick={() => handleLike(post)}
                            className={`inline-flex items-center gap-1.5 text-xs transition-colors ${
                              post.likedByMe
                                ? "text-error"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <Heart
                              size={15}
                              fill={post.likedByMe ? "currentColor" : "none"}
                            />
                            <span className="tabular">{post.likes}</span>
                          </button>
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            onClick={() => toggleComments(post)}
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <MessageCircle size={15} />
                            <span className="tabular">{post.comments}</span>
                          </button>
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
                                No comments yet — say something nice.
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
                                          {c.author.display_name ||
                                            `@${c.author.handle}`}
                                        </span>{" "}
                                        <span className="text-muted-foreground">
                                          {timeAgo(c.created_at)}
                                        </span>
                                      </p>
                                      <p className="text-sm text-foreground">
                                        {c.content}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <form
                              onSubmit={handleSendComment}
                              className="mt-2.5 flex gap-2"
                            >
                              <input
                                value={commentDraft}
                                onChange={(e) =>
                                  setCommentDraft(e.target.value)
                                }
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
                  </article>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Friends sidebar ─────────────────────────────────── */}
        <div>
          <Card>
            <CardHead
              title="Friends"
              icon={<Users size={16} className="text-secondary" />}
              action={
                <Badge tone="neutral">{friendships.friends.length}</Badge>
              }
            />

            {!userId ? (
              <InlineNote tone="blue">
                Sign in to search for people, send requests, and post to your
                friends&apos; feed.
              </InlineNote>
            ) : (
              <>
                {myProfile && (
                  <div className="mb-3 rounded-xl bg-muted/60 px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar profile={myProfile} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {myProfile.display_name || "Add your name"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          @{myProfile.handle}
                        </p>
                      </div>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Edit community profile"
                        onClick={openEditProfile}
                      >
                        <Pencil size={14} />
                      </Button>
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={copyHandle}
                        aria-label="Copy your handle"
                      >
                        <Copy size={13} />
                        Copy handle
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={copyInviteLink}
                        aria-label="Copy your invite link"
                      >
                        <Link2 size={13} />
                        Invite link
                      </Button>
                    </div>
                  </div>
                )}

                {/* Add a friend by handle */}
                <form onSubmit={handleAddByHandle} className="mb-3">
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Add a friend
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={addInput}
                      onChange={(e) => setAddInput(e.target.value)}
                      placeholder="@handle"
                      aria-label="Add friend by handle"
                      className={`${field} min-w-0 flex-1 rounded-xl`}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      variant="secondary"
                      loading={directLoading}
                    >
                      <UserPlus size={14} />
                      Add
                    </Button>
                  </div>
                </form>

                {directResult && (
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-border px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {directResult.display_name || "Member"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{directResult.handle}
                      </p>
                    </div>
                    {relationWith(directResult.id) === "none" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleAdd(directResult)}
                      >
                        Add
                      </Button>
                    )}
                    {relationWith(directResult.id) === "friend" && (
                      <Badge tone="sage">Friends</Badge>
                    )}
                    {relationWith(directResult.id) === "incoming" && (
                      <Badge tone="blue">Requested you</Badge>
                    )}
                    {relationWith(directResult.id) === "outgoing" && (
                      <span className="text-xs text-muted-foreground">
                        Requested
                      </span>
                    )}
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name or handle"
                    aria-label="Search people"
                    className={`${field} w-full rounded-xl pl-8`}
                  />
                </div>

                {results.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {results.map((p) => {
                      const rel = relationWith(p.id)
                      return (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 rounded-xl border border-border px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {p.display_name || "Member"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              @{p.handle}
                            </p>
                          </div>
                          {rel === "none" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleAdd(p)}
                            >
                              Add
                            </Button>
                          )}
                          {rel === "friend" && (
                            <Badge tone="sage">Friends</Badge>
                          )}
                          {rel === "incoming" && (
                            <Badge tone="blue">Requested you</Badge>
                          )}
                          {rel === "outgoing" && (
                            <span className="text-xs text-muted-foreground">
                              Requested
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                {query.trim().length >= 2 &&
                  !searching &&
                  results.length === 0 && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      No people found.
                    </p>
                  )}

                {/* Incoming requests */}
                {friendships.incoming.length > 0 && (
                  <div className="mt-4 border-t border-border pt-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Requests ({friendships.incoming.length})
                    </p>
                    <div className="space-y-2">
                      {friendships.incoming.map((row) => (
                        <div
                          key={row.id}
                          className="flex items-center gap-2 rounded-xl border border-border px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {row.peer.display_name || "Member"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              @{row.peer.handle}
                            </p>
                          </div>
                          <Button
                            size="icon-sm"
                            variant="secondary"
                            aria-label="Accept request"
                            onClick={() => handleAccept(row)}
                          >
                            <Check size={14} />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Decline request"
                            onClick={() =>
                              handleDeleteFriendship(row, "Request declined")
                            }
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Outgoing requests */}
                {friendships.outgoing.length > 0 && (
                  <div className="mt-4 border-t border-border pt-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Sent ({friendships.outgoing.length})
                    </p>
                    <div className="space-y-2">
                      {friendships.outgoing.map((row) => (
                        <div
                          key={row.id}
                          className="flex items-center gap-2 rounded-xl border border-border px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {row.peer.display_name || "Member"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              @{row.peer.handle}
                            </p>
                          </div>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Cancel request"
                            onClick={() =>
                              handleDeleteFriendship(row, "Request cancelled")
                            }
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Friends list */}
                <div className="mt-4 border-t border-border pt-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {friendships.friends.length > 0
                      ? `Your friends (${friendships.friends.length})`
                      : "Your friends"}
                  </p>
                  {friendships.friends.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Search above to add friends — their posts show up in your
                      feed.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {friendships.friends.map((row) => (
                        <div
                          key={row.id}
                          className="flex items-center gap-2 rounded-xl border border-border px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {row.peer.display_name || "Member"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              @{row.peer.handle}
                            </p>
                          </div>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Remove ${row.peer.handle}`}
                            className="hover:text-error"
                            onClick={() =>
                              handleDeleteFriendship(row, "Friend removed")
                            }
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Edit community profile */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Community profile"
        description="How you appear to friends in the feed."
      >
        <form onSubmit={handleSaveProfile} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Display name
            </span>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Your name"
              maxLength={60}
              className={`${field} w-full`}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Handle
            </span>
            <input
              value={editHandle}
              onChange={(e) => setEditHandle(e.target.value)}
              placeholder="yourhandle"
              maxLength={30}
              className={`${field} w-full`}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Bio
            </span>
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              rows={3}
              maxLength={200}
              placeholder="A line about you"
              className={`${field} w-full resize-none`}
            />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={savingProfile}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeletePost}
        title="Delete this post?"
        message="It disappears from every friend's feed. Likes and comments go with it."
        confirmLabel="Delete post"
      />
    </PageContainer>
  )
}
