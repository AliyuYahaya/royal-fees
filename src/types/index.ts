// Re-export all types from database
export * from './database'

// Import specific types for use in interfaces
import type { ClassLevel, SchoolTerm } from './database'

// Additional UI-specific interfaces that extend the base types
export interface FeeStructureWithDetails {
  id: string
  academic_session_id: string
  class_level: ClassLevel
  fee_category_id: string
  amount: number
  term: SchoolTerm | null
  is_active: boolean
  created_at: string
  created_by: string | null
  fee_category?: { 
    name: string 
    id: string
  }
  academic_session?: { 
    session_name: string 
    id: string
  }
}

export interface DashboardStats {
  total_students: number
  active_students: number
  total_revenue: number
  pending_fees: number
  payments_today: number
  overdue_invoices: number
}

export interface ClassSummary {
  class_level: string
  student_count: number
  total_fees: number
  paid_amount: number
  outstanding: number
  collection_rate: number
}

export interface RecentActivity {
  id: string
  type: string
  description: string
  user_name: string
  created_at: string
}

export interface PaymentMethodStats {
  method: string
  count: number
  amount: number
}

export interface ClassLevelStats {
  class_level: string
  student_count: number
  total_fees: number
  paid_amount: number
}
