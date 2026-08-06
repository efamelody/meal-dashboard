import { useState } from "react"
import { Check } from "lucide-react"

interface ItemAutocompleteProps {
  value: string
  onChange: (next: string) => void
  suggestions: string[]
  placeholder?: string
  onCommit?: (value: string) => void
}

export default function ItemAutocomplete({
  value,
  onChange,
  suggestions,
  placeholder = "Search or type an item",
  onCommit,
}: ItemAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)

  const query = value.trim().toLowerCase()
  const filtered = (
    query
      ? suggestions.filter((s) => s.toLowerCase().includes(query))
      : suggestions
  ).slice(0, 8)

  function pick(s: string) {
    onChange(s)
    setOpen(false)
    setHighlight(0)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      if (onCommit) {
        const target =
          open && filtered[highlight] ? filtered[highlight] : value.trim()
        if (target) onCommit(target)
        setOpen(false)
        setHighlight(0)
      } else if (open && filtered[highlight]) {
        pick(filtered[highlight])
      } else {
        setOpen(false)
      }
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

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setHighlight(0)
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg">
          {filtered.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseUp={() => pick(s)}
                className={`w-full flex items-center justify-between text-left px-3 py-2 text-sm transition-colors ${
                  i === highlight
                    ? "bg-[var(--muted)] text-[var(--foreground)]"
                    : "text-[var(--foreground)]"
                }`}
              >
                <span>{s}</span>
                {i === highlight && (
                  <Check size={13} className="text-[var(--accent)]" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
