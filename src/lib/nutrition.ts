// Deterministic nutrition baseline (Mifflin-St Jeor + activity + goal).
// The Gemini recommendation refines these values; this module is the
// fallback that keeps the app working even if the AI call fails.

import type { ActivityLevel, Goal, Sex } from "./types"

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export const GOAL_LABELS: Record<Goal, string> = {
  lose: "Lose weight",
  maintain: "Maintain weight",
  build: "Build muscle",
}

export const GOAL_DESCRIPTIONS: Record<Goal, string> = {
  lose: "Mild deficit (~-500 kcal/day)",
  maintain: "Keep current weight",
  build: "Mild surplus (~+250 kcal/day)",
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary",
  light: "Lightly active",
  moderate: "Moderately active",
  active: "Very active",
  very_active: "Extra active",
}

export const ACTIVITY_DESCRIPTIONS: Record<ActivityLevel, string> = {
  sedentary: "Desk job, little or no walking",
  light: "Light walking a few times a week",
  moderate: "Regular walks / exercise 3-5 days a week",
  active: "Hard exercise most days of the week",
  very_active: "Physical job or intense daily training",
}

export interface BmrInput {
  sex: Sex
  weight_kg: number
  height_cm: number
  age: number
}

export function computeBMR({
  sex,
  weight_kg,
  height_cm,
  age,
}: BmrInput): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age
  return sex === "male" ? base + 5 : base - 161
}

export function computeTDEE(bmr: number, activity: ActivityLevel): number {
  return bmr * ACTIVITY_FACTORS[activity]
}

export function goalAdjustment(tdee: number, goal: Goal): number {
  if (goal === "lose") return Math.max(1200, tdee - 500)
  if (goal === "build") return tdee + 250
  return tdee
}

export interface FormulaResult {
  bmr_kcal: number
  tdee_kcal: number
  daily_calorie_target: number
  protein_g_target: number
  carbs_g_target: number
  fat_g_target: number
}

export function recommendationFromFormula(input: {
  sex: Sex
  weight_kg: number
  height_cm: number
  age: number
  goal: Goal
  activity_level: ActivityLevel
}): FormulaResult {
  const bmr = computeBMR(input)
  const tdee = computeTDEE(bmr, input.activity_level)
  const target = goalAdjustment(tdee, input.goal)
  return {
    bmr_kcal: Math.round(bmr * 10) / 10,
    tdee_kcal: Math.round(tdee * 10) / 10,
    daily_calorie_target: Math.round(target),
    protein_g_target: Math.round(input.weight_kg * 1.6),
    carbs_g_target: Math.round((target * 0.45) / 4),
    fat_g_target: Math.round((target * 0.25) / 9),
  }
}
