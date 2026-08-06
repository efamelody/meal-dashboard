# MealKit — AI Meal Planning & Fitness Dashboard

Plan your weekly meals, auto-generate your grocery list, and get a personalized
daily calorie target — all in one app. **MealKit** is a fast, mobile-first web
app that pairs a full meal-planning dashboard with Gemini-powered AI assistance.

> **Tagline:** Eat smarter. Shop smarter. Know your numbers.

---

## ✨ Features

### 🍽️ Meal Library
- Add meals in seconds — type ingredients as a sentence (`cili, Garam`) and they
  are split into a clean, tag-style list.
- **Smart autocomplete** — as you type, MealKit suggests ingredients it has
  already seen in your meals and inventory, so you can tap to add.
- **AI ingredient suggestions** — enter a meal name (e.g. *Chicken Salad*) and
  Gemini fills the ingredient list for you. Add or remove tags freely.
- **AI nutrition estimate** — one click estimates Calories, Protein, Carbs and
  Fat for any meal.
- Responsive card grid — 1 column on phones, 2 on tablets, 3 on desktop — with
  ingredients visible at a glance and a `+N more` expander for long lists.

### 📦 Kitchen Inventory
- Track what you have in stock with quantity + unit.
- Toggle items in/out of stock; edit or delete from the list.

### 📅 Weekly Planner
- 7-day × meal-type grid (Breakfast / Lunch / Dinner / Snack).
- Live daily and weekly calorie totals per column.
- Pick any saved meal for each slot.

### 🛒 Smart Grocery List
- One click generates the grocery list from your planned meals.
- **Smart deduction** — items already marked *in stock* in your inventory are
  pre-checked as bought.

### ❤️ Fitness Profile & AI Calorie Recommendation
- Record age, sex, height, weight, your goal (lose / maintain / build) and
  lifestyle (how much you walk / exercise).
- MealKit computes your **BMR and TDEE** (Mifflin-St Jeor), then Gemini
  personalizes a **daily calorie target** with a protein/carb/fat split and a
  short explanation.
- Your recommendation is stored in the database and updates every time you
  change your profile — surfaced on the Dashboard as a Daily Target card.

### 🤖 AI everywhere, with a fallback
- **Model fallback chain** — if a Gemini model is overloaded or slow, MealKit
  automatically retries with lighter models so AI features keep working.
- **Model switcher** — a footer dropdown lets you choose between
  `gemini-3.6-flash`, `gemini-2.5-flash`, and `gemini-3.5-flash-lite`.

### 📱 Mobile-first
- The sidebar becomes a slide-in drawer on phones with a hamburger menu.
- Every page is responsive — designed to be used while you're out grocery
  shopping.

---

## 🧰 Tech Stack

| Layer     | Technology                                              |
| --------- | ------------------------------------------------------- |
| Frontend  | React 19, TypeScript, Vite 8                            |
| Styling   | Tailwind CSS v4 (`@tailwindcss/vite`)                   |
| Routing   | React Router 7                                          |
| Icons     | lucide-react                                            |
| Database  | Supabase (PostgreSQL) with Row Level Security           |
| AI        | Google Gemini API (REST, no SDK dependency)             |
| Formatting| oxfmt                                                   |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 22+ and pnpm
- A Supabase project
- A Google Gemini API key (free tier works)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment (`.env`)

```env
# Supabase
VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="<anon key>"
VITE_SUPABASE_SERVICE_ROLE_KEY="<service role key>"   # dev: single-user auth bootstrap

# Gemini
VITE_GEMINI_API_KEY="<your gemini api key>"
# Optional: override the default model (default: gemini-3.6-flash)
# VITE_GEMINI_MODEL="gemini-2.5-flash"

# Optional: fixed auth user id, or dev user bootstrap
# VITE_USER_ID="<uuid>"
# VITE_DEV_USER_EMAIL="me@meal-dashboard.local"
# VITE_DEV_USER_PASSWORD="local-dev-password"
```

### 3. Set up the database

Run the SQL in [`supabase/schema.sql`](supabase/schema.sql) in the Supabase
SQL Editor (Dashboard → SQL Editor → New query → Run).

> **Note:** The `create type ... as enum` lines fail on a second run. If you
> only need to add a new table later, run just that section.

### 4. Start developing

```bash
pnpm run dev
```

The Vite dev server runs on port `8443` with hot reload.

---

## 📁 Project Structure

```
src/
├── main.tsx            # React entrypoint
├── App.tsx             # Routes, mobile top bar, footer
├── components/
│   ├── Sidebar.tsx         # Navigation (drawer on mobile)
│   ├── IngredientInput.tsx # Tag input with autocomplete
│   └── AiFooter.tsx        # Model switcher footer
├── lib/
│   ├── db.ts               # Data layer (Supabase queries)
│   ├── supabase.ts         # Supabase client + user resolution
│   ├── gemini.ts           # Gemini API calls + model fallback
│   ├── nutrition.ts        # BMR / TDEE / calorie math
│   ├── types.ts            # Shared TypeScript types
│   └── ai-plan.ts          # AI meal-plan shell (Gemini-ready)
└── pages/
    ├── DashboardPage.tsx   # Overview + daily target card
    ├── MealsPage.tsx       # Meal library + add-meal form
    ├── InventoryPage.tsx   # Kitchen inventory
    ├── PlannerPage.tsx     # Weekly planner grid
    ├── GroceryPage.tsx     # Generated grocery list
    └── ProfilePage.tsx     # Fitness profile + AI recommendation
supabase/
└── schema.sql          # Full DB schema + RLS policies
```

---

## 🔐 Security

- All tables use **Row Level Security** scoped to `auth.uid()`.
- The app currently bootstraps a single dev user via the service-role key for
  local development. Before any public deployment, replace this with real
  Supabase Auth and route the Gemini API key through a small serverless proxy so
  it never ships in the client bundle.

---

## 📜 Scripts

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `pnpm run dev`     | Start the Vite dev server            |
| `pnpm run build`   | Production build                     |
| `pnpm run preview` | Preview the production build         |
| `pnpm run format`  | Format all source with oxfmt         |

---

## 🗺️ Roadmap

- **Phase 1 (done):** Meal library, inventory, weekly planner, smart grocery
  list, fitness profile with AI calorie recommendations.
- **Phase 2 (planned):** Exercise tracking — strength & cardio sessions with
  daily calorie-burn suggestions.
- **Phase 3 (planned):** Connect to fitness apps such as Apple Health to sync
  activity automatically.
