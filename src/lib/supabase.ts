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

// ── Refund Records ────────────────────────────────────────────────────────────

export interface SupabaseRefundRecord {
  id?: string
  wallet_address: string
  concert_name: string
  deposit_amount_mist: string
  tx_digest: string
  claimed_at: string   // ISO timestamp
}

/** Insert one refund record. Silently ignores duplicate tx_digest via UNIQUE constraint. */
export async function insertRefundRecord(record: Omit<SupabaseRefundRecord, 'id'>): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('refund_records').insert(record)
  if (error && !error.message.includes('duplicate')) {
    console.error('[Supabase] insertRefundRecord error:', error.message)
  }
}

/** Fetch all refund records for a wallet, newest first. */
export async function fetchRefundRecords(walletAddress: string): Promise<SupabaseRefundRecord[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('refund_records')
    .select('*')
    .eq('wallet_address', walletAddress)
    .order('claimed_at', { ascending: false })
  if (error) {
    console.error('[Supabase] fetchRefundRecords error:', error.message)
    return []
  }
  return (data ?? []) as SupabaseRefundRecord[]
}
