import { Database } from './database'
import type {
  UserRole,
  UserStatus,
  ClassLevel,
  Gender,
  PaymentTermType,
  SchoolTerm,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  ExamType,
  ActivityType
} from './database'

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

export type Student = Tables<'students'>
export type User = Tables<'users'>
export type Invoice = Tables<'invoices'>
export type Payment = Tables<'payments'>
export type FeeCategory = Tables<'fee_categories'>
export type FeeStructure = Tables<'fee_structures'>
export type AcademicSession = Tables<'academic_sessions'>
export type ActivityLog = Tables<'activity_logs'>

// Extended interfaces with all the properties that are being accessed in the components
export interface StudentWithInvoices extends Student {
  invoices?: Invoice[]
  total_outstanding?: number
  last_payment_date?: string
}

export interface StudentWithDetails {
  id: string
  student_id: string
  first_name: string
  last_name: string
  middle_name?: string | null
  class_level: ClassLevel
  gender: Gender
  date_of_birth?: string | null
  parent_guardian_name?: string | null
  parent_guardian_phone?: string | null
  parent_guardian_email?: string | null
  address?: string | null
  payment_term: PaymentTermType
  admission_date: string
  is_active: boolean
  created_at: string
  updated_at: string
  created_by?: string | null
  updated_by?: string | null
}

export interface InvoiceWithDetails extends Invoice {
  student?: Student
  academic_session?: AcademicSession
  payments?: Payment[]
}

export interface InvoiceWithStudent extends Invoice {
  student?: Student
  payments?: Payment[]
}

export interface PaymentWithDetails extends Payment {
  invoice?: Invoice & {
    student?: Student
  }
  student?: Student
}

export interface PaymentWithInvoice extends Payment {
  invoice?: Invoice
  student?: Student
}

export interface FeeStructureWithDetails extends FeeStructure {
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

// Re-export all the database types and enums for easier access
export type {
  UserRole,
  UserStatus,
  ClassLevel,
  Gender,
  PaymentTermType,
  SchoolTerm,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  ExamType,
  ActivityType
} from './database'
