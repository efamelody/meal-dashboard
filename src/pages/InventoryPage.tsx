import { useEffect, useState } from "react"
import { Check, Package, Pencil, Trash2, X } from "lucide-react"
import {
  addInventoryItem,
  deleteInventoryItem,
  getIngredientSuggestions,
  getInventory,
  updateInventoryItem,
} from "../lib/db"
import type { InventoryItem, StockStatus } from "../lib/types"
import { STAPLE_ITEMS } from "../lib/staples"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../components/Toast"
import ItemAutocomplete from "../components/ItemAutocomplete"
import { Button, EmptyState, ProgressBar } from "../components/ui"
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

export default function InventoryPage() {
  const { session, openAuth } = useAuth()
  const userId = session?.user?.id ?? null
  const { toast } = useToast()

  const [items, setItems] = useState<InventoryItem[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [itemName, setItemName] = useState("")
  const [editId, setEditId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState("")
  const [editUnit, setEditUnit] = useState("")

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
  }, [userId, toast])

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
      <div className="mb-5">
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
    </div>
  )
}
