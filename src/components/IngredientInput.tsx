import { useState } from "react"
import { X, Check } from "lucide-react"

interface IngredientInputProps {
  value: string[]
  onChange: (next: string[]) => void
  suggestions: string[]
}

export default function IngredientInput({
  value,
  onChange,
  suggestions,
}: IngredientInputProps) {
  const [input, setInput] = useState("")
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)

  const existing = new Set(value.map((v) => v.toLowerCase()))

  const filtered = suggestions
    .filter(
      (s) =>
        s.toLowerCase().includes(input.trim().toLowerCase()) &&
        !existing.has(s.toLowerCase()),
    )
    .slice(0, 8)

  function addTokens(raw: string) {
    const tokens = raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    if (!tokens.length) {
      setInput("")
      return
    }
    const seen = new Set(value.map((v) => v.toLowerCase()))
    const added: string[] = []
    for (const t of tokens) {
      if (!seen.has(t.toLowerCase())) {
        seen.add(t.toLowerCase())
        added.push(t)
      }
    }
    if (added.length) onChange([...value, ...added])
    setInput("")
    setOpen(false)
    setHighlight(0)
  }

  function pickSuggestion(s: string) {
    if (!existing.has(s.toLowerCase())) onChange([...value, s])
    setInput("")
    setOpen(false)
    setHighlight(0)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      if (open && filtered[highlight]) pickSuggestion(filtered[highlight])
      else addTokens(input)
    } else if (e.key === ",") {
      e.preventDefault()
      addTokens(input)
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
    } else if (e.key === "Backspace" && input === "" && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="border border-[var(--border)] bg-[var(--background)] rounded-lg focus-within:ring-2 focus-within:ring-[var(--ring)]">
      <div className="flex flex-wrap gap-1.5 items-center px-2 py-1.5">
        {value.map((name) => (
          <span
            key={name}
            className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-[var(--secondary)] text-[var(--primary)] text-sm rounded-lg"
          >
            {name}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== name))}
              className="text-[var(--primary)]/60 hover:text-[var(--primary)] transition-colors"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setOpen(true)
            setHighlight(0)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => addTokens(input)}
          placeholder={value.length ? "" : "e.g. cili, Garam"}
          className="flex-1 min-w-[120px] px-1.5 py-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted-foreground)]"
        />
      </div>
      {open && filtered.length > 0 && (
        <ul className="border-t border-[var(--border)] max-h-48 overflow-y-auto">
          {filtered.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickSuggestion(s)}
                className={`w-full flex items-center justify-between text-left px-3 py-2 text-sm hover:bg-[var(--muted)] transition-colors ${
                  i === highlight ? "bg-[var(--muted)]" : ""
                }`}
              >
                <span className="text-[var(--foreground)]">{s}</span>
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
