import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { formatCurrency, generateInvoiceNumber, classLevelToDisplay } from "@/lib/utils"
import { useAuthStore } from "@/store/auth"
import type { Student, FeeStructure, SchoolTerm } from "@/types"
import { ArrowLeft, Save, Receipt, Calculator } from "lucide-react"

const invoiceSchema = z.object({
  student_id: z.string().min(1, "Please select a student"),
  term: z.string().min(1, "Please select a term"),
  due_date: z.string().min(1, "Due date is required"),
  include_exam_fees: z.boolean().default(false),
  additional_fees: z.array(z.object({
    description: z.string(),
    amount: z.number()
  })).default([])
})

type InvoiceFormData = z.infer<typeof invoiceSchema>

interface StudentWithFees extends Student {
  applicable_fees: FeeStructure[]
  exam_fees: any[]
}

export function GenerateInvoicePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<StudentWithFees | null>(null)
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [currentSession, setCurrentSession] = useState<any>(null)
  const [invoicePreview, setInvoicePreview] = useState<any>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      include_exam_fees: false,
      additional_fees: []
    }
  })

  const watchedStudent = watch('student_id')
  const watchedTerm = watch('term')
  const watchedExamFees = watch('include_exam_fees')

  useEffect(() => {
    fetchStudents()
    fetchCurrentSession()
  }, [])

  useEffect(() => {
    if (watchedStudent) {
      fetchStudentDetails(watchedStudent)
    }
  }, [watchedStudent])

  useEffect(() => {
    if (selectedStudent && watchedTerm) {
      calculateInvoiceTotal()
    }
  }, [selectedStudent, watchedTerm, watchedExamFees])

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', true)
        .order('first_name')

      if (error) throw error
      setStudents(data || [])
    } catch (error) {
      console.error('Error fetching students:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch students"
      })
    }
  }

  const fetchCurrentSession = async () => {
    try {
      const { data, error } = await supabase
        .from('academic_sessions')
        .select('*')
        .eq('is_current', true)
        .single()

      if (error) throw error
      setCurrentSession(data)
    } catch (error) {
      console.error('Error fetching current session:', error)
    }
  }

  const fetchStudentDetails = async (studentId: string) => {
    try {
      setCalculating(true)
      
      // Get student details
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single()

      if (studentError) throw studentError

      // Get applicable fees for this student's class
      const { data: fees, error: feesError } = await supabase
        .from('fee_structures')
        .select(`
          *,
          fee_category:fee_categories(name, description)
        `)
        .eq('academic_session_id', currentSession?.id)
        .eq('class_level', student.class_level)
        .eq('is_active', true)

      if (feesError) throw feesError

      // Get applicable exam fees based on class level
      const examFeeTypes = getExamFeesForClass(student.class_level)
      let examFees = []
      
      if (examFeeTypes.length > 0) {
        // First get the fee category IDs
        const { data: feeCategories, error: categoryError } = await supabase
          .from('fee_categories')
          .select('id, name, description')
          .in('name', examFeeTypes)
          .eq('is_active', true)

        if (!categoryError && feeCategories && feeCategories.length > 0) {
          const categoryIds = feeCategories.map(cat => cat.id)
          
          // Then get the fee structures for those categories
          const { data: examFeesData, error: examFeesError } = await supabase
            .from('fee_structures')
            .select(`
              *,
              fee_category:fee_categories(name, description)
            `)
            .eq('academic_session_id', currentSession?.id)
            .in('fee_category_id', categoryIds)
            .eq('is_active', true)

          if (!examFeesError) {
            examFees = examFeesData || []
          }
        }
      }

      setSelectedStudent({
        ...student,
        applicable_fees: fees || [],
        exam_fees: examFees
      })

      // Auto-check exam fees if applicable
      if (examFees.length > 0) {
        setValue('include_exam_fees', true)
      }

    } catch (error) {
      console.error('Error fetching student details:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch student details"
      })
    } finally {
      setCalculating(false)
    }
  }

  const getExamFeesForClass = (classLevel: string): string[] => {
    switch (classLevel) {
      case 'primary_6':
        return ['Primary 6 Exam Fee']
      case 'jss_3':
        return ['JSS3 Exam Fee']
      case 'sss_3':
        return ['NECO Fee', 'WAEC Fee']
      default:
        return []
    }
  }

  const calculateInvoiceTotal = () => {
    if (!selectedStudent || !watchedTerm) return

    const termFees = selectedStudent.applicable_fees.filter(fee => 
      fee.term === watchedTerm || fee.term === null // null means applies to all terms
    )

    let examFeesToInclude = []
    if (watchedExamFees && selectedStudent.exam_fees.length > 0) {
      examFeesToInclude = selectedStudent.exam_fees
    }

    const allFees = [...termFees, ...examFeesToInclude]
    const totalAmount = allFees.reduce((sum, fee) => sum + fee.amount, 0)

    setInvoicePreview({
      fees: allFees,
      total: totalAmount,
      student: selectedStudent
    })
  }

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      if (!selectedStudent || !invoicePreview) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please select a student and calculate fees"
        })
        return
      }

      setLoading(true)

      // Check if invoice already exists for this student and term
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('student_id', data.student_id)
        .eq('academic_session_id', currentSession?.id)
        .eq('term', data.term)
        .single()

      if (existingInvoice) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Invoice already exists for this student and term"
        })
        return
      }

      // Get current user
      const { data: currentUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', user?.email)
        .single()

      // Generate invoice
      const invoiceData = {
        invoice_number: generateInvoiceNumber(),
        student_id: data.student_id,
        academic_session_id: currentSession?.id,
        term: data.term as SchoolTerm,
        total_amount: invoicePreview.total,
        due_date: data.due_date,
        generated_by: currentUser?.id
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Create invoice items
      const invoiceItems = invoicePreview.fees.map((fee: any) => ({
        invoice_id: invoice.id,
        fee_category_id: fee.fee_category_id || fee.id, // Handle both regular fees and exam fees
        description: fee.fee_category?.name || fee.description || 'Fee',
        amount: fee.amount,
        quantity: 1
      }))

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems)

      if (itemsError) throw itemsError

      // Log activity
      await supabase
        .from('activity_logs')
        .insert({
          user_id: currentUser?.id,
          activity_type: 'invoice_generated',
          description: `Generated invoice ${invoice.invoice_number} for ${selectedStudent.first_name} ${selectedStudent.last_name}`,
          entity_type: 'invoice',
          entity_id: invoice.id
        })

      toast({
        title: "Success",
        description: `Invoice ${invoice.invoice_number} generated successfully`
      })

      navigate('/invoices')
    } catch (error) {
      console.error('Error generating invoice:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate invoice"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/invoices')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Generate Invoice</h1>
            <p className="text-muted-foreground">
              Create a new fee invoice for a student
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Student Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Receipt className="h-5 w-5" />
                <span>Invoice Details</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Select student and configure invoice parameters
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Select Student *</Label>
                  <Select onValueChange={(value) => setValue('student_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.first_name} {student.last_name} - {student.student_id} ({classLevelToDisplay(student.class_level)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.student_id && (
                    <p className="text-sm text-red-600">{errors.student_id.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Academic Term *</Label>
                  <Select onValueChange={(value) => setValue('term', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first_term">First Term</SelectItem>
                      <SelectItem value="second_term">Second Term</SelectItem>
                      <SelectItem value="third_term">Third Term</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.term && (
                    <p className="text-sm text-red-600">{errors.term.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date *</Label>
                  <Input
                    id="due_date"
                    type="date"
                    {...register('due_date')}
                  />
                  {errors.due_date && (
                    <p className="text-sm text-red-600">{errors.due_date.message}</p>
                  )}
                </div>

                {selectedStudent && selectedStudent.exam_fees.length > 0 && (
                  <div className="space-y-2">
                    <Label>Additional Fees</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include_exam_fees"
                        checked={watchedExamFees}
                        onCheckedChange={(checked: boolean) => setValue('include_exam_fees', !!checked)}
                      />
                      <Label htmlFor="include_exam_fees" className="text-sm">
                        Include exam fees ({getExamFeesForClass(selectedStudent.class_level).join(', ')})
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Fee Breakdown */}
          {calculating && (
            <Card>
              <CardContent className="py-8">
                <div className="flex items-center justify-center space-x-2">
                  <Calculator className="h-5 w-5 animate-spin" />
                  <span>Calculating fees...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {invoicePreview && !calculating && (
            <Card>
              <CardHeader>
                <CardTitle>Invoice Preview</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Review the fees before generating the invoice
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-medium">Student:</span>
                    <span>{selectedStudent?.first_name} {selectedStudent?.last_name}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-medium">Class:</span>
                    <span>{classLevelToDisplay(selectedStudent?.class_level || '')}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-medium">Term:</span>
                    <span className="capitalize">{watchedTerm?.replace('_', ' ')}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Fee Breakdown:</h4>
                    {invoicePreview.fees.map((fee: any, index: number) => (
                      <div key={index} className="flex justify-between items-center py-2 px-3 bg-muted rounded-lg">
                        <span>{fee.fee_category?.name || fee.description}</span>
                        <span className="font-medium">{formatCurrency(fee.amount)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t text-lg font-bold">
                    <span>Total Amount:</span>
                    <span className="text-primary">{formatCurrency(invoicePreview.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/invoices')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !invoicePreview}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Generate Invoice
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
