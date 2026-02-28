import { createClient } from '@supabase/supabase-js'
import type { Concert } from '../data/concerts'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set in .env.local — ' +
    'falling back to static concert data.'
  )
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

// Extends the static Concert type with live on-chain columns
export type SupabaseConcert = Concert & {
  concert_object_id: string | null    // shared Concert object on-chain (0x...)
  waitlist_object_id: string | null   // shared Waitlist object on-chain (0x...) — optional
}
