import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { formatDate, formatCurrency, classLevelToDisplay } from "@/lib/utils"
import { useAuthStore } from "@/store/auth"
import type { Student, Invoice, Payment } from "@/types/database"
import {
  ArrowLeft,
  Edit,
  Receipt,
  Banknote,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  GraduationCap,
  CreditCard
} from "lucide-react"

interface StudentWithDetails extends Student {
  invoices?: Array<Invoice & {
    payments?: Payment[]
  }>
}

export function StudentViewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userRole } = useAuthStore()
  const { toast } = useToast()
  const [student, setStudent] = useState<StudentWithDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchStudent()
    }
  }, [id])

  const fetchStudent = async () => {
    try {
      setLoading(true)
      
      // Fetch student details
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single()

      if (studentError) throw studentError

      // Fetch student's invoices with payments
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select(`
          *,
          payments(*)
        `)
        .eq('student_id', id)
        .order('generated_at', { ascending: false })

      const studentWithDetails: StudentWithDetails = {
        ...studentData,
        invoices: invoicesData || []
      }

      setStudent(studentWithDetails)
    } catch (error) {
      console.error('Error fetching student:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch student details"
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateTotals = () => {
    if (!student?.invoices) return { totalFees: 0, totalPaid: 0, balance: 0 }
    
    const totalFees = student.invoices.reduce((sum, inv) => sum + inv.total_amount, 0)
    const totalPaid = student.invoices.reduce((sum, inv) => sum + inv.paid_amount, 0)
    const balance = totalFees - totalPaid
    
    return { totalFees, totalPaid, balance }
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
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
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

  if (!student) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <h3 className="text-lg font-medium">Student not found</h3>
          <p className="text-muted-foreground mb-4">
            The student you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate('/students')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Students
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const { totalFees, totalPaid, balance } = calculateTotals()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/students')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Students
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {student.first_name} {student.last_name}
              </h1>
              <p className="text-muted-foreground">
                Student ID: {student.student_id} • {classLevelToDisplay(student.class_level)}
              </p>
            </div>
          </div>
          {(userRole === 'admin' || userRole === 'registrar') && (
            <Button onClick={() => navigate(`/students/${student.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Student
            </Button>
          )}
        </div>

        {/* Student Status */}
        <div className="flex items-center space-x-2">
          <Badge className={student.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
            {student.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {student.payment_term.replace('_', ' ')}
          </Badge>
        </div>

        {/* Student Information Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Personal Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <p className="text-sm">
                    {student.first_name} {student.middle_name && `${student.middle_name} `}{student.last_name}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Gender</label>
                    <p className="text-sm capitalize">{student.gender}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                    <p className="text-sm">{student.date_of_birth ? formatDate(student.date_of_birth) : 'Not provided'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>Address</span>
                  </label>
                  <p className="text-sm">{student.address || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Academic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <GraduationCap className="h-5 w-5" />
                <span>Academic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Class Level</label>
                  <p className="text-sm">{classLevelToDisplay(student.class_level)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>Admission Date</span>
                  </label>
                  <p className="text-sm">{formatDate(student.admission_date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Payment Term</label>
                  <p className="text-sm capitalize">{student.payment_term.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Registration Date</label>
                  <p className="text-sm">{formatDate(student.created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Parent/Guardian Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Parent/Guardian Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-sm">{student.parent_guardian_name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                    <Phone className="h-3 w-3" />
                    <span>Phone Number</span>
                  </label>
                  <p className="text-sm">{student.parent_guardian_phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                    <Mail className="h-3 w-3" />
                    <span>Email Address</span>
                  </label>
                  <p className="text-sm">{student.parent_guardian_email || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Financial Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Total Fees</span>
                  <span className="text-sm font-medium">{formatCurrency(totalFees)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Amount Paid</span>
                  <span className="text-sm font-medium text-green-600">{formatCurrency(totalPaid)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-sm font-medium">Outstanding Balance</span>
                  <span className={`text-sm font-medium ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(balance)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices and Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Receipt className="h-5 w-5" />
              <span>Invoices & Payments</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {student.invoices && student.invoices.length > 0 ? (
              <div className="space-y-4">
                {student.invoices.map((invoice) => (
                  <div key={invoice.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium">{invoice.invoice_number}</h4>
                        {getStatusBadge(invoice.status)}
                        {invoice.term && (
                          <Badge variant="outline">
                            {invoice.term.split('_').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(invoice.generated_at)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Amount</span>
                        <p className="font-medium">{formatCurrency(invoice.total_amount)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Paid Amount</span>
                        <p className="font-medium text-green-600">{formatCurrency(invoice.paid_amount)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Balance</span>
                        <p className={`font-medium ${invoice.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(invoice.balance)}
                        </p>
                      </div>
                    </div>

                    {/* Payments for this invoice */}
                    {invoice.payments && invoice.payments.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <h5 className="text-sm font-medium mb-2 flex items-center">
                          <Banknote className="h-4 w-4 mr-1" />
                          Payments
                        </h5>
                        <div className="space-y-2">
                          {invoice.payments.map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded">
                              <div className="flex items-center space-x-2">
                                <span>{payment.payment_reference}</span>
                                <Badge variant="outline" className="text-xs">
                                  {payment.payment_method.replace('_', ' ')}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{formatCurrency(payment.amount)}</span>
                                <span className="text-muted-foreground">{formatDate(payment.payment_date)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No invoices generated</h3>
                <p className="text-muted-foreground">
                  No invoices have been generated for this student yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
