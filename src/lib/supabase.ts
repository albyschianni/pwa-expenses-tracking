import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nbxxjddsypresmywigbz.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ieHhqZGRzeXByZXNteXdpZ2J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzIwNzIsImV4cCI6MjA4NjA0ODA3Mn0.AnCgmljdebRqPZhZfOQ-NSs4Gav-19LJIFcVbKYHncU'

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
