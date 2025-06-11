import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { useAuthStore } from "@/store/auth"
import { supabase } from "@/lib/supabase"
import { formatCurrency } from "@/lib/utils"
import {
  Users,
  Receipt,
  Banknote,
  AlertCircle,
  TrendingUp,
  GraduationCap,
  Calendar,
  UserPlus,
  FileText,
  CreditCard
} from "lucide-react"

interface DashboardStats {
  totalStudents: number
  activeStudents: number
  totalInvoices: number
  pendingInvoices: number
  totalRevenue: number
  paidAmount: number
  outstandingAmount: number
  paymentsToday: number
}

export function Dashboard() {
  const { userRole, user } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeStudents: 0,
    totalInvoices: 0,
    pendingInvoices: 0,
    totalRevenue: 0,
    paidAmount: 0,
    outstandingAmount: 0,
    paymentsToday: 0
  })
  const [loading, setLoading] = useState(true)

  // Get user's actual role from the database
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user?.email) {
        const { data } = await supabase
          .from('users')
          .select('role, first_name, last_name')
          .eq('email', user.email)
          .single()
        
        if (data?.role) {
          useAuthStore.getState().setUserRole(data.role)
        }
      }
    }
    
    fetchUserRole()
  }, [user?.email])

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      // Fetch students stats
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, is_active')
      
      // Fetch invoices stats
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('id, total_amount, paid_amount, status')
      
      // Fetch today's payments
      const today = new Date().toISOString().split('T')[0]
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount')
        .gte('payment_date', today)
        .lt('payment_date', new Date(Date.now() + 86400000).toISOString().split('T')[0])
        .eq('status', 'confirmed')

      const totalStudents = studentsData?.length || 0
      const activeStudents = studentsData?.filter(s => s.is_active).length || 0
      
      const totalInvoices = invoicesData?.length || 0
      const pendingInvoices = invoicesData?.filter(i => i.status === 'pending').length || 0
      
      const totalRevenue = invoicesData?.reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0
      const paidAmount = invoicesData?.reduce((sum, i) => sum + (i.paid_amount || 0), 0) || 0
      const outstandingAmount = totalRevenue - paidAmount
      
      const paymentsToday = paymentsData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

      setStats({
        totalStudents,
        activeStudents,
        totalInvoices,
        pendingInvoices,
        totalRevenue,
        paidAmount,
        outstandingAmount,
        paymentsToday
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: "Total Students",
      value: stats.totalStudents,
      description: `${stats.activeStudents} active`,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      show: ["admin", "registrar", "payment_desk_officer"]
    },
    {
      title: "Total Invoices",
      value: stats.totalInvoices,
      description: `${stats.pendingInvoices} pending`,
      icon: Receipt,
      color: "text-green-600",
      bgColor: "bg-green-100",
      show: ["admin", "registrar", "payment_desk_officer"]
    },
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      description: "Current session",
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
      show: ["admin", "registrar"]
    },
    {
      title: "Outstanding Fees",
      value: formatCurrency(stats.outstandingAmount),
      description: "Pending collection",
      icon: AlertCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      show: ["admin", "registrar", "payment_desk_officer"]
    },
    {
      title: "Payments Today",
      value: formatCurrency(stats.paymentsToday),
      description: "Received today",
      icon: Banknote,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
      show: ["admin", "registrar", "payment_desk_officer"]
    },
    {
      title: "Collection Rate",
      value: `${stats.totalRevenue > 0 ? ((stats.paidAmount / stats.totalRevenue) * 100).toFixed(1) : 0}%`,
      description: "Payment efficiency",
      icon: GraduationCap,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      show: ["admin", "registrar"]
    }
  ]

  const filteredStatCards = statCards.filter(card => 
    userRole && card.show.includes(userRole)
  )

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {userRole === 'admin' ? 'Admin Dashboard' : 
             userRole === 'registrar' ? 'Registrar Dashboard' :
             userRole === 'payment_desk_officer' ? 'Finance Dashboard' :
             'Dashboard'}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            {userRole === 'admin' ? 'Complete system overview and management controls.' :
             userRole === 'registrar' ? 'Student management and academic administration.' :
             userRole === 'payment_desk_officer' ? 'Payment processing and invoice management.' :
             'Welcome back! Here\'s what\'s happening with Royal Fees today.'}
          </p>
        </div>

        {/* Stats Grid - Responsive layout */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="min-h-[100px] sm:min-h-[120px]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-3 sm:h-4 w-16 sm:w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 sm:h-4 w-3 sm:w-4 bg-gray-200 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-6 sm:h-8 w-16 sm:w-24 bg-gray-200 rounded animate-pulse mb-1" />
                  <div className="h-2 sm:h-3 w-12 sm:w-16 bg-gray-200 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))
          ) : (
            filteredStatCards.map((stat, index) => {
              const Icon = stat.icon
              return (
                <Card key={index} className="min-h-[100px] sm:min-h-[120px]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-1.5 sm:p-2 rounded-lg ${stat.bgColor} flex-shrink-0`}>
                      <Icon className={`h-3 w-3 sm:h-4 sm:w-4 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg sm:text-2xl font-bold truncate">{stat.value}</div>
                    <p className="text-xs text-muted-foreground truncate">
                      {stat.description}
                    </p>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        {/* Quick Actions - Mobile responsive grid */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Student Management - Admin & Registrar only */}
          {(userRole === 'admin' || userRole === 'registrar') && (
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
              onClick={() => navigate('/students')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-base">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <span>Student Management</span>
                </CardTitle>
                <CardDescription className="text-sm">
                  View and manage student records
                </CardDescription>
              </CardHeader>
            </Card>
          )}
          
          {/* Add Student - Admin & Registrar only */}
          {(userRole === 'admin' || userRole === 'registrar') && (
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
              onClick={() => navigate('/students/add')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-base">
                  <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <span>Add New Student</span>
                </CardTitle>
                <CardDescription className="text-sm">
                  Register a new student to the system
                </CardDescription>
              </CardHeader>
            </Card>
          )}
          
          {/* Generate Invoice - Admin & Payment Desk Officer only */}
          {(userRole === 'admin' || userRole === 'payment_desk_officer') && (
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
              onClick={() => navigate('/invoices')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-base">
                  <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <span>
                    {userRole === 'payment_desk_officer' ? 'View Invoices' : 'Generate Invoice'}
                  </span>
                </CardTitle>
                <CardDescription className="text-sm">
                  {userRole === 'payment_desk_officer' 
                    ? 'Search and print student invoices'
                    : 'Create new invoices for student fees'
                  }
                </CardDescription>
              </CardHeader>
            </Card>
          )}
          
          {/* Record Payment - All roles */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
            onClick={() => navigate('/payments')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-base">
                <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <span>Record Payment</span>
              </CardTitle>
              <CardDescription className="text-sm">
                Process and record fee payments
              </CardDescription>
            </CardHeader>
          </Card>
          
          {/* Fee Structure - Admin & Registrar only */}
          {(userRole === 'admin' || userRole === 'registrar') && (
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
              onClick={() => navigate('/fee-structure')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-base">
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <span>Fee Structure</span>
                </CardTitle>
                <CardDescription className="text-sm">
                  Configure school fees and pricing
                </CardDescription>
              </CardHeader>
            </Card>
          )}
          
          {/* Reports - Admin & Registrar only */}
          {(userRole === 'admin' || userRole === 'registrar') && (
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
              onClick={() => navigate('/reports')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-base">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <span>Reports</span>
                </CardTitle>
                <CardDescription className="text-sm">
                  Generate financial and academic reports
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>

        {/* Recent Activity - Mobile responsive */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription className="text-sm">
              {userRole === 'admin' ? 'System-wide activities and changes' :
               userRole === 'registrar' ? 'Student and academic activities' :
               userRole === 'payment_desk_officer' ? 'Payment and invoice activities' :
               'Latest actions performed in the system'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {userRole === 'payment_desk_officer' ? (
                // Payment Desk Officer specific activities
                <>
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Payment received</p>
                      <p className="text-xs text-muted-foreground break-words">
                        NGN 45,000 from John Doe - 2 minutes ago
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Invoice printed</p>
                      <p className="text-xs text-muted-foreground break-words">
                        Invoice INV-001234 printed for Jane Smith - 15 minutes ago
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Payment confirmed</p>
                      <p className="text-xs text-muted-foreground break-words">
                        Bank transfer confirmed for David Johnson - 1 hour ago
                      </p>
                    </div>
                  </div>
                </>
              ) : userRole === 'registrar' ? (
                // Registrar specific activities
                <>
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">New student added</p>
                      <p className="text-xs text-muted-foreground break-words">
                        Jane Smith added to SSS 1 - 15 minutes ago
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Invoice generated</p>
                      <p className="text-xs text-muted-foreground break-words">
                        Invoice INV-001234 for Third Term fees - 1 hour ago
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Student updated</p>
                      <p className="text-xs text-muted-foreground break-words">
                        Contact info updated for Michael Brown - 2 hours ago
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                // Admin sees all activities
                <>
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Payment received</p>
                      <p className="text-xs text-muted-foreground break-words">
                        NGN 45,000 from John Doe - 2 minutes ago
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">New student added</p>
                      <p className="text-xs text-muted-foreground break-words">
                        Jane Smith added to SSS 1 by registrar - 15 minutes ago
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Fee structure updated</p>
                      <p className="text-xs text-muted-foreground break-words">
                        SSS 1 fees updated for 2024/2025 session - 1 hour ago
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
