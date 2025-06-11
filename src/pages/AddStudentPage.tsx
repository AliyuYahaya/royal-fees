import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/auth"
import type { ClassLevel, Gender, PaymentTermType } from "@/types/database"
import { ArrowLeft, Save, UserPlus } from "lucide-react"

const studentSchema = z.object({
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

type StudentFormData = z.infer<typeof studentSchema>

export function AddStudentPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      admission_date: new Date().toISOString().split('T')[0],
      payment_term: 'per_term',
      gender: 'male'
    }
  })

  const generateStudentId = () => {
    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `RF${year}${random}`
  }

  const onSubmit = async (data: StudentFormData) => {
    try {
      setLoading(true)

      // Check if student ID already exists
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id')
        .eq('student_id', data.student_id)
        .single()

      if (existingStudent) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Student ID already exists. Please use a different ID."
        })
        return
      }

      // Get current user ID for created_by field
      const { data: currentUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', user?.email)
        .single()

      const studentData = {
        ...data,
        class_level: data.class_level as ClassLevel,
        gender: data.gender as Gender,
        payment_term: data.payment_term as PaymentTermType,
        created_by: currentUser?.id,
        updated_by: currentUser?.id
      }

      const { error } = await supabase
        .from('students')
        .insert([studentData])

      if (error) throw error

      // Log activity
      await supabase
        .from('activity_logs')
        .insert({
          user_id: currentUser?.id,
          activity_type: 'student_added',
          description: `Added new student: ${data.first_name} ${data.last_name} (${data.student_id})`,
          entity_type: 'student',
          entity_id: data.student_id
        })

      toast({
        title: "Success",
        description: "Student added successfully"
      })

      navigate('/students')
    } catch (error) {
      console.error('Error adding student:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add student"
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/students')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Students
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Add New Student</h1>
            <p className="text-muted-foreground">
              Register a new student to the system
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
              <CardDescription>
                Basic student details and identification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="student_id">Student ID *</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="student_id"
                      placeholder="e.g., RF2024001"
                      {...register('student_id')}
                    />
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setValue('student_id', generateStudentId())}
                    >
                      Generate
                    </Button>
                  </div>
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
              <CardDescription>
                Contact details for the student's parent or guardian
              </CardDescription>
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
              onClick={() => navigate('/students')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Adding Student...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Add Student
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
