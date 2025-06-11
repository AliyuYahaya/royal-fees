import { PostgrestError } from "@supabase/supabase-js"

export interface ApiError {
  code: string
  message: string
  details?: any
}

export class PaymentError extends Error {
  constructor(
    message: string, 
    public code: string = 'PAYMENT_ERROR',
    public details?: any
  ) {
    super(message)
    this.name = 'PaymentError'
  }
}

export class InvoiceError extends Error {
  constructor(
    message: string, 
    public code: string = 'INVOICE_ERROR',
    public details?: any
  ) {
    super(message)
    this.name = 'InvoiceError'
  }
}

export class ValidationError extends Error {
  constructor(
    message: string, 
    public field?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Convert Supabase errors to user-friendly messages
 */
export function formatSupabaseError(error: PostgrestError): ApiError {
  const errorMap: { [key: string]: string } = {
    '23505': 'This record already exists',
    '23503': 'Related record not found',
    '42P01': 'Database table not found',
    'PGRST116': 'Record not found',
    'PGRST301': 'Row level security violation'
  }

  return {
    code: error.code || 'UNKNOWN_ERROR',
    message: errorMap[error.code || ''] || error.message || 'An unexpected error occurred',
    details: error.details
  }
}

/**
 * Validate payment amount against invoice balance
 */
export function validatePaymentAmount(amount: number, invoiceBalance: number, existingPayments: number = 0): void {
  if (amount <= 0) {
    throw new ValidationError('Payment amount must be greater than zero', 'amount')
  }

  if (amount > invoiceBalance) {
    throw new ValidationError(
      `Payment amount (${amount}) cannot exceed invoice balance (${invoiceBalance})`,
      'amount'
    )
  }

  const totalPayments = existingPayments + amount
  if (totalPayments > invoiceBalance + existingPayments) {
    throw new ValidationError(
      'Total payments cannot exceed invoice total amount',
      'amount'
    )
  }
}

/**
 * Validate bank details requirement based on payment method
 */
export function validateBankDetails(paymentMethod: string, bankName?: string, transactionRef?: string): void {
  if (paymentMethod === 'bank_transfer') {
    if (!bankName || bankName.trim() === '') {
      throw new ValidationError(
        'Bank name is required for bank transfer payments',
        'bank_name'
      )
    }
    
    if (!transactionRef || transactionRef.trim() === '') {
      throw new ValidationError(
        'Transaction reference is required for bank transfer payments',
        'transaction_reference'
      )
    }
  }
}

/**
 * Handle async operations with proper error handling
 */
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  errorContext?: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    console.error(`Error in ${errorContext || 'operation'}:`, error)
    
    if (error instanceof PaymentError || error instanceof InvoiceError || error instanceof ValidationError) {
      throw error
    }
    
    if (error && typeof error === 'object' && 'code' in error) {
      const formattedError = formatSupabaseError(error as PostgrestError)
      throw new Error(formattedError.message)
    }
    
    throw new Error(error instanceof Error ? error.message : 'An unexpected error occurred')
  }
}

/**
 * Retry async operations with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      if (attempt === maxRetries) {
        break
      }

      // Don't retry validation errors or user errors
      if (error instanceof ValidationError || error instanceof PaymentError) {
        throw error
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

export default {
  PaymentError,
  InvoiceError,
  ValidationError,
  formatSupabaseError,
  validatePaymentAmount,
  validateBankDetails,
  handleAsyncOperation,
  retryOperation
}
