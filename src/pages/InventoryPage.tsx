import { useState, useEffect } from "react"
import { Trash2, Pencil, Check, X, Package } from "lucide-react"
import {
  getInventory,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getIngredientSuggestions,
} from "../lib/db"
import type { InventoryItem, StockStatus } from "../lib/types"
import ItemAutocomplete from "../components/ItemAutocomplete"
import { STAPLE_ITEMS } from "../lib/staples"

const STATUS_ORDER: StockStatus[] = ["in_stock", "low", "out"]
const STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: "In Stock",
  low: "Running Low",
  out: "Out of Stock",
}
const STATUS_BADGE: Record<StockStatus, string> = {
  in_stock: "bg-green-100 text-green-700",
  low: "bg-amber-100 text-amber-700",
  out: "bg-red-100 text-red-600",
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [itemName, setItemName] = useState("")
  const [editId, setEditId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getInventory(), getIngredientSuggestions()]).then(
      ([inventory, sugg]) => {
        setItems(inventory)
        setSuggestions(sugg)
      },
    )
  }, [])

  const inStock = items.filter((i) => i.stock_status === "in_stock").length
  const lowCount = items.filter((i) => i.stock_status === "low").length

  async function addOrUpdate(name: string, status: StockStatus) {
    const existing = items.find(
      (i) => i.item_name.toLowerCase() === name.toLowerCase(),
    )
    if (existing) {
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
    const next =
      STATUS_ORDER[
        (STATUS_ORDER.indexOf(item.stock_status) + 1) % STATUS_ORDER.length
      ]
    await updateInventoryItem(item.id, { stock_status: next })
    setItems(
      items.map((i) => (i.id === item.id ? { ...i, stock_status: next } : i)),
    )
  }

  async function handleDelete(id: string) {
    await deleteInventoryItem(id)
    setItems(items.filter((i) => i.id !== id))
  }

  function handleEdit(item: InventoryItem) {
    if (editId === item.id) {
      setEditId(null)
      setItemName("")
      return
    }
    setEditId(item.id)
    setItemName(item.item_name)
  }

  async function saveEdit(id: string) {
    const name = itemName.trim()
    if (!name) {
      setEditId(null)
      return
    }
    await updateInventoryItem(id, { item_name: name })
    setItems(items.map((i) => (i.id === id ? { ...i, item_name: name } : i)))
    setEditId(null)
    setItemName("")
  }

  return (
    <div className="flex-1 p-8 min-h-screen">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl text-[var(--foreground)]">
            Kitchen Inventory
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {inStock} of {items.length} items in stock
            {lowCount > 0 ? ` · ${lowCount} running low` : ""}
          </p>
        </div>

        {/* Progress bar */}
        {items.length > 0 && (
          <div className="mb-6">
            <div className="h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] rounded-full transition-all"
                style={{ width: `${(inStock / items.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Staples quick-add */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] mb-2">
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
                      ? "bg-green-100 text-green-700"
                      : "bg-[var(--secondary)] text-[var(--primary)] hover:opacity-80"
                  }`}
                >
                  {staple}
                </button>
              )
            })}
          </div>
        </div>

        {/* Add item */}
        <div className="mb-6">
          <ItemAutocomplete
            value={itemName}
            onChange={setItemName}
            suggestions={suggestions}
            placeholder="Type an item and press Enter to add"
            onCommit={handleCommit}
          />
        </div>

        {/* Inventory list */}
        {items.length === 0 ? (
          <div className="text-center py-20 text-[var(--muted-foreground)]">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              Your inventory is empty. Add some items above.
            </p>
          </div>
        ) : (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
            {items.map((item, i) => (
              <div key={item.id}>
                {i > 0 && <div className="h-px bg-[var(--border)] mx-5" />}
                {editId === item.id ? (
                  <div className="flex gap-2 items-center px-5 py-3">
                    <div className="flex-1">
                      <ItemAutocomplete
                        value={itemName}
                        onChange={setItemName}
                        suggestions={suggestions}
                        placeholder="Item name"
                      />
                    </div>
                    <button
                      onClick={() => cycleStatus(item)}
                      className={`px-2.5 py-1.5 rounded-full text-xs font-medium ${STATUS_BADGE[item.stock_status]}`}
                    >
                      {STATUS_LABELS[item.stock_status]}
                    </button>
                    <button
                      onClick={() => saveEdit(item.id)}
                      className="p-1.5 rounded-lg bg-[var(--accent)] text-white"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)]"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    className={`flex items-center justify-between px-5 py-3.5 transition-colors ${
                      item.stock_status === "out" ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        {item.item_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => cycleStatus(item)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[item.stock_status]} hover:opacity-80 transition-opacity`}
                        title="Tap to change status"
                      >
                        {STATUS_LABELS[item.stock_status]}
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
