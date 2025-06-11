import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/auth"
import type { ClassLevel, Gender, PaymentTermType } from "@/types/database"
import { ArrowLeft, Save, UserPlus } from "lucide-react"

const studentUpdateSchema = z.object({
  student_id: z.string().min(1, "Student ID is required"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  middle_name: z.string().optional(),
  class_level: z.string().min(1, "Class level is required"),
  gender: z.enum(["male", "female"]),
  date_of_birth: z.string().optional(),
  parent_guardian_name: z.string().optional(),
  parent_guardian_phone: z.string().optional(),
  parent_guardian_email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  payment_term: z.enum(["per_annum", "per_term"]),
  admission_date: z.string().min(1, "Admission date is required"),
})

type StudentUpdateData = z.infer<typeof studentUpdateSchema>

export function StudentEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset
  } = useForm<StudentUpdateData>({
    resolver: zodResolver(studentUpdateSchema)
  })

  useEffect(() => {
    if (id) {
      fetchStudent()
    }
  }, [id])

  const fetchStudent = async () => {
    try {
      setInitialLoading(true)
      
      const { data: student, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      // Populate form with existing data
      reset({
        student_id: student.student_id,
        first_name: student.first_name,
        last_name: student.last_name,
        middle_name: student.middle_name || '',
        class_level: student.class_level,
        gender: student.gender,
        date_of_birth: student.date_of_birth || '',
        parent_guardian_name: student.parent_guardian_name || '',
        parent_guardian_phone: student.parent_guardian_phone || '',
        parent_guardian_email: student.parent_guardian_email || '',
        address: student.address || '',
        payment_term: student.payment_term,
        admission_date: student.admission_date,
      })

      // Set the select values separately since they don't work with reset
      setValue('class_level', student.class_level)
      setValue('gender', student.gender)
      setValue('payment_term', student.payment_term)
    } catch (error) {
      console.error('Error fetching student:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch student details"
      })
      navigate('/students')
    } finally {
      setInitialLoading(false)
    }
  }

  const onSubmit = async (data: StudentUpdateData) => {
    try {
      setLoading(true)

      // Check if student ID already exists (excluding current student)
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id')
        .eq('student_id', data.student_id)
        .neq('id', id)
        .single()

      if (existingStudent) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Student ID already exists. Please use a different ID."
        })
        return
      }

      // Get current user ID for updated_by field
      const { data: currentUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', user?.email)
        .single()

      const updateData = {
        ...data,
        class_level: data.class_level as ClassLevel,
        gender: data.gender as Gender,
        payment_term: data.payment_term as PaymentTermType,
        updated_by: currentUser?.id,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      // Log activity
      await supabase
        .from('activity_logs')
        .insert({
          user_id: currentUser?.id,
          activity_type: 'student_updated',
          description: `Updated student: ${data.first_name} ${data.last_name} (${data.student_id})`,
          entity_type: 'student',
          entity_id: data.student_id
        })

      toast({
        title: "Success",
        description: "Student updated successfully"
      })

      navigate(`/students/${id}`)
    } catch (error) {
      console.error('Error updating student:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update student"
      })
    } finally {
      setLoading(false)
    }
  }

  const classLevels = [
    { value: 'pre_creche', label: 'Pre-Creche' },
    { value: 'nursery_1', label: 'Nursery 1' },
    { value: 'nursery_2', label: 'Nursery 2' },
    { value: 'primary_1', label: 'Primary 1' },
    { value: 'primary_2', label: 'Primary 2' },
    { value: 'primary_3', label: 'Primary 3' },
    { value: 'primary_4', label: 'Primary 4' },
    { value: 'primary_5', label: 'Primary 5' },
    { value: 'primary_6', label: 'Primary 6' },
    { value: 'jss_1', label: 'JSS 1' },
    { value: 'jss_2', label: 'JSS 2' },
    { value: 'jss_3', label: 'JSS 3' },
    { value: 'sss_1', label: 'SSS 1' },
    { value: 'sss_2', label: 'SSS 2' },
    { value: 'sss_3', label: 'SSS 3' }
  ]

  if (initialLoading) {
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
                  <div className="space-y-4">
                    <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
                    <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/students/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Student
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Student</h1>
            <p className="text-muted-foreground">
              Update student information and details
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Student Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5" />
                <span>Student Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="student_id">Student ID *</Label>
                  <Input
                    id="student_id"
                    placeholder="e.g., RF2024001"
                    {...register('student_id')}
                  />
                  {errors.student_id && (
                    <p className="text-sm text-red-600">{errors.student_id.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admission_date">Admission Date *</Label>
                  <Input
                    id="admission_date"
                    type="date"
                    {...register('admission_date')}
                  />
                  {errors.admission_date && (
                    <p className="text-sm text-red-600">{errors.admission_date.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    placeholder="Enter first name"
                    {...register('first_name')}
                  />
                  {errors.first_name && (
                    <p className="text-sm text-red-600">{errors.first_name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="middle_name">Middle Name</Label>
                  <Input
                    id="middle_name"
                    placeholder="Enter middle name"
                    {...register('middle_name')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    placeholder="Enter last name"
                    {...register('last_name')}
                  />
                  {errors.last_name && (
                    <p className="text-sm text-red-600">{errors.last_name.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Class Level *</Label>
                  <Select onValueChange={(value) => setValue('class_level', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class level" />
                    </SelectTrigger>
                    <SelectContent>
                      {classLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.class_level && (
                    <p className="text-sm text-red-600">{errors.class_level.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Gender *</Label>
                  <Select onValueChange={(value) => setValue('gender', value as Gender)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && (
                    <p className="text-sm text-red-600">{errors.gender.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    {...register('date_of_birth')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Term *</Label>
                <Select onValueChange={(value) => setValue('payment_term', value as PaymentTermType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_term">Per Term</SelectItem>
                    <SelectItem value="per_annum">Per Annum</SelectItem>
                  </SelectContent>
                </Select>
                {errors.payment_term && (
                  <p className="text-sm text-red-600">{errors.payment_term.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Parent/Guardian Information */}
          <Card>
            <CardHeader>
              <CardTitle>Parent/Guardian Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="parent_guardian_name">Parent/Guardian Name</Label>
                  <Input
                    id="parent_guardian_name"
                    placeholder="Enter parent/guardian name"
                    {...register('parent_guardian_name')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parent_guardian_phone">Phone Number</Label>
                  <Input
                    id="parent_guardian_phone"
                    placeholder="e.g., +234-801-234-5678"
                    {...register('parent_guardian_phone')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent_guardian_email">Email Address</Label>
                <Input
                  id="parent_guardian_email"
                  type="email"
                  placeholder="Enter email address"
                  {...register('parent_guardian_email')}
                />
                {errors.parent_guardian_email && (
                  <p className="text-sm text-red-600">{errors.parent_guardian_email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Home Address</Label>
                <Input
                  id="address"
                  placeholder="Enter home address"
                  {...register('address')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate(`/students/${id}`)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Updating Student...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Student
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
