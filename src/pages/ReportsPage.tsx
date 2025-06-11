import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { formatCurrency, classLevelToDisplay } from "@/lib/utils"
import {
  FileText,
  Download,
  Users,
  CreditCard,
  TrendingUp,
  BarChart3,
  PieChart
} from "lucide-react"

interface ReportData {
  totalStudents: number
  totalRevenue: number
  outstandingFees: number
  collectionRate: number
  classSummary: Array<{
    class_level: string
    student_count: number
    total_fees: number
    paid_amount: number
  }>
  paymentMethods: Array<{
    method: string
    count: number
    amount: number
  }>
  monthlyTrends: Array<{
    month: string
    revenue: number
    payments: number
  }>
}

export function ReportsPage() {
  const { toast } = useToast()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [selectedReport, setSelectedReport] = useState('overview')

  useEffect(() => {
    fetchReportData()
  }, [selectedYear])

  const fetchReportData = async () => {
    try {
      setLoading(true)
      
      // Fetch basic stats
      const { data: students } = await supabase
        .from('students')
        .select('id, class_level, is_active')
        .eq('is_active', true)

      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, paid_amount, status')

      const { data: payments } = await supabase
        .from('payments')
        .select('amount, payment_method, payment_date, status')
        .eq('status', 'confirmed')

      // Calculate totals
      const totalStudents = students?.length || 0
      const totalRevenue = invoices?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0
      const paidAmount = invoices?.reduce((sum, inv) => sum + inv.paid_amount, 0) || 0
      const outstandingFees = totalRevenue - paidAmount
      const collectionRate = totalRevenue > 0 ? (paidAmount / totalRevenue) * 100 : 0

      // Class summary
      const classSummary = await getClassSummary() as Array<{
        class_level: string
        student_count: number
        total_fees: number
        paid_amount: number
      }>
      
      // Payment methods
      const paymentMethods = getPaymentMethodSummary(payments || []) as Array<{
        method: string
        count: number
        amount: number
      }>
      
      // Monthly trends (simplified)
      const monthlyTrends = getMonthlyTrends(payments || [])

      setReportData({
        totalStudents,
        totalRevenue,
        outstandingFees,
        collectionRate,
        classSummary,
        paymentMethods,
        monthlyTrends
      })
    } catch (error) {
      console.error('Error fetching report data:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch report data"
      })
    } finally {
      setLoading(false)
    }
  }

  const getClassSummary = async () => {
    try {
      const { data } = await supabase
        .from('students')
        .select(`
          class_level,
          invoices(total_amount, paid_amount)
        `)
        .eq('is_active', true)

      const summary = (data || []).reduce((acc: any, student: any) => {
        const classLevel = student.class_level
        if (!acc[classLevel]) {
          acc[classLevel] = {
            class_level: classLevel,
            student_count: 0,
            total_fees: 0,
            paid_amount: 0
          }
        }
        
        acc[classLevel].student_count += 1
        
        if (student.invoices) {
          student.invoices.forEach((invoice: any) => {
            acc[classLevel].total_fees += invoice.total_amount || 0
            acc[classLevel].paid_amount += invoice.paid_amount || 0
          })
        }
        
        return acc
      }, {})

      return Object.values(summary)
    } catch (error) {
      console.error('Error getting class summary:', error)
      return []
    }
  }

  const getPaymentMethodSummary = (payments: any[]) => {
    const methodSummary = payments.reduce((acc: any, payment) => {
      const method = payment.payment_method
      if (!acc[method]) {
        acc[method] = { method, count: 0, amount: 0 }
      }
      acc[method].count += 1
      acc[method].amount += payment.amount
      return acc
    }, {})

    return Object.values(methodSummary)
  }

  const getMonthlyTrends = (payments: any[]) => {
    const currentYear = parseInt(selectedYear)
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ]

    return months.map((month, index) => {
      const monthPayments = payments.filter(p => {
        const paymentDate = new Date(p.payment_date)
        return paymentDate.getFullYear() === currentYear && paymentDate.getMonth() === index
      })

      return {
        month,
        revenue: monthPayments.reduce((sum, p) => sum + p.amount, 0),
        payments: monthPayments.length
      }
    })
  }

  const exportReport = async (format: 'csv' | 'pdf') => {
    try {
      if (!reportData) return

      if (format === 'csv') {
        // Generate CSV
        const csvData = [
          ['Report Type', 'Financial Summary'],
          ['Generated Date', new Date().toLocaleDateString()],
          ['Academic Year', selectedYear],
          [''],
          ['OVERVIEW'],
          ['Total Students', reportData.totalStudents.toString()],
          ['Total Revenue', reportData.totalRevenue.toString()],
          ['Outstanding Fees', reportData.outstandingFees.toString()],
          ['Collection Rate', `${reportData.collectionRate.toFixed(1)}%`],
          [''],
          ['CLASS SUMMARY'],
          ['Class', 'Students', 'Total Fees', 'Paid Amount', 'Outstanding'],
          ...reportData.classSummary.map(cls => [
            classLevelToDisplay(cls.class_level),
            cls.student_count.toString(),
            cls.total_fees.toString(),
            cls.paid_amount.toString(),
            (cls.total_fees - cls.paid_amount).toString()
          ])
        ]

        const csvContent = csvData.map(row => row.join(',')).join('\\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `royal_fees_report_${selectedYear}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }

      toast({
        title: "Success",
        description: `Report exported as ${format.toUpperCase()}`
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to export report"
      })
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i
    return year.toString()
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground">
              Financial and academic reports and analytics
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => exportReport('csv')}
              disabled={!reportData}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Report Type Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Report Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedReport} onValueChange={setSelectedReport}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Financial Overview</SelectItem>
                <SelectItem value="class">Class-wise Report</SelectItem>
                <SelectItem value="payments">Payment Analysis</SelectItem>
                <SelectItem value="outstanding">Outstanding Fees</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !reportData ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No report data available</h3>
              <p className="text-muted-foreground">
                Unable to generate reports at this time
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Overview Stats */}
            {selectedReport === 'overview' && (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{reportData.totalStudents}</div>
                      <p className="text-xs text-muted-foreground">Active students</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(reportData.totalRevenue)}</div>
                      <p className="text-xs text-muted-foreground">Generated fees</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Outstanding Fees</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">{formatCurrency(reportData.outstandingFees)}</div>
                      <p className="text-xs text-muted-foreground">Pending collection</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {reportData.collectionRate.toFixed(1)}%
                      </div>
                      <p className="text-xs text-muted-foreground">Payment efficiency</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Monthly Trends */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>Monthly Revenue Trends</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {reportData.monthlyTrends.map((month) => (
                        <div key={month.month} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <span className="font-medium">{month.month}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              ({month.payments} payments)
                            </span>
                          </div>
                          <div className="font-medium text-green-600">
                            {formatCurrency(month.revenue)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Class-wise Report */}
            {selectedReport === 'class' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Class-wise Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.classSummary.map((cls) => (
                      <div key={cls.class_level} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">{classLevelToDisplay(cls.class_level)}</h3>
                          <span className="text-sm text-muted-foreground">
                            {cls.student_count} students
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total Fees</p>
                            <p className="font-medium">{formatCurrency(cls.total_fees)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Paid Amount</p>
                            <p className="font-medium text-green-600">{formatCurrency(cls.paid_amount)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Outstanding</p>
                            <p className="font-medium text-red-600">
                              {formatCurrency(cls.total_fees - cls.paid_amount)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ 
                                width: `${cls.total_fees > 0 ? (cls.paid_amount / cls.total_fees) * 100 : 0}%` 
                              }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {cls.total_fees > 0 ? ((cls.paid_amount / cls.total_fees) * 100).toFixed(1) : 0}% collected
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Methods */}
            {selectedReport === 'payments' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <PieChart className="h-5 w-5" />
                    <span>Payment Method Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.paymentMethods.map((method: any) => (
                      <div key={method.method} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <span className="font-medium capitalize">
                            {method.method.replace('_', ' ')}
                          </span>
                          <span className="text-sm text-muted-foreground ml-2">
                            ({method.count} transactions)
                          </span>
                        </div>
                        <div className="font-medium text-green-600">
                          {formatCurrency(method.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Outstanding Fees */}
            {selectedReport === 'outstanding' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Outstanding Fees Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="text-4xl font-bold text-red-600 mb-2">
                      {formatCurrency(reportData.outstandingFees)}
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Total outstanding fees across all classes
                    </p>
                    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{reportData.totalStudents}</div>
                        <p className="text-sm text-muted-foreground">Total Students</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {reportData.collectionRate < 100 ? reportData.totalStudents : 0}
                        </div>
                        <p className="text-sm text-muted-foreground">With Outstanding</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
