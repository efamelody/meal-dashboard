import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  ShoppingCart,
  Trash2,
  RefreshCw,
  CheckCheck,
  ArrowLeft,
} from "lucide-react"
import {
  getGroceryList,
  toggleGroceryItem,
  clearGroceryList,
  generateGroceryList,
} from "../lib/db"
import type { GroceryItem } from "../lib/types"

export default function GroceryPage() {
  const [items, setItems] = useState<GroceryItem[]>([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    getGroceryList().then(setItems)
  }, [])

  const bought = items.filter((i) => i.is_bought).length
  const remaining = items.filter((i) => !i.is_bought)
  const boughtItems = items.filter((i) => i.is_bought)

  async function handleToggle(id: string, current: boolean) {
    await toggleGroceryItem(id, !current)
    setItems(
      items.map((i) => (i.id === id ? { ...i, is_bought: !current } : i)),
    )
  }

  async function handleClear() {
    await clearGroceryList()
    setItems([])
  }

  async function handleRegenerate() {
    setLoading(true)
    const list = await generateGroceryList()
    setItems(list)
    setLoading(false)
  }

  async function handleMarkAllBought() {
    const updated = items.map((i) => ({ ...i, is_bought: true }))
    for (const item of updated) await toggleGroceryItem(item.id, true)
    setItems(updated)
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 p-8 min-h-screen">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <h2 className="text-3xl text-[var(--foreground)]">Grocery List</h2>
          </div>
          <div className="text-center py-24 text-[var(--muted-foreground)]">
            <ShoppingCart size={48} className="mx-auto mb-4 opacity-25" />
            <p className="text-base font-medium mb-2">No grocery list yet</p>
            <p className="text-sm mb-6">
              Generate one from your weekly meal plan.
            </p>
            <button
              onClick={() => navigate("/planner")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <ArrowLeft size={15} />
              Go to Planner
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-8 min-h-screen">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="text-3xl text-[var(--foreground)]">Grocery List</h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              {bought}/{items.length} items checked off
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRegenerate}
              disabled={loading}
              title="Regenerate from planner"
              className="p-2.5 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleMarkAllBought}
              title="Mark all bought"
              className="p-2.5 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--accent)] hover:bg-[var(--secondary)] transition-colors"
            >
              <CheckCheck size={15} />
            </button>
            <button
              onClick={handleClear}
              title="Clear list"
              className="p-2.5 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
              style={{
                width: `${items.length ? (bought / items.length) * 100 : 0}%`,
              }}
            />
          </div>
          {bought === items.length && items.length > 0 && (
            <p className="text-xs text-[var(--accent)] font-medium mt-2 text-center">
              All done — happy cooking!
            </p>
          )}
        </div>

        {/* Smart deduction note */}
        {boughtItems.some((i) => i.is_bought) && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-[var(--secondary)] text-[var(--primary)] text-xs">
            <strong>Smart Deduction:</strong> Pre-checked items are already
            marked in stock in your inventory.
          </div>
        )}

        {/* Items to buy */}
        {remaining.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest mb-2">
              To Buy ({remaining.length})
            </p>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
              {remaining.map((item, i) => (
                <div key={item.id}>
                  {i > 0 && <div className="h-px bg-[var(--border)] mx-5" />}
                  <label className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-[var(--muted)] transition-colors">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => handleToggle(item.id, false)}
                      className="w-4.5 h-4.5 rounded border-2 border-[var(--border)] accent-[var(--accent)]"
                      style={{
                        width: "18px",
                        height: "18px",
                        accentColor: "var(--accent)",
                      }}
                    />
                    <span className="flex-1 text-sm text-[var(--foreground)]">
                      {item.item_name}
                    </span>
                    {item.quantity > 0 && (
                      <span className="text-xs text-[var(--muted-foreground)] font-medium">
                        {item.quantity % 1 === 0
                          ? item.quantity
                          : item.quantity.toFixed(1)}{" "}
                        {item.unit}
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
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest mb-2">
              In Cart / In Stock ({boughtItems.length})
            </p>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden opacity-60">
              {boughtItems.map((item, i) => (
                <div key={item.id}>
                  {i > 0 && <div className="h-px bg-[var(--border)] mx-5" />}
                  <label className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-[var(--muted)] transition-colors">
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => handleToggle(item.id, true)}
                      style={{
                        width: "18px",
                        height: "18px",
                        accentColor: "var(--accent)",
                      }}
                    />
                    <span className="flex-1 text-sm text-[var(--muted-foreground)] line-through">
                      {item.item_name}
                    </span>
                    {item.quantity > 0 && (
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {item.quantity % 1 === 0
                          ? item.quantity
                          : item.quantity.toFixed(1)}{" "}
                        {item.unit}
                      </span>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
