import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { formatCurrency, formatDate, classLevelToDisplay } from "@/lib/utils"
import { useAuthStore } from "@/store/auth"
import type { InvoiceWithDetails } from "@/types"
import {
  Search,
  Plus,
  Filter,
  Eye,
  Printer,
  Download,
  Receipt,
  Calendar,
  CreditCard
} from "lucide-react"

export function InvoicesPage() {
  const navigate = useNavigate()
  const { userRole } = useAuthStore()
  const { toast } = useToast()
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [termFilter, setTermFilter] = useState<string>("all")
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    fetchInvoices()
  }, [searchTerm, statusFilter, termFilter])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('invoices')
        .select(`
          *,
          student:students(
            id,
            student_id,
            first_name,
            last_name,
            class_level,
            parent_guardian_name
          ),
          academic_session:academic_sessions(
            id,
            session_name
          )
        `, { count: 'exact' })
        .order('generated_at', { ascending: false })

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (termFilter !== 'all') {
        query = query.eq('term', termFilter)
      }

      if (searchTerm) {
        // This is a simplified search - in a real app you'd need a more complex query
        query = query.ilike('invoice_number', `%${searchTerm}%`)
      }

      const { data, error, count } = await query

      if (error) throw error

      setInvoices(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error fetching invoices:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch invoices"
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePrintInvoice = async (invoiceId: string) => {
    try {
      // In a real app, this would generate a PDF or open a print dialog
      toast({
        title: "Print Invoice",
        description: "Invoice sent to printer (demo)"
      })
      
      // Log the print activity
      const { data: currentUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', useAuthStore.getState().user?.email)
        .single()

      if (currentUser) {
        await supabase
          .from('activity_logs')
          .insert({
            user_id: currentUser.id,
            activity_type: 'invoice_printed',
            description: `Invoice printed: ${invoiceId}`,
            entity_type: 'invoice',
            entity_id: invoiceId
          })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to print invoice"
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: "bg-yellow-100 text-yellow-800",
      partial: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800"
    }
    
    return (
      <span className={`text-xs px-2 py-1 rounded-full ${statusStyles[status as keyof typeof statusStyles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {userRole === 'payment_desk_officer' ? 'Invoices' : 'Invoice Management'}
            </h1>
            <p className="text-muted-foreground">
              {userRole === 'payment_desk_officer' 
                ? 'Search and print student invoices'
                : 'Generate and manage student fee invoices'
              }
            </p>
          </div>
          {userRole === 'admin' && (
            <Button onClick={() => navigate('/invoices/generate')}>
              <Plus className="h-4 w-4 mr-2" />
              Generate Invoice
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payment</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {invoices.filter(inv => inv.status === 'pending').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(invoices.reduce((sum, inv) => sum + inv.total_amount, 0))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(invoices.reduce((sum, inv) => sum + (inv.total_amount - inv.paid_amount), 0))}
              </div>
            </CardContent>
          </Card>
        </div>

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
                    placeholder="Search by invoice number..."
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
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Term</label>
                <Select value={termFilter} onValueChange={setTermFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Terms</SelectItem>
                    <SelectItem value="first_term">First Term</SelectItem>
                    <SelectItem value="second_term">Second Term</SelectItem>
                    <SelectItem value="third_term">Third Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Results</label>
                <div className="px-3 py-2 bg-muted rounded-md text-sm">
                  {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} found
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoices List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Receipt className="h-5 w-5" />
              <span>Invoice List</span>
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
            ) : invoices.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No invoices found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' || termFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'No invoices have been generated yet'
                  }
                </p>
                {userRole === 'admin' && (
                  <Button 
                    className="mt-4" 
                    onClick={() => navigate('/invoices/generate')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Generate First Invoice
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div 
                    key={invoice.id} 
                    className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="w-16 h-12 bg-primary/10 rounded flex items-center justify-center">
                      <Receipt className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="font-medium">{invoice.invoice_number}</h3>
                        {getStatusBadge(invoice.status)}
                        {invoice.term && (
                          <span className="text-xs px-2 py-1 bg-muted rounded-full">
                            {invoice.term.split('_').map((word: string) => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>
                          {invoice.student?.first_name} {invoice.student?.last_name}
                        </span>
                        <span>•</span>
                        <span>{invoice.student?.student_id}</span>
                        <span>•</span>
                        <span>{classLevelToDisplay(invoice.student?.class_level || '')}</span>
                        <span>•</span>
                        <span>Generated {formatDate(invoice.generated_at)}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm mt-1">
                        <span className="font-medium">
                          Total: {formatCurrency(invoice.total_amount)}
                        </span>
                        <span>
                          Paid: {formatCurrency(invoice.paid_amount)}
                        </span>
                        <span className={invoice.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                          Balance: {formatCurrency(invoice.balance)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handlePrintInvoice(invoice.id)}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => window.open(`/invoices/${invoice.id}/pdf`, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
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
