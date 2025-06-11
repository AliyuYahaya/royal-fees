import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useAuthStore } from "@/store/auth"
import { handleAsyncOperation, ValidationError } from "@/lib/errors/handlers"
import { 
  recordPayment, 
  confirmPayment, 
  requiresBankDetails,
  getPaymentStatistics,
  validateInvoicePayments
} from "@/lib/paymentService"
import type { PaymentWithDetails, PaymentMethod } from "@/types"
import {
  Search,
  Plus,
  Filter,
  Eye,
  Banknote,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  AlertTriangle,
  Building,
  Hash,
  Download
} from "lucide-react"

// Component for selecting invoices with enhanced validation
function PaymentInvoiceSelector({ 
  value, 
  onChange, 
  onInvoiceSelect 
}: { 
  value: string; 
  onChange: (value: string) => void;
  onInvoiceSelect: (invoice: any) => void;
}) {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true)
      try {
        await handleAsyncOperation(async () => {
          const { data } = await supabase
            .from('invoices')
            .select(`
              id,
              invoice_number,
              total_amount,
              paid_amount,
              balance,
              status,
              student:students(student_id, first_name, last_name, class_level)
            `)
            .gt('balance', 0)
            .in('status', ['pending', 'partial'])
            .order('generated_at', { ascending: false })

          setInvoices(data || [])
        }, 'fetch invoices for payment')
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch invoices: " + (error instanceof Error ? error.message : 'Unknown error')
        })
      } finally {
        setLoading(false)
      }
    }

    fetchInvoices()
  }, [toast])

  const handleInvoiceChange = (invoiceId: string) => {
    onChange(invoiceId)
    const selectedInvoice = invoices.find(inv => inv.id === invoiceId)
    if (selectedInvoice) {
      onInvoiceSelect(selectedInvoice)
    }
  }

  return (
    <Select value={value} onValueChange={handleInvoiceChange} disabled={loading}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? "Loading invoices..." : "Select an invoice"} />
      </SelectTrigger>
      <SelectContent>
        {invoices.map((invoice) => (
          <SelectItem key={invoice.id} value={invoice.id}>
            <div className="flex flex-col">
              <span className="font-medium">
                {invoice.invoice_number} - {invoice.student?.first_name} {invoice.student?.last_name}
              </span>
              <span className="text-xs text-muted-foreground">
                Balance: {formatCurrency(invoice.balance)} | Status: {invoice.status}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function PaymentsPage() {
  const navigate = useNavigate()
  const { userRole, user } = useAuthStore()
  const { toast } = useToast()
  const [payments, setPayments] = useState<PaymentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [methodFilter, setMethodFilter] = useState<string>("all")
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<string>("")
  const [selectedInvoiceData, setSelectedInvoiceData] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [statistics, setStatistics] = useState<any>({})
  const [downloading, setDownloading] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'cash' as PaymentMethod,
    transaction_reference: '',
    bank_name: '',
    notes: ''
  })

  useEffect(() => {
    fetchPayments()
    fetchStatistics()
  }, [searchTerm, statusFilter, methodFilter])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      await handleAsyncOperation(async () => {
        let query = supabase
          .from('payments')
          .select(`
            *,
            invoice:invoices(
              id,
              invoice_number,
              total_amount,
              paid_amount,
              balance,
              status,
              student:students(
                student_id,
                first_name,
                last_name,
                class_level
              )
            )
          `)
          .order('created_at', { ascending: false })

        // Apply filters
        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter)
        }

        if (methodFilter !== 'all') {
          query = query.eq('payment_method', methodFilter)
        }

        if (searchTerm) {
          query = query.ilike('payment_reference', `%${searchTerm}%`)
        }

        const { data, error } = await query

        if (error) throw error

        setPayments(data || [])
      }, 'fetch payments')
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch payments: " + (error instanceof Error ? error.message : 'Unknown error')
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      const stats = await getPaymentStatistics()
      setStatistics(stats)
    } catch (error) {
      console.error('Error fetching statistics:', error)
    }
  }

  const resetForm = () => {
    setPaymentForm({
      amount: '',
      payment_method: 'cash',
      transaction_reference: '',
      bank_name: '',
      notes: ''
    })
    setSelectedInvoice('')
    setSelectedInvoiceData(null)
  }

  const handleAddPayment = async () => {
    if (submitting) return

    try {
      setSubmitting(true)

      if (!selectedInvoice || !paymentForm.amount) {
        throw new ValidationError('Please select an invoice and enter amount')
      }

      // Get current user
      const { data: currentUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', user?.email)
        .single()

      if (!currentUser) {
        throw new Error('User not found')
      }

      // Record the payment
      const result = await recordPayment(
        selectedInvoice,
        {
          amount: parseFloat(paymentForm.amount),
          payment_method: paymentForm.payment_method,
          transaction_reference: paymentForm.transaction_reference,
          bank_name: paymentForm.bank_name,
          notes: paymentForm.notes
        },
        currentUser.id
      )

      // Log activity
      await supabase
        .from('activity_logs')
        .insert({
          user_id: currentUser.id,
          activity_type: 'payment_received',
          description: `Payment recorded: ${formatCurrency(result.payment.amount)} via ${result.payment.payment_method}`,
          entity_type: 'payment',
          entity_id: result.payment.id
        })

      toast({
        title: "Success",
        description: `Payment recorded successfully. ${requiresBankDetails(paymentForm.payment_method) ? 'Bank details saved.' : ''}`
      })

      setShowAddPayment(false)
      resetForm()
      fetchPayments()
      fetchStatistics()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to record payment'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmPayment = async (paymentId: string) => {
    if (confirming === paymentId) return

    try {
      setConfirming(paymentId)

      // Get current user
      const { data: currentUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', user?.email)
        .single()

      if (!currentUser) {
        throw new Error('User not found')
      }

      // Confirm the payment
      const result = await confirmPayment(paymentId, currentUser.id)

      // Log activity
      await supabase
        .from('activity_logs')
        .insert({
          user_id: currentUser.id,
          activity_type: 'payment_confirmed',
          description: `Payment confirmed: ${formatCurrency(result.payment.amount)}${result.invoiceStatusChanged ? ` - Invoice status updated to ${result.updatedInvoice.status}` : ''}`,
          entity_type: 'payment',
          entity_id: paymentId
        })

      toast({
        title: "Success",
        description: `Payment confirmed successfully.${result.invoiceStatusChanged ? ` Invoice is now ${result.updatedInvoice.status}.` : ''}`
      })

      fetchPayments()
      fetchStatistics()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to confirm payment'
      })
    } finally {
      setConfirming(null)
    }
  }

  const handleValidateInvoicePayments = async (invoiceId: string) => {
    try {
      const validation = await validateInvoicePayments(invoiceId)
      
      if (validation.isValid) {
        toast({
          title: "Validation Successful",
          description: "All payments for this invoice are valid"
        })
      } else {
        toast({
          variant: "destructive", 
          title: "Validation Issues",
          description: validation.errors.join('; ')
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to validate payments'
      })
    }
  }

  // Mark function as used to avoid TS error
  if (false) console.log(handleValidateInvoicePayments)

  const handleDownloadPayments = async () => {
    if (downloading) return

    try {
      setDownloading(true)
      
      // Generate CSV content
      const csvContent = generatePaymentsCSV(payments)
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `payments-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast({
        title: "Success",
        description: "Payments exported successfully"
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to export payments"
      })
    } finally {
      setDownloading(false)
    }
  }

  const generatePaymentsCSV = (payments: PaymentWithDetails[]): string => {
    const headers = [
      'Payment Reference',
      'Invoice Number',
      'Student Name',
      'Student ID',
      'Amount',
      'Payment Method',
      'Transaction Reference',
      'Bank Name',
      'Status',
      'Payment Date',
      'Notes'
    ]

    const rows = payments.map(payment => [
      payment.payment_reference,
      payment.invoice?.invoice_number || '',
      `${payment.invoice?.student?.first_name || ''} ${payment.invoice?.student?.last_name || ''}`.trim(),
      payment.invoice?.student?.student_id || '',
      payment.amount.toString(),
      payment.payment_method.replace('_', ' '),
      payment.transaction_reference || '',
      payment.bank_name || '',
      payment.status,
      formatDate(payment.payment_date),
      payment.notes || ''
    ])

    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')
  }

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: { bg: "bg-yellow-100 text-yellow-800", icon: Clock },
      confirmed: { bg: "bg-green-100 text-green-800", icon: CheckCircle },
      failed: { bg: "bg-red-100 text-red-800", icon: XCircle },
      reversed: { bg: "bg-gray-100 text-gray-800", icon: XCircle }
    }
    
    const style = statusStyles[status as keyof typeof statusStyles]
    const Icon = style?.icon || Clock
    
    return (
      <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${style?.bg}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  // Check if bank details are required and validate form
  const bankDetailsRequired = requiresBankDetails(paymentForm.payment_method)
  const formValid = selectedInvoice && 
                   paymentForm.amount && 
                   parseFloat(paymentForm.amount) > 0 &&
                   (!bankDetailsRequired || (paymentForm.bank_name && paymentForm.transaction_reference))

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
            <p className="text-muted-foreground">
              Record and manage student fee payments with enhanced validation
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={handleDownloadPayments}
              disabled={downloading || payments.length === 0}
            >
              {downloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </>
              )}
            </Button>
            <Button onClick={() => setShowAddPayment(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                {statistics.totalAmount ? formatCurrency(statistics.totalAmount) : 'N/A'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Payments</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.todayCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                {statistics.todayAmount ? formatCurrency(statistics.todayAmount) : 'N/A'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {payments.filter(p => p.status === 'pending').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting confirmation
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {payments.filter(p => p.status === 'confirmed').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Successfully processed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Add Payment Modal */}
        {showAddPayment && (
          <Card>
            <CardHeader>
              <CardTitle>Record New Payment</CardTitle>
              <CardDescription>
                Enter payment details for a student invoice
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Select Invoice</Label>
                  <PaymentInvoiceSelector 
                    value={selectedInvoice}
                    onChange={setSelectedInvoice}
                    onInvoiceSelect={setSelectedInvoiceData}
                  />
                  {selectedInvoiceData && (
                    <div className="text-xs p-2 bg-muted rounded">
                      <p><strong>Student:</strong> {selectedInvoiceData.student?.first_name} {selectedInvoiceData.student?.last_name}</p>
                      <p><strong>Total:</strong> {formatCurrency(selectedInvoiceData.total_amount)}</p>
                      <p><strong>Paid:</strong> {formatCurrency(selectedInvoiceData.paid_amount)}</p>
                      <p><strong>Balance:</strong> {formatCurrency(selectedInvoiceData.balance)}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount * {selectedInvoiceData && `(Max: ${formatCurrency(selectedInvoiceData.balance)})`}</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    max={selectedInvoiceData?.balance}
                    placeholder="Enter amount"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  />
                  {selectedInvoiceData && paymentForm.amount && parseFloat(paymentForm.amount) > selectedInvoiceData.balance && (
                    <p className="text-xs text-red-600 flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Amount exceeds invoice balance
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Payment Method *</Label>
                  <Select 
                    value={paymentForm.payment_method} 
                    onValueChange={(value) => setPaymentForm(prev => ({ 
                      ...prev, 
                      payment_method: value as PaymentMethod,
                      // Clear bank details if not bank transfer
                      bank_name: value === 'bank_transfer' ? prev.bank_name : '',
                      transaction_reference: value === 'bank_transfer' ? prev.transaction_reference : ''
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="pos">POS</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="online">Online Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transaction_reference">
                    Transaction Reference {bankDetailsRequired && '*'}
                  </Label>
                  <Input
                    id="transaction_reference"
                    placeholder={bankDetailsRequired ? "Required for bank transfer" : "Enter reference number"}
                    value={paymentForm.transaction_reference}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, transaction_reference: e.target.value }))}
                    disabled={!bankDetailsRequired && paymentForm.payment_method !== 'online' && paymentForm.payment_method !== 'pos'}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bank_name" className="flex items-center space-x-1">
                    <Building className="h-3 w-3" />
                    <span>Bank Name {bankDetailsRequired && '*'}</span>
                  </Label>
                  <Input
                    id="bank_name"
                    placeholder={bankDetailsRequired ? "Required for bank transfer" : "Enter bank name"}
                    value={paymentForm.bank_name}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, bank_name: e.target.value }))}
                    disabled={!bankDetailsRequired}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Additional notes"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>

              {bankDetailsRequired && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Building className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Bank Transfer Payment</p>
                      <p>Bank name and transaction reference are required for bank transfer payments.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => { setShowAddPayment(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddPayment} 
                  disabled={!formValid || submitting}
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Recording...
                    </>
                  ) : (
                    'Record Payment'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by reference..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="reversed">Reversed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Method</label>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="pos">POS</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Results</label>
                <div className="px-3 py-2 bg-muted rounded-md text-sm">
                  {payments.length} payment{payments.length !== 1 ? 's' : ''} found
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Payments List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Banknote className="h-5 w-5" />
              <span>Payment History</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="w-16 h-12 bg-gray-200 rounded animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8">
                <Banknote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No payments found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' || methodFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'No payments have been recorded yet'
                  }
                </p>
                <Button 
                  className="mt-4" 
                  onClick={() => setShowAddPayment(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Record First Payment
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div 
                    key={payment.id} 
                    className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="w-16 h-12 bg-primary/10 rounded flex items-center justify-center">
                      <Banknote className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="font-medium">{payment.payment_reference}</h3>
                        {getStatusBadge(payment.status)}
                        <span className="text-xs px-2 py-1 bg-muted rounded-full capitalize">
                          {payment.payment_method.replace('_', ' ')}
                        </span>
                        {payment.payment_method === 'bank_transfer' && payment.bank_name && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full flex items-center">
                            <Building className="h-3 w-3 mr-1" />
                            {payment.bank_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>
                          {payment.invoice?.student?.first_name} {payment.invoice?.student?.last_name}
                        </span>
                        <span>•</span>
                        <span>{payment.invoice?.invoice_number}</span>
                        <span>•</span>
                        <span>{formatDate(payment.payment_date)}</span>
                        {payment.transaction_reference && (
                          <>
                            <span>•</span>
                            <span className="flex items-center">
                              <Hash className="h-3 w-3 mr-1" />
                              {payment.transaction_reference}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm mt-1">
                        <span className="font-medium text-green-600">
                          {formatCurrency(payment.amount)}
                        </span>
                        <span className="text-muted-foreground">
                          Invoice Balance: {formatCurrency(payment.invoice?.balance || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/payments/${payment.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {payment.status === 'pending' && userRole === 'admin' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleConfirmPayment(payment.id)}
                          disabled={confirming === payment.id}
                        >
                          {confirming === payment.id ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
