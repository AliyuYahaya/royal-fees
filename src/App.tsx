import { useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { LoginForm } from "@/components/auth/LoginForm"
import { Dashboard } from "@/pages/Dashboard"
import { StudentsPage } from "@/pages/StudentsPage"
import { AddStudentPage } from "@/pages/AddStudentPage"
import { StudentViewPage } from "@/pages/student/StudentViewPage"
import { StudentEditPage } from "@/pages/student/StudentEditPage"
import { InvoicesPage } from "@/pages/InvoicesPage"
import { InvoiceDetailsPage } from "@/pages/invoice/InvoiceDetailsPage"
import { GenerateInvoicePage } from "@/pages/GenerateInvoicePage"
import { PaymentsPage } from "@/pages/PaymentsPage"
import { PaymentDetailsPage } from "@/pages/payment/PaymentDetailsPage"
import { FeeStructurePage } from "@/pages/FeeStructurePage"
import { ReportsPage } from "@/pages/ReportsPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { Toaster } from "@/components/ui/toaster"
import { useAuthStore } from "@/store/auth"
import { auth } from "@/lib/supabase"

// Create a client
const queryClient = new QueryClient()

function App() {
  const { user, setUser, setLoading } = useAuthStore()

  useEffect(() => {
    // Check if user is already logged in
    auth.getCurrentUser().then(({ user }) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [setUser, setLoading])

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route 
              path="/login" 
              element={user ? <Navigate to="/" replace /> : <LoginForm />} 
            />
            <Route
              path="/"
              element={user ? <Dashboard /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/students"
              element={user ? <StudentsPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/students/add"
              element={user ? <AddStudentPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/students/:id"
              element={user ? <StudentViewPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/students/:id/edit"
              element={user ? <StudentEditPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/invoices"
              element={user ? <InvoicesPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/invoices/:id"
              element={user ? <InvoiceDetailsPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/invoices/generate"
              element={user ? <GenerateInvoicePage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/payments"
              element={user ? <PaymentsPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/payments/:id"
              element={user ? <PaymentDetailsPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/fee-structure"
              element={user ? <FeeStructurePage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/reports"
              element={user ? <ReportsPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/settings"
              element={user ? <SettingsPage /> : <Navigate to="/login" replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App
