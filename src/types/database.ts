export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'registrar' | 'payment_desk_officer'
export type UserStatus = 'active' | 'inactive' | 'suspended'
export type ClassLevel = 
  | 'pre_creche' | 'nursery_1' | 'nursery_2'
  | 'primary_1' | 'primary_2' | 'primary_3' | 'primary_4' | 'primary_5' | 'primary_6'
  | 'jss_1' | 'jss_2' | 'jss_3'
  | 'sss_1' | 'sss_2' | 'sss_3'

export type Gender = 'male' | 'female'
export type PaymentTermType = 'per_annum' | 'per_term'
export type SchoolTerm = 'first_term' | 'second_term' | 'third_term'
export type InvoiceStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'
export type PaymentMethod = 'cash' | 'bank_transfer' | 'pos' | 'cheque' | 'online'
export type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'reversed'
export type ExamType = 'neco' | 'waec' | 'jss3_exam' | 'primary6_exam'
export type ActivityType = 
  | 'student_added' | 'student_updated' | 'student_deleted'
  | 'invoice_generated' | 'invoice_printed' | 'payment_received'
  | 'payment_confirmed' | 'user_login' | 'fee_structure_updated'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          email: string
          password_hash: string
          first_name: string
          last_name: string
          role: UserRole
          status: UserStatus
          created_at: string
          updated_at: string
          last_login: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          username: string
          email: string
          password_hash: string
          first_name: string
          last_name: string
          role: UserRole
          status?: UserStatus
          created_at?: string
          updated_at?: string
          last_login?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          username?: string
          email?: string
          password_hash?: string
          first_name?: string
          last_name?: string
          role?: UserRole
          status?: UserStatus
          created_at?: string
          updated_at?: string
          last_login?: string | null
          created_by?: string | null
        }
      }
      students: {
        Row: {
          id: string
          student_id: string
          first_name: string
          last_name: string
          middle_name: string | null
          class_level: ClassLevel
          gender: Gender
          date_of_birth: string | null
          parent_guardian_name: string | null
          parent_guardian_phone: string | null
          parent_guardian_email: string | null
          address: string | null
          payment_term: PaymentTermType
          admission_date: string
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
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
          payment_term?: PaymentTermType
          admission_date?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          first_name?: string
          last_name?: string
          middle_name?: string | null
          class_level?: ClassLevel
          gender?: Gender
          date_of_birth?: string | null
          parent_guardian_name?: string | null
          parent_guardian_phone?: string | null
          parent_guardian_email?: string | null
          address?: string | null
          payment_term?: PaymentTermType
          admission_date?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      academic_sessions: {
        Row: {
          id: string
          session_name: string
          start_date: string
          end_date: string
          is_current: boolean
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          session_name: string
          start_date: string
          end_date: string
          is_current?: boolean
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          session_name?: string
          start_date?: string
          end_date?: string
          is_current?: boolean
          created_at?: string
          created_by?: string | null
        }
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          student_id: string
          academic_session_id: string
          term: SchoolTerm | null
          total_amount: number
          paid_amount: number
          balance: number
          status: InvoiceStatus
          due_date: string | null
          generated_at: string
          generated_by: string | null
        }
        Insert: {
          id?: string
          invoice_number: string
          student_id: string
          academic_session_id: string
          term?: SchoolTerm | null
          total_amount: number
          paid_amount?: number
          // balance is computed, cannot be inserted
          status?: InvoiceStatus
          due_date?: string | null
          generated_at?: string
          generated_by?: string | null
        }
        Update: {
          id?: string
          invoice_number?: string
          student_id?: string
          academic_session_id?: string
          term?: SchoolTerm | null
          total_amount?: number
          paid_amount?: number
          // balance is computed, cannot be updated
          status?: InvoiceStatus
          due_date?: string | null
          generated_at?: string
          generated_by?: string | null
        }
      }
      payments: {
        Row: {
          id: string
          payment_reference: string
          invoice_id: string
          amount: number
          payment_method: PaymentMethod
          payment_date: string
          transaction_reference: string | null
          bank_name: string | null
          status: PaymentStatus
          notes: string | null
          received_by: string | null
          confirmed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          payment_reference: string
          invoice_id: string
          amount: number
          payment_method: PaymentMethod
          payment_date?: string
          transaction_reference?: string | null
          bank_name?: string | null
          status?: PaymentStatus
          notes?: string | null
          received_by?: string | null
          confirmed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          payment_reference?: string
          invoice_id?: string
          amount?: number
          payment_method?: PaymentMethod
          payment_date?: string
          transaction_reference?: string | null
          bank_name?: string | null
          status?: PaymentStatus
          notes?: string | null
          received_by?: string | null
          confirmed_by?: string | null
          created_at?: string
        }
      }
      fee_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          created_by?: string | null
        }
      }
      fee_structures: {
        Row: {
          id: string
          academic_session_id: string
          class_level: ClassLevel
          fee_category_id: string
          amount: number
          term: SchoolTerm | null
          is_active: boolean
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          academic_session_id: string
          class_level: ClassLevel
          fee_category_id: string
          amount: number
          term?: SchoolTerm | null
          is_active?: boolean
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          academic_session_id?: string
          class_level?: ClassLevel
          fee_category_id?: string
          amount?: number
          term?: SchoolTerm | null
          is_active?: boolean
          created_at?: string
          created_by?: string | null
        }
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string | null
          activity_type: ActivityType
          description: string
          entity_type: string | null
          entity_id: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          activity_type: ActivityType
          description: string
          entity_type?: string | null
          entity_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          activity_type?: ActivityType
          description?: string
          entity_type?: string | null
          entity_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      user_status: UserStatus
      class_level: ClassLevel
      gender: Gender
      payment_term_type: PaymentTermType
      school_term: SchoolTerm
      invoice_status: InvoiceStatus
      payment_method: PaymentMethod
      payment_status: PaymentStatus
      exam_type: ExamType
      activity_type: ActivityType
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Additional type definitions for application use
export type Student = Database['public']['Tables']['students']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type AcademicSession = Database['public']['Tables']['academic_sessions']['Row']
export type FeeCategory = Database['public']['Tables']['fee_categories']['Row']
export type FeeStructure = Database['public']['Tables']['fee_structures']['Row']
export type ActivityLog = Database['public']['Tables']['activity_logs']['Row']

// Extended types for UI components with all required properties
export interface StudentWithInvoices {
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
  invoices?: Invoice[]
  totalFees?: number
  totalPaid?: number
  balance?: number
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

export interface InvoiceWithDetails {
  id: string
  invoice_number: string
  student_id: string
  academic_session_id: string
  term?: SchoolTerm | null
  total_amount: number
  paid_amount: number
  balance: number
  status: InvoiceStatus
  due_date?: string | null
  generated_at: string
  generated_by?: string | null
  student?: Student
  academic_session?: AcademicSession
  payments?: Payment[]
}

export interface PaymentWithDetails {
  id: string
  payment_reference: string
  invoice_id: string
  amount: number
  payment_method: PaymentMethod
  payment_date: string
  transaction_reference?: string | null
  bank_name?: string | null
  status: PaymentStatus
  notes?: string | null
  received_by?: string | null
  confirmed_by?: string | null
  created_at: string
  invoice?: Invoice & {
    student?: Student
  }
  student?: Student
}
