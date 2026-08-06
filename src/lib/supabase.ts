import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ??
  "https://giqdgvvbsirxojzqdmoc.supabase.co"
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  "missing-key"

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
)

const DEV_USER_EMAIL =
  import.meta.env.VITE_DEV_USER_EMAIL ?? "me@meal-dashboard.local"
const DEV_USER_PASSWORD =
  import.meta.env.VITE_DEV_USER_PASSWORD ?? "local-dev-password"

let cachedUserId: string | null = null

/**
 * Resolve the id of the current user.
 *
 * Priority: an authenticated session -> a fixed VITE_USER_ID -> a single
 * auto-provisioned dev user (service-role key only). Because every table is
 * FK'd to auth.users, a real user row must exist for inserts to succeed.
 */
export async function getUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId

  const { data } = await supabase.auth.getUser()
  if (data.user) {
    cachedUserId = data.user.id
    return cachedUserId
  }

  const configured = import.meta.env.VITE_USER_ID as string | undefined
  if (configured) {
    cachedUserId = configured
    return cachedUserId
  }

  const { data: users, error: lookupError } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (lookupError) {
    throw new Error(
      `getUserId: admin lookup failed (${lookupError.message}). ` +
        "Make sure VITE_SUPABASE_SERVICE_ROLE_KEY is set in .env, or set VITE_USER_ID to an existing auth user id.",
    )
  }
  const existing = users?.users?.find((u) => u.email === DEV_USER_EMAIL)
  if (existing) {
    cachedUserId = existing.id
    return cachedUserId
  }

  const { data: created, error } = await supabase.auth.admin.createUser({
    email: DEV_USER_EMAIL,
    password: DEV_USER_PASSWORD,
    email_confirm: true,
  })
  if (error) throw error
  if (!created?.user) throw new Error("getUserId: createUser returned no user")

  cachedUserId = created.user.id
  return cachedUserId
}
