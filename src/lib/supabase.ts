import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for TypeScript
export interface DbExpense {
  id: string
  user_id: string
  description: string
  amount: number
  date: string
  category_id: string
  transaction_type: 'expense' | 'income' | null
  shared_wallet_id: string | null
  created_at: string
  updated_at: string
  source?: string
  reviewed?: boolean
}

export interface DbCategory {
  id: string
  label: string
  icon: string
  color: string
  user_id: string | null
  is_default: boolean
  sort_order: number
  is_active: boolean
  transaction_type: 'expense' | 'income'
}

export interface DbSharedWallet {
  id: string
  name: string
  created_by: string
  currency: string
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface DbSharedWalletMember {
  id: string
  wallet_id: string
  user_id: string
  role: 'owner' | 'member'
  is_active: boolean
  joined_at: string
}

export interface DbPushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
}

export interface DbWalletInvitation {
  id: string
  wallet_id: string
  invited_by: string
  invited_user_id: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  updated_at: string
}

export interface DbBankConnection {
  id: string
  user_id: string
  institution_name: string
  institution_country: string
  session_id: string | null
  account_ids: string[] | null
  status: 'pending' | 'active' | 'expired' | 'error'
  consent_expires_at: string | null
  last_sync_at: string | null
  created_at: string
  updated_at: string
}

export interface DbBankTransaction {
  id: string
  connection_id: string
  external_id: string | null
  booking_date: string | null
  value_date: string | null
  amount: number
  currency: string
  description: string | null
  counterpart_name: string | null
  counterpart_iban: string | null
  merchant_category_code: string | null
  credit_debit_indicator: 'CRDT' | 'DBIT' | null
  status: string
  category_id: string | null
  categorization_source: string | null
  reviewed: boolean
  is_internal_transfer: boolean
  created_at: string
}

export interface DbRecurringExpense {
  id: string
  user_id: string
  description: string
  amount: number
  category_id: string
  day_of_month: number
  enabled: boolean
  last_generated_date: string | null
  transaction_type: 'expense' | 'income' | null
  shared_wallet_id: string | null
  created_at: string
  updated_at: string
}
