import { useState } from "react"
import { Sparkles } from "lucide-react"
import {
  AVAILABLE_MODELS,
  getSelectedModel,
  setSelectedModel,
} from "../lib/gemini"

export default function AiFooter() {
  const [model, setModel] = useState(getSelectedModel())
  const [saved, setSaved] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value
    setModel(id)
    setSelectedModel(id)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--card)] px-4 sm:px-8 py-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
        <p className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <Sparkles size={13} className="text-[var(--accent)] shrink-0" />
          Powered by the Gemini free tier. Slow responses? Switch to a lighter
          model.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={model}
            onChange={handleChange}
            aria-label="AI model"
            className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          {saved && (
            <span className="text-xs text-[var(--accent)] font-medium">
              Updated
            </span>
          )}
        </div>
      </div>
    </footer>
  )
}
