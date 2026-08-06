import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, Check, X, Package } from "lucide-react";
import { getInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } from "../lib/db";
import type { InventoryItem } from "../lib/types";

const UNITS = ["g", "kg", "ml", "L", "cup", "tbsp", "tsp", "piece", "slice"];

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("g");

  useEffect(() => { getInventory().then(setItems); }, []);

  const inStock = items.filter((i) => i.is_in_stock).length;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!itemName.trim()) return;
    const item = await addInventoryItem({
      item_name: itemName.trim(),
      quantity: parseFloat(quantity) || 0,
      unit,
      is_in_stock: true,
    });
    setItems([...items, item]);
    setItemName(""); setQuantity(""); setUnit("g");
    setShowForm(false);
  }

  async function handleToggle(item: InventoryItem) {
    await updateInventoryItem(item.id, { is_in_stock: !item.is_in_stock });
    setItems(items.map((i) => i.id === item.id ? { ...i, is_in_stock: !i.is_in_stock } : i));
  }

  async function handleDelete(id: string) {
    await deleteInventoryItem(id);
    setItems(items.filter((i) => i.id !== id));
  }

  async function handleEdit(item: InventoryItem) {
    if (editId === item.id) {
      setEditId(null); return;
    }
    setEditId(item.id);
    setItemName(item.item_name);
    setQuantity(String(item.quantity));
    setUnit(item.unit);
  }

  async function saveEdit(id: string) {
    await updateInventoryItem(id, {
      item_name: itemName.trim(),
      quantity: parseFloat(quantity) || 0,
      unit,
    });
    setItems(items.map((i) => i.id === id ? { ...i, item_name: itemName.trim(), quantity: parseFloat(quantity) || 0, unit } : i));
    setEditId(null);
    setItemName(""); setQuantity(""); setUnit("g");
  }

  return (
    <div className="flex-1 p-8 min-h-screen">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl text-[var(--foreground)]">Kitchen Inventory</h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              {inStock} of {items.length} items in stock
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            Add Item
          </button>
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

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleAdd} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 mb-6">
            <h3 className="text-base font-semibold mb-4">Add to Inventory</h3>
            <div className="flex gap-2">
              <input
                required value={itemName} onChange={(e) => setItemName(e.target.value)}
                placeholder="Item name"
                className="flex-1 px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
              <input
                type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                placeholder="Qty"
                className="w-20 px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
              <select
                value={unit} onChange={(e) => setUnit(e.target.value)}
                className="w-24 px-2 py-2.5 pr-6 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
              <button type="submit" className="px-3 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)]">
                <Check size={16} />
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2.5 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)]">
                <X size={16} />
              </button>
            </div>
          </form>
        )}

        {/* Inventory list */}
        {items.length === 0 ? (
          <div className="text-center py-20 text-[var(--muted-foreground)]">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Your inventory is empty. Add some items above.</p>
          </div>
        ) : (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
            {items.map((item, i) => (
              <div key={item.id}>
                {i > 0 && <div className="h-px bg-[var(--border)] mx-5" />}
                {editId === item.id ? (
                  <div className="flex gap-2 items-center px-5 py-3">
                    <input value={itemName} onChange={(e) => setItemName(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]" />
                    <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                      className="w-20 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]" />
                    <select value={unit} onChange={(e) => setUnit(e.target.value)}
                      className="w-24 px-2 py-1.5 pr-6 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none">
                      {UNITS.map((u) => <option key={u}>{u}</option>)}
                    </select>
                    <button onClick={() => saveEdit(item.id)} className="p-1.5 rounded-lg bg-[var(--accent)] text-white"><Check size={14} /></button>
                    <button onClick={() => setEditId(null)} className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)]"><X size={14} /></button>
                  </div>
                ) : (
                  <div className={`flex items-center justify-between px-5 py-3.5 transition-colors ${item.is_in_stock ? "" : "opacity-50"}`}>
                    <div className="flex items-center gap-3">
                      {/* Toggle switch */}
                      <button
                        onClick={() => handleToggle(item)}
                        className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${item.is_in_stock ? "bg-[var(--accent)]" : "bg-[var(--muted)]"}`}
                        style={{ height: "22px", width: "40px" }}
                        title={item.is_in_stock ? "In stock" : "Out of stock"}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform ${item.is_in_stock ? "translate-x-[18px]" : "translate-x-0"}`}
                          style={{ width: "18px", height: "18px", transform: item.is_in_stock ? "translateX(18px)" : "translateX(0)" }}
                        />
                      </button>
                      <div>
                        <span className={`text-sm font-medium ${item.is_in_stock ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)] line-through"}`}>
                          {item.item_name}
                        </span>
                        <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {item.is_in_stock && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--secondary)] text-[var(--primary)] font-medium mr-2">
                          In Stock
                        </span>
                      )}
                      <button onClick={() => handleEdit(item)} className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-50 transition-colors">
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
  );
}
