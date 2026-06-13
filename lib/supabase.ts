import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Auth client — session-aware, used for user-specific queries.
// Options are explicit so a Supabase library upgrade can't silently change them.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Public client — always sends the anon key, never the user JWT.
// Use this for tables whose RLS only grants the `anon` role, so logged-in
// users don't get silently denied by an `authenticated`-role policy gap.
// storageKey must differ from the default to avoid "Multiple GoTrueClient
// instances detected" warning when both clients share the same localStorage key.
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'sb-public-anon',
  },
  global: { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` } },
})
