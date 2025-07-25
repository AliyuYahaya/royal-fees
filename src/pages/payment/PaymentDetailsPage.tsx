import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { formatCurrency, formatDate, classLevelToDisplay } from "@/lib/utils"
import { useAuthStore } from "@/store/auth"
import { confirmPayment, validateInvoicePayments } from "@/lib/paymentService"
import { generatePaymentReceiptPDF, printPaymentReceipt } from "@/lib/pdfUtils"
import type { PaymentWithDetails } from "@/types"
import {
  ArrowLeft,
  Download,
  Printer,
  Receipt,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  Building,
  Hash
} from "lucide-react"

export function PaymentDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userRole } = useAuthStore()
  const { toast } = useToast()
  const [payment, setPayment] = useState<PaymentWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [validating, setValidating] = useState(false)

  useEffect(() => {
    if (id) {
      fetchPaymentDetails()
    }
  }, [id])

  const fetchPaymentDetails = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          invoice:invoices(
            *,
            student:students(*),
            academic_session:academic_sessions(*)
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      setPayment(data)
    } catch (error) {
      console.error('Error fetching payment details:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch payment details"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPayment = async () => {
    if (!payment || confirming) return

    try {
      setConfirming(true)

      const { data: currentUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', useAuthStore.getState().user?.email)
        .single()

      if (!currentUser) {
        throw new Error('User not found')
      }

      const result = await confirmPayment(payment.id, currentUser.id)

      await supabase
        .from('activity_logs')
        .insert({
          user_id: currentUser.id,
          activity_type: 'payment_confirmed',
          description: `Payment confirmed: ${formatCurrency(result.payment.amount)}`,
          entity_type: 'payment',
          entity_id: payment.id
        })

      toast({
        title: "Success",
        description: "Payment confirmed successfully"
      })

      fetchPaymentDetails()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to confirm payment"
      })
    } finally {
      setConfirming(false)
    }
  }

  const handleValidateInvoicePayments = async () => {
    if (!payment?.invoice_id || validating) return

    try {
      setValidating(true)
      const validation = await validateInvoicePayments(payment.invoice_id)
      
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
        description: "Failed to validate payments"
      })
    } finally {
      setValidating(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!payment) return
    
    try {
      setDownloading(true)
      await generatePaymentReceiptPDF(payment)
      
      toast({
        title: "Success",
        description: "Payment receipt PDF downloaded successfully"
      })
    } catch (error) {
      console.error('Error generating receipt PDF:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate receipt PDF"
      })
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = () => {
    if (!payment) return
    
    try {
      printPaymentReceipt(payment)
      toast({
        title: "Success",
        description: "Payment receipt sent to printer"
      })
    } catch (error) {
      console.error('Error printing receipt:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to print receipt"
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      reversed: "bg-gray-100 text-gray-800"
    }
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || statusColors.pending}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="grid gap-6 md:grid-cols-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!payment) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <h3 className="text-lg font-medium">Payment not found</h3>
          <p className="text-muted-foreground mb-4">
            The payment you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate('/payments')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Payments
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/payments')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Payments
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Payment {payment.payment_reference}
              </h1>
              <p className="text-muted-foreground">
                {payment.invoice?.student?.first_name} {payment.invoice?.student?.last_name} • {formatCurrency(payment.amount)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Receipt
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
            {payment.status === 'pending' && userRole === 'admin' && (
              <Button
                onClick={handleConfirmPayment}
                disabled={confirming}
              >
                {confirming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Payment
                  </>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleValidateInvoicePayments}
              disabled={validating}
            >
              {validating ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Validating...
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Validate Invoice
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Status and Basic Info */}
        <div className="flex items-center space-x-4">
          {getStatusIcon(payment.status)}
          {getStatusBadge(payment.status)}
          <Badge variant="outline" className="capitalize">
            {payment.payment_method.replace('_', ' ')}
          </Badge>
        </div>

        {/* Payment Details Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Receipt className="h-5 w-5" />
                <span>Payment Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Payment Reference</label>
                  <p className="text-sm font-medium">{payment.payment_reference}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Payment Date</label>
                    <p className="text-sm">{formatDate(payment.payment_date)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Amount</label>
                    <p className="text-sm font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                  <p className="text-sm capitalize">{payment.payment_method.replace('_', ' ')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Hash className="h-5 w-5" />
                <span>Transaction Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Transaction Reference</label>
                  <p className="text-sm">{payment.transaction_reference || 'Not provided'}</p>
                </div>
                {payment.bank_name && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                      <Building className="h-3 w-3" />
                      <span>Bank Name</span>
                    </label>
                    <p className="text-sm">{payment.bank_name}</p>
                  </div>
                )}
                {payment.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                    <p className="text-sm">{payment.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Information */}
        {payment.invoice && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Receipt className="h-5 w-5" />
                <span>Related Invoice</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Invoice Number</label>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">{payment.invoice.invoice_number}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/invoices/${payment.invoice?.id}`)}
                    >
                      View Invoice
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Invoice Status</label>
                  <p className="text-sm">
                    <Badge className={
                      payment.invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                      payment.invoice.status === 'partial' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }>
                      {payment.invoice.status.charAt(0).toUpperCase() + payment.invoice.status.slice(1)}
                    </Badge>
                  </p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground">Invoice Total</p>
                  <p className="text-lg font-bold">{formatCurrency(payment.invoice.total_amount)}</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground">Total Paid</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(payment.invoice.paid_amount)}</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                  <p className={`text-lg font-bold ${payment.invoice.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(payment.invoice.balance)}
                  </p>
                </div>
              </div>
              {payment.status === 'confirmed' && payment.invoice.balance === 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div className="text-sm text-green-800">
                      <p className="font-medium">Invoice Fully Paid</p>
                      <p>This payment completed the invoice. Invoice status has been automatically updated to 'paid'.</p>
                    </div>
                  </div>
                </div>
              )}
              {payment.status === 'confirmed' && payment.invoice.balance > 0 && payment.invoice.status === 'partial' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Partial Payment Confirmed</p>
                      <p>Invoice status has been automatically updated to 'partial'. Outstanding balance: {formatCurrency(payment.invoice.balance)}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Student Information */}
        {payment.invoice?.student && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Student Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Student Name</label>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">
                      {payment.invoice.student.first_name} {payment.invoice.student.last_name}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/students/${payment.invoice?.student?.id}`)}
                    >
                      View Profile
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Student ID</label>
                  <p className="text-sm">{payment.invoice.student.student_id}</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Class Level</label>
                  <p className="text-sm">{classLevelToDisplay(payment.invoice.student.class_level)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Parent/Guardian</label>
                  <p className="text-sm">{payment.invoice.student.parent_guardian_name || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
