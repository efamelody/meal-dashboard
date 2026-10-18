// Browser speech-to-text boundary for the "Describe your activity" flow.
//
// This module only wraps the Web Speech API (SpeechRecognition). It is the one
// place that knows about browser prefixes and error codes; it never records or
// stores audio itself — the browser handles capture, and MealKit only ever
// sees the transcript text. When the API is unavailable the UI falls back to
// manual typing (see src/components/activity/VoiceDescribePanel.tsx).

export type SpeechErrorCode = "unsupported" | "denied" | "no-speech" | "network" | "audio-capture" | "timeout" | "aborted" | "service"

/* eslint-disable @typescript-eslint/no-explicit-any */
type RecognitionLike = any

const ERROR_MAP: Record<string, SpeechErrorCode> = {
  "not-allowed": "denied",
  "service-not-allowed": "denied",
  "no-speech": "no-speech",
  network: "network",
  "audio-capture": "audio-capture",
  aborted: "aborted",
}

function recognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ??
    w.webkitSpeechRecognition) as (new () => RecognitionLike) | null
}

export function isSpeechSupported(): boolean {
  return recognitionCtor() !== null
}

export interface SpeechEndInfo {
  text: string
  error: SpeechErrorCode | null
  timedOut: boolean
}

export interface SpeechSessionOptions {
  lang?: string
  /** Maximum recording time before we stop and report a timeout. */
  maxMs?: number
  /** Fired with the transcript accumulated so far (final + interim). */
  onText?: (text: string) => void
  /** Fired exactly once when the session finishes for any reason. */
  onEnd?: (info: SpeechEndInfo) => void
}

export interface SpeechSession {
  stop: () => void
  cancel: () => void
}

/**
 * Start listening. Returns null when the browser has no speech recognition —
 * callers should then show the unsupported state and offer manual entry.
 * Permission is requested by the browser when this is called from a tap.
 */
export function startSpeechSession(
  options: SpeechSessionOptions,
): SpeechSession | null {
  const Ctor = recognitionCtor()
  if (!Ctor) return null

  const recognition: RecognitionLike = new Ctor()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = options.lang ?? navigator.language ?? "en-US"

  let finalText = ""
  let interimText = ""
  let error: SpeechErrorCode | null = null
  let timedOut = false
  let ended = false
  let timer: ReturnType<typeof setTimeout> | null = null

  const combined = () =>
    `${finalText} ${interimText}`.replace(/\s+/g, " ").trim()

  const finish = () => {
    if (ended) return
    ended = true
    if (timer) clearTimeout(timer)
    try {
      recognition.onend = null
      recognition.onerror = null
      recognition.onresult = null
      recognition.stop()
    } catch {
      // Already stopped — nothing to clean up.
    }
    options.onEnd?.({ text: combined(), error, timedOut })
  }

  recognition.onresult = (event: RecognitionLike) => {
    let interim = ""
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      const chunk = String(result[0]?.transcript ?? "")
      if (result.isFinal) {
        finalText = `${finalText} ${chunk}`.replace(/\s+/g, " ").trim()
      } else {
        interim += chunk
      }
    }
    interimText = interim
    options.onText?.(combined())
  }

  recognition.onerror = (event: RecognitionLike) => {
    const mapped = ERROR_MAP[String(event?.error)] ?? "service"
    // "no-speech" and "aborted" are usually recoverable — wait for onend so
    // the caller sees the transcript (if any) before we report the error.
    if (mapped === "no-speech" || mapped === "aborted") {
      error = error ?? mapped
      return
    }
    error = mapped
    finish()
  }

  recognition.onend = () => {
    finish()
  }

  const maxMs = options.maxMs ?? 60_000
  timer = setTimeout(() => {
    timedOut = true
    try {
      recognition.stop()
    } catch {
      finish()
    }
  }, maxMs)

  try {
    recognition.start()
  } catch {
    error = "service"
    finish()
    return null
  }

  return {
    stop: () => {
      try {
        recognition.stop()
      } catch {
        finish()
      }
    },
    cancel: () => {
      error = "aborted"
      try {
        recognition.stop()
      } catch {
        finish()
      }
    },
  }
}

export const SPEECH_MESSAGES: Record<SpeechErrorCode, string> = {
  unsupported: "Voice input isn't supported in this browser.",
  denied:
    "Microphone access was blocked. Allow the microphone for this site, then try again.",
  "no-speech":
    "I didn't catch anything. Try again and speak a little closer to the mic.",
  network:
    "The speech service couldn't reach the network. Check your connection and retry.",
  "audio-capture": "No working microphone was found on this device.",
  timeout:
    "Recording stopped after 60 seconds. Review what we have or start again.",
  aborted: "Recording cancelled.",
  service: "The speech service failed. You can type the description instead.",
}
