import { supabase } from "@/lib/supabase"
import { handleAsyncOperation, validatePaymentAmount, validateBankDetails, PaymentError, InvoiceError } from "@/lib/errors/handlers"
import { formatCurrency } from "@/lib/utils"
import type { Payment, Invoice, PaymentMethod, PaymentStatus } from "@/types"

export interface PaymentData {
  amount: number
  payment_method: PaymentMethod
  transaction_reference?: string
  bank_name?: string
  notes?: string
  payment_date?: string
}

export interface PaymentResult {
  payment: Payment
  updatedInvoice: Invoice
  invoiceStatusChanged: boolean
}

/**
 * Get invoice details with current balance and payment totals
 */
export async function getInvoiceDetails(invoiceId: string): Promise<Invoice & { current_paid_amount: number }> {
  return handleAsyncOperation(async () => {
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (invoiceError) throw invoiceError
    if (!invoice) throw new InvoiceError('Invoice not found')

    // Get current total of confirmed payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .eq('invoice_id', invoiceId)
      .eq('status', 'confirmed')

    if (paymentsError) throw paymentsError

    const current_paid_amount = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0

    return {
      ...invoice,
      current_paid_amount,
      // Balance is automatically calculated by the database as a computed column
      balance: invoice.total_amount - current_paid_amount
    }
  }, 'get invoice details')
}

/**
 * Calculate new invoice status based on payment amount
 */
export function calculateInvoiceStatus(totalAmount: number, paidAmount: number): 'pending' | 'partial' | 'paid' {
  if (paidAmount <= 0) return 'pending'
  if (paidAmount >= totalAmount) return 'paid'
  return 'partial'
}

/**
 * Record a new payment with validation and invoice updates
 */
export async function recordPayment(
  invoiceId: string,
  paymentData: PaymentData,
  receivedBy: string
): Promise<PaymentResult> {
  return handleAsyncOperation(async () => {
    // Get current invoice details
    const invoice = await getInvoiceDetails(invoiceId)
    
    // Validate payment amount
    validatePaymentAmount(paymentData.amount, invoice.balance, invoice.current_paid_amount)
    
    // Validate bank details if required
    validateBankDetails(paymentData.payment_method, paymentData.bank_name, paymentData.transaction_reference)

    // Generate payment reference
    const payment_reference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Start transaction
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        payment_reference,
        invoice_id: invoiceId,
        amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
        transaction_reference: paymentData.transaction_reference || null,
        bank_name: paymentData.bank_name || null,
        notes: paymentData.notes || null,
        received_by: receivedBy,
        status: 'pending' as PaymentStatus
      })
      .select()
      .single()

    if (paymentError) throw paymentError

    return {
      payment,
      updatedInvoice: invoice,
      invoiceStatusChanged: false // Status only changes when payment is confirmed
    }
  }, 'record payment')
}

/**
 * Confirm a payment and update invoice status
 */
export async function confirmPayment(
  paymentId: string,
  confirmedBy: string
): Promise<PaymentResult> {
  return handleAsyncOperation(async () => {
    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        invoice:invoices(*)
      `)
      .eq('id', paymentId)
      .single()

    if (paymentError) throw paymentError
    if (!payment) throw new PaymentError('Payment not found')
    if (payment.status === 'confirmed') throw new PaymentError('Payment is already confirmed')

    // Get updated invoice details
    const invoice = await getInvoiceDetails(payment.invoice_id)
    
    // Calculate new paid amount and status after this payment is confirmed
    const newPaidAmount = invoice.current_paid_amount + payment.amount
    const newStatus = calculateInvoiceStatus(invoice.total_amount, newPaidAmount)

    // Update payment status
    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({
        status: 'confirmed',
        confirmed_by: confirmedBy
      })
      .eq('id', paymentId)

    if (updatePaymentError) throw updatePaymentError

    // Update invoice with new paid amount and status
    // Note: balance is automatically calculated by the database, so we don't update it
    const { data: updatedInvoice, error: updateInvoiceError } = await supabase
      .from('invoices')
      .update({
        paid_amount: newPaidAmount,
        status: newStatus
      })
      .eq('id', payment.invoice_id)
      .select()
      .single()

    if (updateInvoiceError) throw updateInvoiceError

    return {
      payment: { ...payment, status: 'confirmed', confirmed_by: confirmedBy },
      updatedInvoice,
      invoiceStatusChanged: invoice.status !== newStatus
    }
  }, 'confirm payment')
}

/**
 * Get all payments for an invoice
 */
export async function getInvoicePayments(invoiceId: string): Promise<Payment[]> {
  return handleAsyncOperation(async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false })

    if (error) throw error
    return data || []
  }, 'get invoice payments')
}

/**
 * Validate multiple payments for an invoice
 */
export async function validateInvoicePayments(invoiceId: string): Promise<{
  isValid: boolean
  totalPayments: number
  invoiceTotal: number
  errors: string[]
}> {
  return handleAsyncOperation(async () => {
    const invoice = await getInvoiceDetails(invoiceId)
    const payments = await getInvoicePayments(invoiceId)
    
    const confirmedPayments = payments.filter(p => p.status === 'confirmed')
    const totalPayments = confirmedPayments.reduce((sum, p) => sum + p.amount, 0)
    
    const errors: string[] = []
    
    if (totalPayments > invoice.total_amount) {
      errors.push(`Total payments (${formatCurrency(totalPayments)}) exceed invoice total (${formatCurrency(invoice.total_amount)})`)
    }
    
    // Check for duplicate transaction references
    const transactionRefs = confirmedPayments
      .filter(p => p.transaction_reference)
      .map(p => p.transaction_reference)
    
    const duplicateRefs = transactionRefs.filter((ref, index) => 
      transactionRefs.indexOf(ref) !== index
    )
    
    if (duplicateRefs.length > 0) {
      errors.push(`Duplicate transaction references found: ${duplicateRefs.join(', ')}`)
    }

    return {
      isValid: errors.length === 0,
      totalPayments,
      invoiceTotal: invoice.total_amount,
      errors
    }
  }, 'validate invoice payments')
}

/**
 * Check if bank details are required for payment method
 */
export function requiresBankDetails(paymentMethod: PaymentMethod): boolean {
  return paymentMethod === 'bank_transfer'
}

/**
 * Get payment statistics
 */
export async function getPaymentStatistics(dateFrom?: string, dateTo?: string) {
  return handleAsyncOperation(async () => {
    let query = supabase
      .from('payments')
      .select('amount, status, payment_date, payment_method')
      .eq('status', 'confirmed')

    if (dateFrom) {
      query = query.gte('payment_date', dateFrom)
    }
    if (dateTo) {
      query = query.lte('payment_date', dateTo)
    }

    const { data, error } = await query

    if (error) throw error

    const payments = data || []
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)
    const totalCount = payments.length
    
    const byMethod = payments.reduce((acc, p) => {
      acc[p.payment_method] = (acc[p.payment_method] || 0) + p.amount
      return acc
    }, {} as Record<string, number>)

    const today = new Date().toISOString().split('T')[0]
    const todayPayments = payments.filter(p => p.payment_date === today)
    const todayAmount = todayPayments.reduce((sum, p) => sum + p.amount, 0)

    return {
      totalAmount,
      totalCount,
      todayAmount,
      todayCount: todayPayments.length,
      byMethod
    }
  }, 'get payment statistics')
}

export default {
  getInvoiceDetails,
  calculateInvoiceStatus,
  recordPayment,
  confirmPayment,
  getInvoicePayments,
  validateInvoicePayments,
  requiresBankDetails,
  getPaymentStatistics
}
