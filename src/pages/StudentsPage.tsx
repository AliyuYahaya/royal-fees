import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { formatDate, classLevelToDisplay } from "@/lib/utils"
import { useAuthStore } from "@/store/auth"
import type { Student } from "@/types"
import {
  Search,
  Plus,
  Filter,
  Edit,
  Eye,
  UserX,
  Download,
  Users
} from "lucide-react"

export function StudentsPage() {
  const navigate = useNavigate()
  const { userRole } = useAuthStore()
  const { toast } = useToast()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [classFilter, setClassFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("active")
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    fetchStudents()
  }, [searchTerm, classFilter, statusFilter])

  const fetchStudents = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('students')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (statusFilter === 'active') {
        query = query.eq('is_active', true)
      } else if (statusFilter === 'inactive') {
        query = query.eq('is_active', false)
      }

      if (classFilter !== 'all') {
        query = query.eq('class_level', classFilter)
      }

      if (searchTerm) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,student_id.ilike.%${searchTerm}%`)
      }

      const { data, error, count } = await query

      if (error) throw error

      setStudents(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error fetching students:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch students"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (studentId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ is_active: !currentStatus })
        .eq('id', studentId)

      if (error) throw error

      toast({
        title: "Success",
        description: `Student ${!currentStatus ? 'activated' : 'deactivated'} successfully`
      })

      fetchStudents()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update student status"
      })
    }
  }

  const exportStudents = async () => {
    try {
      const csvContent = [
        ['Student ID', 'Name', 'Class', 'Gender', 'Parent/Guardian', 'Phone', 'Status'].join(','),
        ...students.map(student => [
          student.student_id,
          `"${student.first_name} ${student.last_name}"`,
          classLevelToDisplay(student.class_level),
          student.gender,
          `"${student.parent_guardian_name || ''}"`,
          student.parent_guardian_phone || '',
          student.is_active ? 'Active' : 'Inactive'
        ].join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `students_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      toast({
        title: "Success",
        description: "Students exported successfully"
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to export students"
      })
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Students</h1>
            <p className="text-muted-foreground">Manage student records and information</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={exportStudents} disabled={students.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            {(userRole === 'admin' || userRole === 'registrar') && (
              <Button onClick={() => navigate('/students/add')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            )}
          </div>
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
                    placeholder="Search by name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Class</label>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Results</label>
                <div className="px-3 py-2 bg-muted rounded-md text-sm">
                  {totalCount} student{totalCount !== 1 ? 's' : ''} found
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Student List</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No students found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || classFilter !== 'all' || statusFilter !== 'active'
                    ? 'Try adjusting your filters'
                    : 'Get started by adding your first student'}
                </p>
                {(userRole === 'admin' || userRole === 'registrar') && (
                  <Button className="mt-4" onClick={() => navigate('/students/add')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Student
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-medium">
                        {student.first_name[0]}{student.last_name[0]}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium">
                          {student.first_name} {student.last_name}
                        </h3>
                        <span className="text-xs px-2 py-1 bg-muted rounded-full">
                          {student.student_id}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          student.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {student.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                        <span>{classLevelToDisplay(student.class_level)}</span>
                        <span>•</span>
                        <span className="capitalize">{student.gender}</span>
                        <span>•</span>
                        <span>Admitted {formatDate(student.admission_date)}</span>
                        {student.parent_guardian_name && (
                          <>
                            <span>•</span>
                            <span>{student.parent_guardian_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/students/${student.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {(userRole === 'admin' || userRole === 'registrar') && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/students/${student.id}/edit`)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(student.id, student.is_active)}>
                            <UserX className="h-4 w-4" />
                          </Button>
                        </>
                      )}
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
