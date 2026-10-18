import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { CheckCheck, Plus, RefreshCw, ShoppingCart, Trash2 } from "lucide-react"
import {
  addGroceryItem,
  clearGroceryList,
  generateGroceryList,
  getGroceryList,
  toggleGroceryItem,
} from "../lib/db"
import { isISODate, startOfWeek } from "../lib/dates"
import type { GroceryItem, ISODate } from "../lib/types"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../components/Toast"
import WeekNavigator from "../components/WeekNavigator"
import {
  Button,
  ConfirmDialog,
  EmptyState,
  InlineNote,
  ProgressBar,
} from "../components/ui"
import { demoGrocery } from "../lib/demo"

function qtyLabel(item: GroceryItem): string | null {
  if (item.quantity <= 0) return null
  const q =
    item.quantity % 1 === 0
      ? item.quantity
      : Math.round(item.quantity * 100) / 100
  return item.unit ? `${q} ${item.unit}` : String(q)
}

export default function GroceryPage() {
  const { session, openAuth } = useAuth()
  const userId = session?.user?.id ?? null
  const { toast } = useToast()
  const navigate = useNavigate()

  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<GroceryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  const [newName, setNewName] = useState("")
  const [newQty, setNewQty] = useState("")
  const [newUnit, setNewUnit] = useState("")

  const weekParam = searchParams.get("week")
  const weekStart: ISODate = isISODate(weekParam) ? weekParam : startOfWeek()

  useEffect(() => {
    let cancelled = false
    if (!userId) {
      setItems(demoGrocery)
      return
    }
    getGroceryList(weekStart)
      .then((list) => {
        if (!cancelled) setItems(list)
      })
      .catch((err) => {
        console.error("getGroceryList:", err)
        toast("Could not load the grocery list", "error")
      })
    return () => {
      cancelled = true
    }
  }, [weekStart, userId, toast])

  function changeWeek(next: ISODate) {
    const sp = new URLSearchParams(searchParams)
    sp.set("week", next)
    setSearchParams(sp)
  }

  const bought = items.filter((i) => i.is_bought).length
  const remaining = items.filter((i) => !i.is_bought)
  const boughtItems = items.filter((i) => i.is_bought)

  async function handleToggle(item: GroceryItem) {
    if (!userId) {
      openAuth()
      return
    }
    try {
      await toggleGroceryItem(item.id, !item.is_bought)
      setItems(
        items.map((i) =>
          i.id === item.id ? { ...i, is_bought: !i.is_bought } : i,
        ),
      )
    } catch (err) {
      console.error("toggleGroceryItem:", err)
      toast("Could not update the item", "error")
    }
  }

  async function handleAddManual(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) {
      openAuth()
      return
    }
    const name = newName.trim()
    if (!name) return
    try {
      const item = await addGroceryItem(weekStart, {
        item_name: name,
        quantity: newQty.trim() ? Math.max(0, Number(newQty) || 0) : 1,
        unit: newUnit.trim(),
      })
      setItems([...items, item])
      setNewName("")
      setNewQty("")
      setNewUnit("")
      toast(`${name} added to the list`)
    } catch (err) {
      console.error("addGroceryItem:", err)
      toast("Could not add the item", "error")
    }
  }

  async function handleClear() {
    if (!userId) {
      openAuth()
      return
    }
    setClearing(true)
    try {
      await clearGroceryList(weekStart)
      setItems([])
      setClearOpen(false)
      toast("Grocery list cleared", "info")
    } catch (err) {
      console.error("clearGroceryList:", err)
      toast("Could not clear the list", "error")
    } finally {
      setClearing(false)
    }
  }

  async function handleRegenerate() {
    if (!userId) {
      openAuth()
      return
    }
    setLoading(true)
    try {
      const list = await generateGroceryList(weekStart)
      setItems(list)
      toast("Synced with your plan — bought and manual items kept")
    } catch (err) {
      console.error("generateGroceryList:", err)
      toast("Could not regenerate the list", "error")
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkAllBought() {
    if (!userId) {
      openAuth()
      return
    }
    const toBuy = items.filter((i) => !i.is_bought)
    if (!toBuy.length) return
    try {
      await Promise.all(toBuy.map((i) => toggleGroceryItem(i.id, true)))
      setItems(items.map((i) => ({ ...i, is_bought: true })))
      toast(`${toBuy.length} item${toBuy.length === 1 ? "" : "s"} checked off`)
    } catch (err) {
      console.error("markAllBought:", err)
      toast("Could not update the list", "error")
    }
  }

  const field =
    "rounded-lg border border-border bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <WeekNavigator
          weekStart={weekStart}
          onChange={changeWeek}
          onToday={() => changeWeek(startOfWeek())}
          compact
        />
        <div className="flex items-center gap-1.5">
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Regenerate from plan"
            title="Sync from meal plan"
            onClick={handleRegenerate}
            loading={loading}
          >
            {!loading && <RefreshCw size={15} />}
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Mark all bought"
            title="Mark all bought"
            onClick={handleMarkAllBought}
            disabled={remaining.length === 0}
          >
            <CheckCheck size={15} />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Clear list"
            title="Clear list"
            className="hover:text-error"
            onClick={() => (userId ? setClearOpen(true) : openAuth())}
            disabled={items.length === 0}
          >
            <Trash2 size={15} />
          </Button>
        </div>
      </div>

      {/* Progress */}
      {items.length > 0 && (
        <div className="mb-4">
          <ProgressBar value={bought} max={items.length} tone="success" />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="tabular text-[13px] text-muted-foreground">
              {bought} of {items.length} checked off
            </p>
            {bought === items.length && (
              <p className="text-[13px] font-medium text-success">
                All done — happy cooking!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Manual add */}
      <form
        onSubmit={handleAddManual}
        className="mb-4 flex flex-wrap items-center gap-2"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Add an item (e.g. Sambal)"
          aria-label="New item name"
          className={`${field} flex-1 min-w-[160px]`}
        />
        <input
          type="number"
          min={0}
          step="any"
          value={newQty}
          onChange={(e) => setNewQty(e.target.value)}
          placeholder="1"
          aria-label="Quantity"
          className={`${field} tabular w-16`}
        />
        <input
          value={newUnit}
          onChange={(e) => setNewUnit(e.target.value)}
          placeholder="unit"
          aria-label="Unit"
          className={`${field} w-20`}
        />
        <Button type="submit" size="md" disabled={!newName.trim()}>
          <Plus size={15} />
          Add
        </Button>
      </form>

      <InlineNote tone="blue">
        Items you tick off stay ticked when the list re-syncs from your plan,
        and anything you add by hand is never removed. Pre-checked items are
        ones already in stock in your inventory.
      </InlineNote>

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card">
          <EmptyState
            icon={<ShoppingCart size={22} />}
            title="No grocery list yet"
            description="Generate one from your weekly meal plan — ingredient amounts scale with servings."
            action={
              <Button
                size="sm"
                onClick={() => navigate(`/plan?week=${weekStart}`)}
              >
                Go to weekly plan
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {/* Items to buy */}
          {remaining.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                To buy ({remaining.length})
              </p>
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                {remaining.map((item, i) => (
                  <div key={item.id}>
                    {i > 0 && <div className="h-px bg-border mx-5" />}
                    <label className="flex items-center gap-4 px-4 sm:px-5 py-3.5 cursor-pointer hover:bg-muted transition-colors">
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => handleToggle(item)}
                        style={{
                          width: "18px",
                          height: "18px",
                          accentColor: "var(--color-success, #5e815b)",
                        }}
                      />
                      <span
                        className={`flex-1 text-sm text-foreground ${
                          item.source === "manual" ? "font-medium" : ""
                        }`}
                      >
                        {item.item_name}
                        {item.source === "manual" && (
                          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            added
                          </span>
                        )}
                      </span>
                      {qtyLabel(item) && (
                        <span className="tabular text-xs text-muted-foreground font-medium">
                          {qtyLabel(item)}
                        </span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bought items */}
          {boughtItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                In cart / in stock ({boughtItems.length})
              </p>
              <div className="rounded-2xl border border-border bg-card overflow-hidden opacity-70">
                {boughtItems.map((item, i) => (
                  <div key={item.id}>
                    {i > 0 && <div className="h-px bg-border mx-5" />}
                    <label className="flex items-center gap-4 px-4 sm:px-5 py-3.5 cursor-pointer hover:bg-muted transition-colors">
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => handleToggle(item)}
                        style={{
                          width: "18px",
                          height: "18px",
                          accentColor: "var(--color-success, #5e815b)",
                        }}
                      />
                      <span className="flex-1 text-sm text-foreground line-through">
                        {item.item_name}
                      </span>
                      {qtyLabel(item) && (
                        <span className="tabular text-xs text-muted-foreground">
                          {qtyLabel(item)}
                        </span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Plan-derived amounts re-sync from{" "}
            <Link
              to={`/plan?week=${weekStart}`}
              className="text-primary hover:underline"
            >
              your weekly plan
            </Link>
            ; add hand-written items above for anything the plan doesn&apos;t
            know about.
          </p>
        </div>
      )}

      <ConfirmDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={handleClear}
        title="Clear the whole list?"
        message="Both plan-derived and hand-added items for this week will be removed. You can regenerate the plan items from your weekly plan afterwards."
        confirmLabel="Clear list"
        busy={clearing}
      />
    </div>
  )
}
