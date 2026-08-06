// AI Meal Plan Shell — ready for Google Gemini integration.
// Replace the placeholder body with a real Gemini API call using
// @google/generative-ai once an API key is available.

import { getMeals, getInventory } from "./db";
import type { DayOfWeek, Meal, MealType } from "./types";

export interface AIPlanRequest {
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
}

export type AIPlanSlot = { day: DayOfWeek; meal_type: MealType; meal_id: string };

export interface AIPlanResponse {
  plan: AIPlanSlot[];
  reasoning: string;
}

export async function generateAIMealPlan(req: AIPlanRequest): Promise<AIPlanResponse> {
  const [meals, inventory] = await Promise.all([getMeals(), getInventory()]);

  // ── Gemini integration point ───────────────────────────────────────────
  // const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  //
  // const prompt = buildPrompt(req, meals, inventory);
  // const result = await model.generateContent(prompt);
  // const text = result.response.text();
  // return JSON.parse(text) as AIPlanResponse;
  // ──────────────────────────────────────────────────────────────────────

  // Stub: naive greedy allocation for demonstration
  const DAYS: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner"];

  const byType = (t: MealType) => meals.filter((m) => m.meal_type === t);
  const pick = (arr: Meal[]) => arr[Math.floor(Math.random() * arr.length)];

  const plan: AIPlanSlot[] = [];
  for (const day of DAYS) {
    for (const meal_type of TYPES) {
      const pool = byType(meal_type);
      if (pool.length) {
        plan.push({ day, meal_type, meal_id: pick(pool).id });
      }
    }
  }

  return {
    plan,
    reasoning: `Stub plan generated targeting ${req.target_calories} kcal/day. Connect Google Gemini for intelligent macro-balanced allocation.`,
  };
}

function buildPrompt(req: AIPlanRequest, meals: Meal[], inventory: ReturnType<typeof Array.prototype.map>): string {
  return `
You are a nutrition assistant. Create a 7-day meal plan using ONLY the meals provided.

Target macros per day:
- Calories: ${req.target_calories} kcal
- Protein: ${req.target_protein_g}g
- Carbs: ${req.target_carbs_g}g
- Fat: ${req.target_fat_g}g

Available meals (JSON):
${JSON.stringify(meals, null, 2)}

Items already in stock (prioritize these):
${JSON.stringify(inventory, null, 2)}

Return a JSON object with this shape:
{
  "plan": [{ "day": "Mon", "meal_type": "Breakfast", "meal_id": "<uuid>" }],
  "reasoning": "<brief explanation>"
}
`.trim();
}
