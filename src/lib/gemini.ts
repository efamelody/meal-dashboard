// Gemini helpers for the add-meal form.
// Uses the generateContent REST endpoint directly (no SDK dependency).
// Requires VITE_GEMINI_API_KEY in .env.

import { ACTIVITY_LABELS, GOAL_LABELS, type FormulaResult } from "./nutrition"
import type { ActivityLevel, Goal, Sex } from "./types"

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const DEFAULT_MODEL =
  import.meta.env.VITE_GEMINI_MODEL as string | undefined ?? "gemini-3.6-flash"
const STORAGE_KEY = "meal-kit-gemini-model"

export interface GeminiModelOption {
  id: string
  label: string
}

export const AVAILABLE_MODELS: GeminiModelOption[] = [
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite" },
]

export function getSelectedModel(): string {
  if (typeof window === "undefined") return DEFAULT_MODEL
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved && AVAILABLE_MODELS.some((m) => m.id === saved)) return saved
  return DEFAULT_MODEL
}

export function setSelectedModel(id: string): void {
  window.localStorage.setItem(STORAGE_KEY, id)
}

const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
}

function extractJSON<T>(text: string): T {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  return JSON.parse((fenced ? fenced[1] : trimmed).trim()) as T
}

class GeminiError extends Error {
  retryable: boolean

  constructor(message: string, retryable: boolean) {
    super(message)
    this.retryable = retryable
  }
}

interface GeminiPart {
  text?: string
  inline_data?: {
    mime_type: string
    data: string
  }
}

async function requestParts<T>(model: string, parts: GeminiPart[]): Promise<T> {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key missing. Add VITE_GEMINI_API_KEY to .env")
  }
  const res = await fetch(
    `${ENDPOINT(model)}?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  )
  if (!res.ok) {
    const message = `Gemini request failed (${res.status}): ${await res.text()}`
    throw new GeminiError(message, res.status === 429 || res.status >= 500)
  }
  const data = (await res.json()) as GeminiResponse
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  if (!text) throw new Error("Gemini returned an empty response")
  return extractJSON<T>(text)
}

async function requestModel<T>(model: string, prompt: string): Promise<T> {
  return requestParts<T>(model, [{ text: prompt }])
}

async function callGeminiParts<T>(parts: GeminiPart[]): Promise<T> {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key missing. Add VITE_GEMINI_API_KEY to .env")
  }
  const selected = getSelectedModel()
  const attempts = [
    selected,
    ...AVAILABLE_MODELS.map((m) => m.id).filter((id) => id !== selected),
  ]
  let lastError: unknown
  for (const model of attempts) {
    try {
      return await requestParts<T>(model, parts)
    } catch (err) {
      lastError = err
      if (err instanceof GeminiError && !err.retryable) throw err
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("All Gemini models failed.")
}

function callGeminiJSON<T>(prompt: string): Promise<T> {
  return callGeminiParts<T>([{ text: prompt }])
}

export async function suggestIngredients(mealName: string): Promise<string[]> {
  const prompt = `
You are a recipe assistant. Based on the meal name, list the typical ingredients needed.

Meal name: ${mealName}

Return a JSON array of ingredient names only (no quantities, no units). Keep it concise (5 to 12 common ingredients). Use plain names like "chicken", "garlic", "salt".
`.trim()
  const result = await callGeminiJSON<unknown>(prompt)
  if (!Array.isArray(result)) return []
  return result
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter(Boolean)
}

export interface NutritionInfo {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface NutritionRecommendation {
  daily_calorie_target: number
  protein_g_target: number
  carbs_g_target: number
  fat_g_target: number
  reasoning: string
}

export interface NutritionRecommendationInput {
  age: number
  sex: Sex
  height_cm: number
  weight_kg: number
  goal: Goal
  activity_level: ActivityLevel
  formula: FormulaResult
}

export async function recommendNutrition(
  input: NutritionRecommendationInput,
): Promise<NutritionRecommendation> {
  const formula = input.formula
  const prompt = `
You are a certified nutrition coach. Based on the profile and a baseline computed with the Mifflin-St Jeor equation, recommend a sensible daily calorie and macro target.

Profile:
- Age: ${input.age}
- Sex: ${input.sex}
- Height: ${input.height_cm} cm
- Weight: ${input.weight_kg} kg
- Goal: ${input.goal} (${GOAL_LABELS[input.goal]})
- Activity: ${input.activity_level} (${ACTIVITY_LABELS[input.activity_level]})

Baseline:
- BMR: ${formula.bmr_kcal} kcal
- TDEE: ${formula.tdee_kcal} kcal
- Formula daily target: ${formula.daily_calorie_target} kcal

Return a JSON object with exactly these keys:
{"daily_calorie_target": <integer, within 10% of the formula target>, "protein_g_target": <integer grams>, "carbs_g_target": <integer grams>, "fat_g_target": <integer grams>, "reasoning": "<one or two sentences>"}
`.trim()
  const result = await callGeminiJSON<Partial<NutritionRecommendation>>(prompt)

  const aiTarget = Math.round(Number(result.daily_calorie_target) || 0)
  const target = aiTarget
    ? Math.max(
        Math.round(formula.daily_calorie_target * 0.9),
        Math.min(Math.round(formula.daily_calorie_target * 1.1), aiTarget),
      )
    : formula.daily_calorie_target

  const pick = (n: unknown, fallback: number) => {
    const v = Number(n)
    return v > 0 ? Math.round(v) : fallback
  }

  return {
    daily_calorie_target: target,
    protein_g_target: pick(result.protein_g_target, formula.protein_g_target),
    carbs_g_target: pick(result.carbs_g_target, formula.carbs_g_target),
    fat_g_target: pick(result.fat_g_target, formula.fat_g_target),
    reasoning:
      typeof result.reasoning === "string" ? result.reasoning.trim() : "",
  }
}

export async function estimateNutrition(
  mealName: string,
  ingredients: string[],
): Promise<NutritionInfo> {
  const prompt = `
You are a nutrition assistant. Estimate the nutritional values for this meal, per single serving.

Meal name: ${mealName}
Ingredients: ${ingredients.join(", ") || "(none provided)"}

Return a JSON object with only these numeric keys:
{"calories": <number in kcal>, "protein_g": <number>, "carbs_g": <number>, "fat_g": <number>}
`.trim()
  const result = await callGeminiJSON<Partial<NutritionInfo>>(prompt)
  return {
    calories: Math.max(0, Math.round(Number(result.calories) || 0)),
    protein_g: Math.max(0, Number(result.protein_g) || 0),
    carbs_g: Math.max(0, Number(result.carbs_g) || 0),
    fat_g: Math.max(0, Number(result.fat_g) || 0),
  }
}

async function downscaleImage(
  dataUrl: string,
  maxSize = 1024,
  quality = 0.85,
): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Could not read the image"))
    img.src = dataUrl
  })
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Could not process the image")
  ctx.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL("image/jpeg", quality)
}

export interface MealPhotoInput {
  description: string
  imageDataUrl?: string
}

export async function estimateMealFromPhoto(
  input: MealPhotoInput,
): Promise<NutritionInfo> {
  const parts: GeminiPart[] = []
  let photoAttached = false
  if (input.imageDataUrl) {
    try {
      const prepared = await downscaleImage(input.imageDataUrl)
      const [meta, data] = prepared.split(",")
      const mime = meta.match(/data:([^;]+);base64/)?.[1] ?? "image/jpeg"
      parts.push({ inline_data: { mime_type: mime, data } })
      photoAttached = true
    } catch {
      // Fall back to a text-only estimate if the image can't be processed.
    }
  }
  const description = input.description.trim()
  parts.push({
    text: `
You are a nutrition assistant. Estimate the nutritional values for this food, per single serving.
${
  description
    ? `Food: ${description}`
    : photoAttached
      ? "Food: (shown in the attached photo)"
      : "Food: (unknown)"
}
${photoAttached ? "Identify the dish and portion from the attached photo." : ""}
Return a JSON object with only these numeric keys:
{"calories": <number in kcal>, "protein_g": <number>, "carbs_g": <number>, "fat_g": <number>}
`.trim(),
  })
  const result = await callGeminiParts<Partial<NutritionInfo>>(parts)
  return {
    calories: Math.max(0, Math.round(Number(result.calories) || 0)),
    protein_g: Math.max(0, Number(result.protein_g) || 0),
    carbs_g: Math.max(0, Number(result.carbs_g) || 0),
    fat_g: Math.max(0, Number(result.fat_g) || 0),
  }
}
