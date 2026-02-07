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
}
