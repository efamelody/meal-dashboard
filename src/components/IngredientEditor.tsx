import { useState } from "react"
import { Check, Plus, X } from "lucide-react"
import type { MealIngredientDraft } from "../lib/db"

const UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "piece",
  "pack",
  "tbsp",
  "tsp",
  "can",
  "bottle",
  "jar",
  "cup",
]

interface IngredientEditorProps {
  value: MealIngredientDraft[]
  onChange: (next: MealIngredientDraft[]) => void
  suggestions: string[]
}

/**
 * Structured ingredient rows (name + quantity + unit). Quantities are what
 * the grocery list sums per serving — the plan multiplies them by servings.
 */
export default function IngredientEditor({
  value,
  onChange,
  suggestions,
}: IngredientEditorProps) {
  const [input, setInput] = useState("")
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)

  const existing = new Set(value.map((v) => v.item_name.toLowerCase()))

  const filtered = suggestions
    .filter(
      (s) =>
        s.toLowerCase().includes(input.trim().toLowerCase()) &&
        !existing.has(s.toLowerCase()),
    )
    .slice(0, 8)

  function addNames(raw: string) {
    const tokens = raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    setInput("")
    setOpen(false)
    setHighlight(0)
    if (!tokens.length) return
    const seen = new Set(value.map((v) => v.item_name.toLowerCase()))
    const added: MealIngredientDraft[] = []
    for (const name of tokens) {
      if (seen.has(name.toLowerCase())) continue
      seen.add(name.toLowerCase())
      added.push({ item_name: name, quantity: 1, unit: "" })
    }
    if (added.length) onChange([...value, ...added])
  }

  function pickSuggestion(s: string) {
    if (existing.has(s.toLowerCase())) return
    onChange([...value, { item_name: s, quantity: 1, unit: "" }])
    setInput("")
    setOpen(false)
    setHighlight(0)
  }

  function updateRow(idx: number, patch: Partial<MealIngredientDraft>) {
    onChange(value.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  function removeRow(idx: number) {
    onChange(value.filter((_, i) => i !== idx))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      if (open && filtered[highlight]) pickSuggestion(filtered[highlight])
      else addNames(input)
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      if (!filtered.length) return
      setOpen(true)
      setHighlight((h) => (h + 1) % filtered.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (!filtered.length) return
      setOpen(true)
      setHighlight((h) => (h - 1 + filtered.length) % filtered.length)
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  const field =
    "rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"

  return (
    <div>
      <ul className="space-y-2">
        {value.map((row, idx) => (
          <li key={idx} className="flex items-center gap-2">
            <input
              value={row.item_name}
              onChange={(e) => updateRow(idx, { item_name: e.target.value })}
              placeholder="Ingredient"
              aria-label={`Ingredient ${idx + 1} name`}
              className={`${field} flex-1 min-w-0`}
            />
            <input
              type="number"
              min={0}
              step="any"
              value={row.quantity}
              onChange={(e) =>
                updateRow(idx, { quantity: Number(e.target.value) || 0 })
              }
              aria-label={`${row.item_name || "Ingredient"} quantity`}
              className={`${field} tabular w-16 text-center`}
            />
            <input
              value={row.unit}
              onChange={(e) => updateRow(idx, { unit: e.target.value })}
              list="ingredient-units"
              placeholder="unit"
              aria-label={`${row.item_name || "Ingredient"} unit`}
              className={`${field} w-16 text-center`}
            />
            <button
              type="button"
              onClick={() => removeRow(idx)}
              aria-label={`Remove ${row.item_name || "ingredient"}`}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-error hover:bg-muted transition-colors"
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>

      <datalist id="ingredient-units">
        {UNITS.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>

      <div className="relative mt-2">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setOpen(true)
              setHighlight(0)
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setOpen(false), 120)
            }}
            placeholder="Add an ingredient and press Enter"
            className={`${field} flex-1 min-w-0`}
          />
          <button
            type="button"
            onClick={() =>
              open && filtered[highlight]
                ? pickSuggestion(filtered[highlight])
                : addNames(input)
            }
            disabled={!input.trim()}
            className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-secondary text-secondary-foreground border border-[#dde6d6] hover:bg-[#dfe8d7] disabled:opacity-40 transition-colors"
            aria-label="Add ingredient"
          >
            <Plus size={15} />
          </button>
        </div>
        {open && filtered.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-lg shadow-black/5">
            {filtered.map((s, i) => (
              <li key={s}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickSuggestion(s)}
                  className={`w-full flex items-center justify-between text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${
                    i === highlight ? "bg-muted" : ""
                  }`}
                >
                  <span className="text-foreground">{s}</span>
                  {i === highlight && (
                    <Check size={13} className="text-primary" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Quantities are per serving — the grocery list multiplies them by the
        servings you plan.
      </p>
    </div>
  )
}
