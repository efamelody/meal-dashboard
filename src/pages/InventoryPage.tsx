import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Camera,
  Check,
  Link2,
  Loader2,
  Package,
  Pencil,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import {
  addInventoryItem,
  applyScannedItems,
  createHousehold,
  deleteInventoryItem,
  getFriendships,
  getIngredientSuggestions,
  getInventory,
  getMyHousehold,
  inviteToHousehold,
  joinHousehold,
  updateInventoryItem,
} from "../lib/db"
import { scanInventoryPhoto } from "../lib/gemini"
import type {
  FriendRow,
  Household,
  InventoryItem,
  ScannedInventoryItem,
  StockStatus,
} from "../lib/types"
import { STAPLE_ITEMS } from "../lib/staples"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../components/Toast"
import ItemAutocomplete from "../components/ItemAutocomplete"
import { Avatar } from "../components/Avatar"
import { Badge, Button, EmptyState, InlineNote, Modal, ProgressBar } from "../components/ui"
import { demoInventory, demoSuggestions } from "../lib/demo"

const STATUS_ORDER: StockStatus[] = ["in_stock", "low", "out"]
const STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: "In stock",
  low: "Running low",
  out: "Out of stock",
}
const STATUS_BADGE: Record<StockStatus, string> = {
  in_stock: "bg-sage text-secondary-foreground",
  low: "bg-[#f6ecdb] text-warning",
  out: "bg-[#f6e3e1] text-error",
}

const field =
  "rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"

/** One detected pantry item shown in the scan-review modal. */
interface ReviewItem {
  name: string
  quantity: string
  unit: string
  checked: boolean
  isNew: boolean
}

export default function InventoryPage() {
  const { session, openAuth } = useAuth()
  const userId = session?.user?.id ?? null
  const { toast } = useToast()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [items, setItems] = useState<InventoryItem[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [itemName, setItemName] = useState("")
  const [editId, setEditId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState("")
  const [editUnit, setEditUnit] = useState("")

  // Household / sharing
  const [household, setHousehold] = useState<Household | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteBusy, setInviteBusy] = useState<string | null>(null)
  const [friends, setFriends] = useState<FriendRow[]>([])
  const [creating, setCreating] = useState(false)
  const [householdName, setHouseholdName] = useState("")

  // Scan flow
  const [scanOpen, setScanOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [review, setReview] = useState<ReviewItem[]>([])
  const [savingScan, setSavingScan] = useState(false)

  useEffect(() => {
    if (!userId) {
      setItems(demoInventory)
      setSuggestions(demoSuggestions)
      return
    }
    Promise.all([getInventory(), getIngredientSuggestions()])
      .then(([inventory, sugg]) => {
        setItems(inventory)
        setSuggestions(sugg)
      })
      .catch((err) => {
        console.error("inventory load:", err)
        toast("Could not load your inventory", "error")
      })
  }, [userId, household?.id, toast])

  // Load the household and handle a share link (?join=<id>).
  useEffect(() => {
    if (!userId) {
      setHousehold(null)
      return
    }
    getMyHousehold().then(setHousehold).catch(() => setHousehold(null))
    const join = new URLSearchParams(window.location.search).get("join")
    if (join) {
      joinHousehold(join)
        .then(async () => {
          setHousehold(await getMyHousehold())
          toast("Joined the household")
        })
        .catch(() => toast("Could not join that household", "error"))
        .finally(() => navigate("/kitchen/inventory", { replace: true }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const inStock = items.filter((i) => i.stock_status === "in_stock").length
  const lowCount = items.filter((i) => i.stock_status === "low").length
  const outCount = items.filter((i) => i.stock_status === "out").length

  function qtyLabel(item: InventoryItem): string | null {
    if (item.quantity == null || item.quantity <= 0) return null
    const q =
      item.quantity % 1 === 0
        ? item.quantity
        : Math.round(item.quantity * 100) / 100
    return item.unit ? `${q} ${item.unit}` : String(q)
  }

  async function addOrUpdate(name: string, status: StockStatus) {
    if (!userId) {
      openAuth()
      return
    }
    const existing = items.find(
      (i) => i.item_name.toLowerCase() === name.toLowerCase(),
    )
    if (existing) {
      if (existing.stock_status === status) return
      await updateInventoryItem(existing.id, { stock_status: status })
      setItems(
        items.map((i) =>
          i.id === existing.id ? { ...i, stock_status: status } : i,
        ),
      )
      return
    }
    const item = await addInventoryItem({
      item_name: name,
      stock_status: status,
    })
    setItems([...items, item])
    toast(`${name} added to inventory`)
  }

  async function handleCommit(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    await addOrUpdate(trimmed, "in_stock")
    setItemName("")
  }

  async function addStaple(staple: string) {
    const existing = items.find(
      (i) => i.item_name.toLowerCase() === staple.toLowerCase(),
    )
    if (existing && existing.stock_status === "in_stock") return
    await addOrUpdate(staple, "in_stock")
  }

  async function cycleStatus(item: InventoryItem) {
    if (!userId) {
      openAuth()
      return
    }
    const next =
      STATUS_ORDER[
        (STATUS_ORDER.indexOf(item.stock_status) + 1) % STATUS_ORDER.length
      ]
    await updateInventoryItem(item.id, { stock_status: next })
    setItems(
      items.map((i) => (i.id === item.id ? { ...i, stock_status: next } : i)),
    )
  }

  async function handleDelete(item: InventoryItem) {
    if (!userId) {
      openAuth()
      return
    }
    try {
      await deleteInventoryItem(item.id)
      setItems(items.filter((i) => i.id !== item.id))
      toast(`${item.item_name} removed`)
    } catch (err) {
      console.error("deleteInventoryItem:", err)
      toast("Could not remove the item", "error")
    }
  }

  // ── Household ────────────────────────────────────────────────────────
  async function openInvite() {
    if (!userId) {
      openAuth()
      return
    }
    setInviteOpen(true)
    try {
      const fs = await getFriendships()
      setFriends(fs.friends)
    } catch (err) {
      console.error("getFriendships:", err)
      toast("Could not load your friends", "error")
    }
  }

  async function handleInvite(friend: FriendRow) {
    if (!household) return
    setInviteBusy(friend.peer.id)
    try {
      await inviteToHousehold(friend.peer.id)
      setHousehold(await getMyHousehold())
      toast(
        `${friend.peer.display_name || `@${friend.peer.handle}`} added to ${
          household.name
        }`,
      )
    } catch (err) {
      console.error("inviteToHousehold:", err)
      toast("Could not add that person", "error")
    } finally {
      setInviteBusy(null)
    }
  }

  async function handleCreate() {
    if (!userId) {
      openAuth()
      return
    }
    setCreating(true)
    try {
      const h = await createHousehold(householdName)
      setHousehold(h)
      setHouseholdName("")
      toast(`${h.name} created`)
    } catch (err) {
      console.error("createHousehold:", err)
      toast("Could not create the household", "error")
    } finally {
      setCreating(false)
    }
  }

  function copyInviteLink() {
    if (!household) return
    const url = `${window.location.origin}/kitchen/inventory?join=${household.id}`
    navigator.clipboard
      .writeText(url)
      .then(() => toast("Invite link copied"))
      .catch(() => toast("Could not copy the link", "error"))
  }

  // ── Scan pantry ──────────────────────────────────────────────────────
  function isNewName(name: string): boolean {
    return !items.some(
      (i) => i.item_name.trim().toLowerCase() === name.trim().toLowerCase(),
    )
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!userId) {
      openAuth()
      return
    }
    setScanning(true)
    setScanOpen(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error("read failed"))
        reader.readAsDataURL(file)
      })
      const found = await scanInventoryPhoto(dataUrl)
      setReview(
        found.map((it) => ({
          name: it.name,
          quantity: it.quantity != null ? String(it.quantity) : "",
          unit: it.unit ?? "",
          checked: true,
          isNew: isNewName(it.name),
        })),
      )
    } catch (err) {
      console.error("scanInventoryPhoto:", err)
      toast("Could not read the photo", "error")
      setScanOpen(false)
    } finally {
      setScanning(false)
    }
  }

  function toggleReview(i: number) {
    setReview(
      review.map((r, idx) => (idx === i ? { ...r, checked: !r.checked } : r)),
    )
  }

  function updateReview(
    i: number,
    patch: Partial<Pick<ReviewItem, "quantity" | "unit">>,
  ) {
    setReview(review.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  async function commitScan() {
    if (!userId) {
      openAuth()
      return
    }
    const selected: ScannedInventoryItem[] = review
      .filter((r) => r.checked && r.name.trim())
      .map((r) => {
        const q = Number(r.quantity)
        return {
          name: r.name.trim(),
          quantity:
            r.quantity.trim() !== "" && Number.isFinite(q) && q > 0 ? q : null,
          unit: r.unit.trim() || null,
        }
      })
    if (!selected.length) {
      setScanOpen(false)
      return
    }
    setSavingScan(true)
    try {
      const updated = await applyScannedItems(selected)
      setItems(updated)
      setScanOpen(false)
      toast(
        `Added ${selected.length} item${
          selected.length > 1 ? "s" : ""
        } to inventory`,
      )
    } catch (err) {
      console.error("applyScannedItems:", err)
      toast("Could not save the scanned items", "error")
    } finally {
      setSavingScan(false)
    }
  }

  function beginEdit(item: InventoryItem) {
    if (editId === item.id) {
      cancelEdit()
      return
    }
    setEditId(item.id)
    setItemName(item.item_name)
    setEditQty(item.quantity != null ? String(item.quantity) : "")
    setEditUnit(item.unit ?? "")
  }

  function cancelEdit() {
    setEditId(null)
    setItemName("")
    setEditQty("")
    setEditUnit("")
  }

  async function saveEdit(item: InventoryItem) {
    if (!userId) {
      openAuth()
      return
    }
    const name = itemName.trim()
    if (!name) {
      cancelEdit()
      return
    }
    const qtyNum = editQty.trim() ? Number(editQty) : null
    const patch = {
      item_name: name,
      quantity: qtyNum != null && !Number.isNaN(qtyNum) ? qtyNum : null,
      unit: editUnit.trim() || null,
    }
    try {
      await updateInventoryItem(item.id, patch)
      setItems(items.map((i) => (i.id === item.id ? { ...i, ...patch } : i)))
      toast(`${name} updated`)
      cancelEdit()
    } catch (err) {
      console.error("updateInventoryItem:", err)
      toast("Could not save the item", "error")
    }
  }

  return (
    <div>
      {/* Household / sharing */}
      {userId && (
        <div className="mb-5 rounded-2xl border border-border bg-card p-4 sm:p-5">
          {!household ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
                  <Users size={16} className="text-primary" />
                  Create your household
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Share one pantry with your family — everyone snaps and edits
                  the same list.
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="Household name"
                  aria-label="Household name"
                  className={`${field} w-44`}
                />
                <Button size="sm" onClick={handleCreate} loading={creating}>
                  Create
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage text-secondary-foreground">
                    <Users size={18} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-semibold text-foreground">
                      {household.name}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Shared pantry · {household.members.length}{" "}
                      {household.members.length === 1 ? "member" : "members"}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={openInvite}>
                  <UserPlus size={14} />
                  Invite
                </Button>
              </div>

              <div className="mt-3 flex items-center gap-2.5">
                <div className="flex -space-x-2">
                  {household.members.slice(0, 5).map((m) => (
                    <span
                      key={m.id}
                      title={m.profile.display_name || `@${m.profile.handle}`}
                      className="rounded-full ring-2 ring-card"
                    >
                      <Avatar profile={m.profile} size="sm" />
                    </span>
                  ))}
                </div>
                {household.members.length > 5 && (
                  <span className="tabular text-xs text-muted-foreground">
                    +{household.members.length - 5}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  Everyone sees &amp; edits the same pantry.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="tabular font-medium text-foreground">{inStock}</span>{" "}
          of {items.length} items in stock
          {lowCount > 0 && (
            <>
              {" "}
              · <span className="tabular text-warning">{lowCount}</span> running
              low
            </>
          )}
          {outCount > 0 && (
            <>
              {" "}
              · <span className="tabular text-error">{outCount}</span> out
            </>
          )}
        </p>
        {items.length > 0 && (
          <ProgressBar
            value={inStock}
            max={items.length}
            tone="success"
            className="w-40"
          />
        )}
      </div>

      {/* Staples quick-add */}
      <div className="mb-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
          Staples — tap to add
        </p>
        <div className="flex flex-wrap gap-2">
          {STAPLE_ITEMS.map((staple) => {
            const existing = items.find(
              (i) => i.item_name.toLowerCase() === staple.toLowerCase(),
            )
            const isInStock = existing?.stock_status === "in_stock"
            return (
              <button
                key={staple}
                type="button"
                onClick={() => addStaple(staple)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isInStock
                    ? "bg-sage text-secondary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-[#dfe8d7]"
                }`}
              >
                {staple}
              </button>
            )
          })}
        </div>
      </div>

      {/* Add item */}
      <div className="mb-5 flex gap-2">
        <div className="min-w-0 flex-1">
          <ItemAutocomplete
            value={itemName}
            onChange={setItemName}
            suggestions={suggestions}
            placeholder="Type an item and press Enter to add"
            onCommit={handleCommit}
          />
        </div>
        {userId && (
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Camera size={16} />
            <span className="hidden sm:inline">Scan pantry</span>
          </Button>
        )}
      </div>

      {/* Inventory list */}
      {items.length === 0 ? (
        <EmptyState
          icon={<Package size={22} />}
          title="Your inventory is empty"
          description="Log what you already have — the grocery list pre-checks items you're stocked on."
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {items.map((item, i) => (
            <div key={item.id}>
              {i > 0 && <div className="h-px bg-border mx-5" />}
              {editId === item.id ? (
                <div className="flex flex-wrap gap-2 items-center px-4 sm:px-5 py-3">
                  <input
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="Item name"
                    aria-label="Item name"
                    className={`${field} flex-1 min-w-[140px]`}
                  />
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    placeholder="qty"
                    aria-label="Quantity"
                    className={`${field} tabular w-20`}
                  />
                  <input
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    placeholder="unit"
                    aria-label="Unit"
                    className={`${field} w-20`}
                  />
                  <div className="flex gap-1.5 items-center ml-auto">
                    <button
                      type="button"
                      onClick={() => cycleStatus(item)}
                      className={`px-2.5 py-1.5 rounded-full text-xs font-medium ${STATUS_BADGE[item.stock_status]}`}
                    >
                      {STATUS_LABELS[item.stock_status]}
                    </button>
                    <Button
                      size="icon-sm"
                      aria-label="Save changes"
                      onClick={() => saveEdit(item)}
                    >
                      <Check size={14} />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      aria-label="Cancel edit"
                      onClick={cancelEdit}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className={`flex items-center justify-between gap-3 px-4 sm:px-5 py-3 transition-colors ${
                    item.stock_status === "out" ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-baseline gap-2.5">
                    <span className="truncate text-sm font-medium text-foreground">
                      {item.item_name}
                    </span>
                    {qtyLabel(item) && (
                      <span className="tabular shrink-0 text-xs text-muted-foreground">
                        {qtyLabel(item)}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => cycleStatus(item)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[item.stock_status]} hover:opacity-80 transition-opacity`}
                      title="Tap to change status"
                    >
                      {STATUS_LABELS[item.stock_status]}
                    </button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Edit ${item.item_name}`}
                      onClick={() => beginEdit(item)}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Delete ${item.item_name}`}
                      className="hover:text-error"
                      onClick={() => handleDelete(item)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Invite modal */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite to household"
        description="Share this pantry with friends or family."
      >
        {household &&
          (friends.length === 0 ? (
            <InlineNote tone="blue">
              You have no friends yet. Add friends in the Community tab first,
              then invite them here.
            </InlineNote>
          ) : (
            <div className="space-y-2">
              {friends.map((f) => {
                const isMember = household.members.some(
                  (m) => m.id === f.peer.id,
                )
                return (
                  <div
                    key={f.id}
                    className="flex items-center gap-2 rounded-xl border border-border px-3 py-2"
                  >
                    <Avatar profile={f.peer} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {f.peer.display_name || "Member"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{f.peer.handle}
                      </p>
                    </div>
                    {isMember ? (
                      <Badge tone="sage">Member</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={inviteBusy === f.peer.id}
                        onClick={() => handleInvite(f)}
                      >
                        <UserPlus size={14} />
                        Add
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        {household && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <Button size="sm" variant="outline" onClick={copyInviteLink}>
              <Link2 size={14} />
              Copy invite link
            </Button>
            <p className="text-xs text-muted-foreground">
              Friends join instantly.
            </p>
          </div>
        )}
      </Modal>

      {/* Scan review modal */}
      <Modal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        title="Add items to pantry"
        description={
          scanning
            ? "Reading the photo…"
            : `Review what was detected in "${
                household?.name ?? "your pantry"
              }".`
        }
      >
        {scanning ? (
          <div className="flex items-center gap-2.5 py-6 text-sm text-muted-foreground">
            <Loader2 size={15} className="animate-spin" />
            Scanning…
          </div>
        ) : review.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            No items were detected. Try a clearer photo.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {review.map((r, i) => (
                <div
                  key={`${r.name}-${i}`}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                    r.checked ? "border-border" : "border-border opacity-50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleReview(i)}
                    aria-pressed={r.checked}
                    aria-label={`Include ${r.name}`}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      r.checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                    }`}
                  >
                    {r.checked && <Check size={13} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {r.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.isNew ? "New item" : "Merges with existing"}
                    </p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={r.quantity}
                    onChange={(e) => updateReview(i, { quantity: e.target.value })}
                    placeholder="qty"
                    aria-label={`Quantity for ${r.name}`}
                    className={`${field} tabular w-20`}
                  />
                  <input
                    value={r.unit}
                    onChange={(e) => updateReview(i, { unit: e.target.value })}
                    placeholder="unit"
                    aria-label={`Unit for ${r.name}`}
                    className={`${field} w-20`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScanOpen(false)}
              >
                Cancel
              </Button>
              <Button size="sm" loading={savingScan} onClick={commitScan}>
                Add {review.filter((r) => r.checked).length} item
                {review.filter((r) => r.checked).length === 1 ? "" : "s"}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
