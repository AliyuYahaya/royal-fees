import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { formatCurrency, formatDate, classLevelToDisplay } from "@/lib/utils"
import { generateInvoicePDF, printInvoice } from "@/lib/pdfUtils"
import type { InvoiceWithDetails } from "@/types"
import {
  ArrowLeft,
  Download,
  Printer,
  Receipt,
  User,
  Calendar,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react"

export function InvoiceDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (id) {
      fetchInvoiceDetails()
    }
  }, [id])

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          student:students(*),
          academic_session:academic_sessions(*),
          payments(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      setInvoice(data)
    } catch (error) {
      console.error('Error fetching invoice details:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch invoice details"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!invoice) return
    
    try {
      setDownloading(true)
      await generateInvoicePDF(invoice)
      
      toast({
        title: "Success",
        description: "Invoice PDF downloaded successfully"
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate PDF"
      })
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = () => {
    if (!invoice) return
    
    try {
      printInvoice(invoice)
      toast({
        title: "Success",
        description: "Invoice sent to printer"
      })
    } catch (error) {
      console.error('Error printing invoice:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to print invoice"
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800",
      partial: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800"
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

  if (!invoice) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <h3 className="text-lg font-medium">Invoice not found</h3>
          <p className="text-muted-foreground mb-4">
            The invoice you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate('/invoices')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
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
              onClick={() => navigate('/invoices')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Invoices
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Invoice {invoice.invoice_number}
              </h1>
              <p className="text-muted-foreground">
                {invoice.student?.first_name} {invoice.student?.last_name} • {classLevelToDisplay(invoice.student?.class_level || '')}
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
                  Download PDF
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Status and Basic Info */}
        <div className="flex items-center space-x-4">
          {getStatusIcon(invoice.status)}
          {getStatusBadge(invoice.status)}
          {invoice.term && (
            <Badge variant="outline">
              {invoice.term.split('_').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')}
            </Badge>
          )}
        </div>

        {/* Invoice Details Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Invoice Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Receipt className="h-5 w-5" />
                <span>Invoice Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Invoice Number</label>
                  <p className="text-sm font-medium">{invoice.invoice_number}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Generated Date</label>
                    <p className="text-sm">{formatDate(invoice.generated_at)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Due Date</label>
                    <p className="text-sm">{invoice.due_date ? formatDate(invoice.due_date) : 'Not set'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Academic Session</label>
                  <p className="text-sm">{invoice.academic_session?.session_name || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Student Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Student Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Student Name</label>
                  <p className="text-sm font-medium">
                    {invoice.student?.first_name} {invoice.student?.last_name}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Student ID</label>
                    <p className="text-sm">{invoice.student?.student_id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Class Level</label>
                    <p className="text-sm">{classLevelToDisplay(invoice.student?.class_level || '')}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Parent/Guardian</label>
                  <p className="text-sm">{invoice.student?.parent_guardian_name || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Financial Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(invoice.total_amount)}</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Amount Paid</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(invoice.paid_amount)}</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                <p className={`text-2xl font-bold ${invoice.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(invoice.balance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Payment History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoice.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Receipt className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{payment.payment_reference}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(payment.payment_date)} • {payment.payment_method.replace('_', ' ').toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">{formatCurrency(payment.amount)}</p>
                      <Badge className={payment.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
