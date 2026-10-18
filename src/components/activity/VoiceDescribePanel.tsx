import { useCallback, useEffect, useRef, useState } from "react"
import {
  Check,
  CircleStop,
  Keyboard,
  Loader2,
  Mic,
  RefreshCw,
  SquarePen,
} from "lucide-react"
import { Button, InlineNote } from "../ui"
import { interpretActivityDescription } from "../../lib/activityAi"
import type { DraftInterpretation } from "../../lib/activityAi"
import {
  SPEECH_MESSAGES,
  isSpeechSupported,
  startSpeechSession,
  type SpeechErrorCode,
  type SpeechSession,
} from "../../lib/speech"

type Phase = "idle" | "manual" | "requesting" | "recording" | "review" | "processing" | "applied"

interface VoiceError {
  code: SpeechErrorCode
  message: string
}

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export interface VoiceDescribePanelProps {
  /** Called once with the interpreted draft; the parent fills the form. */
  onDraft: (interpretation: DraftInterpretation, transcript: string) => void
}

export default function VoiceDescribePanel({
  onDraft,
}: VoiceDescribePanelProps) {
  const supported = isSpeechSupported()
  const [phase, setPhase] = useState<Phase>("idle")
  const [transcript, setTranscript] = useState("")
  const [manualText, setManualText] = useState("")
  const [error, setError] = useState<VoiceError | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [listeningLabel, setListeningLabel] =
    useState<"permission" | "listening">("permission")

  const sessionRef = useRef<SpeechSession | null>(null)
  const startedAtRef = useRef<number>(0)

  const stopSession = useCallback(() => {
    sessionRef.current = null
  }, [])

  useEffect(() => {
    if (phase !== "recording" && phase !== "requesting") return
    const timer = setInterval(() => {
      setElapsed((Date.now() - startedAtRef.current) / 1000)
    }, 250)
    return () => clearInterval(timer)
  }, [phase])

  useEffect(() => () => sessionRef.current?.cancel(), [])

  function reset() {
    setPhase("idle")
    setTranscript("")
    setManualText("")
    setError(null)
    setElapsed(0)
    setListeningLabel("permission")
  }

  function startRecording() {
    setError(null)
    setTranscript("")
    setElapsed(0)
    setListeningLabel("permission")

    if (!supported) {
      setPhase("manual")
      setError({
        code: "unsupported",
        message: SPEECH_MESSAGES.unsupported,
      })
      return
    }

    setPhase("requesting")
    startedAtRef.current = Date.now()

    const session = startSpeechSession({
      onText: (text) => {
        setListeningLabel("listening")
        setTranscript(text)
        setPhase("recording")
      },
      onEnd: ({ text, error: code, timedOut }) => {
        stopSession()
        const trimmed = text.trim()

        if (code === "aborted") {
          reset()
          return
        }
        if (code && !trimmed) {
          setPhase("idle")
          setError({
            code,
            message: timedOut ? SPEECH_MESSAGES.timeout : SPEECH_MESSAGES[code],
          })
          return
        }
        if (!trimmed) {
          setPhase("idle")
          setError({ code: "no-speech", message: SPEECH_MESSAGES["no-speech"] })
          return
        }
        setTranscript(trimmed)
        setPhase("review")
        if (code && code !== "no-speech") {
          setError({ code, message: SPEECH_MESSAGES[code] })
        }
      },
    })

    if (!session) {
      setPhase("manual")
      setError({ code: "unsupported", message: SPEECH_MESSAGES.unsupported })
      return
    }
    sessionRef.current = session
    setPhase("recording")

    // The browser shows its own permission prompt — label it until we know.
    setTimeout(() => {
      setListeningLabel((current) =>
        current === "permission" && sessionRef.current ? "listening" : current,
      )
    }, 1500)
  }

  function stopRecording() {
    sessionRef.current?.stop()
  }

  function cancelRecording() {
    sessionRef.current?.cancel()
    reset()
  }

  async function createDraft(text: string) {
    const trimmed = text.trim()
    if (!trimmed) {
      setError({
        code: "no-speech",
        message: "Nothing to read yet — describe the activity first.",
      })
      return
    }
    setPhase("processing")
    setError(null)
    try {
      const interpretation = await interpretActivityDescription(trimmed)
      onDraft(interpretation, trimmed)
      setPhase("applied")
    } catch {
      setPhase("review")
      setError({
        code: "service",
        message:
          "Couldn't read that description. Try again or type it instead.",
      })
    }
  }

  const privacyNote = (
    <p className="text-[11px] leading-relaxed text-muted-foreground">
      Speech is transcribed by your browser — MealKit never stores audio. The
      text you approve is sent to the app&apos;s AI provider to pull out the
      details; nothing is sent until you tap “Create draft”.
    </p>
  )

  /* ── Applied ─────────────────────────────────────────────────────── */
  if (phase === "applied") {
    return (
      <section
        aria-label="Describe your activity"
        className="animate-fade-in-up rounded-2xl border border-[#dde6d6] bg-sage p-4"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success text-white">
            <Check size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-secondary-foreground">
              Description added to your form
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-secondary-foreground/80">
              Check every field below and change anything we read wrong — the
              draft is yours to edit before saving.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={reset}>
            <SquarePen size={14} />
            Describe another
          </Button>
        </div>
      </section>
    )
  }

  /* ── Recording / requesting ──────────────────────────────────────── */
  if (phase === "recording" || phase === "requesting") {
    return (
      <section
        aria-label="Describe your activity"
        aria-live="polite"
        className="animate-fade-in-up rounded-2xl border-2 border-primary/40 bg-card p-4"
      >
        <div className="flex items-center gap-3">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <span
              aria-hidden="true"
              className="absolute inset-0 animate-ping rounded-full bg-primary/25"
            />
            <Mic size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {listeningLabel === "permission"
                ? "Waiting for microphone permission…"
                : "Listening — describe your activity"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {transcript || "Start with what you did, for how long…"}
            </p>
          </div>
          <span className="tabular shrink-0 text-sm font-semibold text-foreground">
            {clock(elapsed)}
          </span>
        </div>

        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={stopRecording}>
            <CircleStop size={15} />
            Stop
          </Button>
          <Button size="sm" variant="ghost" onClick={cancelRecording}>
            Cancel
          </Button>
        </div>
        <div className="mt-2">{privacyNote}</div>
      </section>
    )
  }

  /* ── Review / processing ─────────────────────────────────────────── */
  if (phase === "review" || phase === "processing") {
    const processing = phase === "processing"
    return (
      <section
        aria-label="Describe your activity"
        className="animate-fade-in-up rounded-2xl border border-border bg-card p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">
            Your description
          </h3>
          <span className="tabular text-[11px] text-muted-foreground">
            {clock(elapsed)}
          </span>
        </div>
        <label htmlFor="act-transcript" className="sr-only">
          Transcript
        </label>
        <textarea
          id="act-transcript"
          rows={3}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          disabled={processing}
          className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-70"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            loading={processing}
            onClick={() => createDraft(transcript)}
            disabled={!transcript.trim()}
          >
            {processing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Reading your description…
              </>
            ) : (
              <>
                <Mic size={14} />
                Create draft
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={reset}
            disabled={processing}
          >
            Discard
          </Button>
        </div>
        {processing && (
          <p
            className="mt-2 text-[11px] text-muted-foreground"
            aria-live="polite"
          >
            Pulling out the activity, duration and effort — you can edit
            everything next.
          </p>
        )}
        <div className="mt-2">{privacyNote}</div>
      </section>
    )
  }

  /* ── Idle / manual entry ─────────────────────────────────────────── */
  return (
    <section
      aria-label="Describe your activity"
      className="rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage text-accent">
          <Mic size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">
            Want to describe your workout instead?
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Speak or type a sentence like “I swam for 40 minutes, mostly
            freestyle” — we&apos;ll fill the form for you to review.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-3">
          <InlineNote tone="warning" icon={<RefreshCw size={13} />}>
            {error.message}
          </InlineNote>
        </div>
      )}

      {phase === "manual" ? (
        <div className="mt-3">
          <label htmlFor="act-manual" className="sr-only">
            Describe your activity
          </label>
          <textarea
            id="act-manual"
            rows={3}
            autoFocus
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="e.g. Hiked the ridge trail for two hours this morning, steep with a few breaks."
            className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-relaxed placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => createDraft(manualText)}
              disabled={!manualText.trim()}
            >
              Create draft
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              Cancel
            </Button>
            {supported && (
              <Button size="sm" variant="outline" onClick={startRecording}>
                <Mic size={14} />
                Use microphone
              </Button>
            )}
          </div>
          <div className="mt-2">{privacyNote}</div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={startRecording} disabled={!supported}>
            <Mic size={15} />
            Describe your activity
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPhase("manual")}
          >
            <Keyboard size={15} />
            Type it instead
          </Button>
        </div>
      )}

      {!supported && phase === "idle" && (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {SPEECH_MESSAGES.unsupported} Typing works the same way — the AI reads
          your text either way.
        </p>
      )}
    </section>
  )
}
