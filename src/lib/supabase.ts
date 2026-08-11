import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ??
  "https://giqdgvvbsirxojzqdmoc.supabase.co"
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "missing-key"

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
)

let cachedUserId: string | null = null

supabase.auth.onAuthStateChange((_event, session) => {
  cachedUserId = session?.user?.id ?? null
})

/**
 * Resolve the id of the currently signed-in user from the session token.
 * Every table is FK'd to auth.users and guarded by RLS, so the returned id is
 * what filters every query in src/lib/db.ts to this user's own rows.
 */
export async function getUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId

  const { data: sessionData } = await supabase.auth.getSession()
  if (sessionData.session?.user) {
    cachedUserId = sessionData.session.user.id
    return cachedUserId
  }

  const { data: userData } = await supabase.auth.getUser()
  if (userData.user) {
    cachedUserId = userData.user.id
    return cachedUserId
  }

  throw new Error("getUserId: not signed in")
}
