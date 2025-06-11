import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { formatCurrency, classLevelToDisplay } from "@/lib/utils"
import { useAuthStore } from "@/store/auth"
import type { ClassLevel, SchoolTerm, FeeStructureWithDetails } from "@/types"
import { CreditCard, Plus, Edit, Save, Trash2 } from "lucide-react"

export function FeeStructurePage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [feeStructures, setFeeStructures] = useState<FeeStructureWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    class_level: '',
    fee_category_id: '',
    amount: '',
    term: ''
  })
  const [feeCategories, setFeeCategories] = useState<any[]>([])
  const [currentSession, setCurrentSession] = useState<any>(null)

  useEffect(() => {
    fetchFeeStructures()
    fetchFeeCategories()
    fetchCurrentSession()
  }, [])

  const fetchFeeStructures = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('fee_structures')
        .select(`
          *,
          fee_category:fee_categories(name),
          academic_session:academic_sessions(session_name)
        `)
        .eq('is_active', true)
        .order('class_level')

      if (error) throw error
      setFeeStructures(data || [])
    } catch (error) {
      console.error('Error fetching fee structures:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch fee structures"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchFeeCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('fee_categories')
        .select('*')
        .eq('is_active', true)

      if (error) throw error
      setFeeCategories(data || [])
    } catch (error) {
      console.error('Error fetching fee categories:', error)
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

  const handleAddFee = async () => {
    try {
      if (!formData.class_level || !formData.fee_category_id || !formData.amount) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please fill in all required fields"
        })
        return
      }

      const { data: currentUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', user?.email)
        .single()

      const { error } = await supabase
        .from('fee_structures')
        .insert({
          academic_session_id: currentSession?.id,
          class_level: formData.class_level as ClassLevel,
          fee_category_id: formData.fee_category_id,
          amount: parseFloat(formData.amount),
          term: formData.term ? formData.term as SchoolTerm : null,
          created_by: currentUser?.id
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Fee structure added successfully"
      })

      setShowAddForm(false)
      setFormData({ class_level: '', fee_category_id: '', amount: '', term: '' })
      fetchFeeStructures()
    } catch (error) {
      console.error('Error adding fee structure:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add fee structure"
      })
    }
  }

  const handleUpdateFee = async (id: string, amount: number) => {
    try {
      const { error } = await supabase
        .from('fee_structures')
        .update({ amount })
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Fee updated successfully"
      })

      setEditingId(null)
      fetchFeeStructures()
    } catch (error) {
      console.error('Error updating fee:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update fee"
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

  const terms = [
    { value: 'first_term', label: 'First Term' },
    { value: 'second_term', label: 'Second Term' },
    { value: 'third_term', label: 'Third Term' }
  ]

  // Group fee structures by class level
  const groupedFees = feeStructures.reduce((acc, fee) => {
    if (!acc[fee.class_level]) {
      acc[fee.class_level] = []
    }
    acc[fee.class_level].push(fee)
    return acc
  }, {} as Record<string, FeeStructureWithDetails[]>)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fee Structure</h1>
            <p className="text-muted-foreground">
              Configure school fees for {currentSession?.session_name || 'current session'}
            </p>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Fee
          </Button>
        </div>

        {/* Add Fee Form */}
        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>Add New Fee Structure</CardTitle>
              <p className="text-sm text-muted-foreground">
                Set fee amount for a specific class and category
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Class Level *</Label>
                  <Select 
                    value={formData.class_level} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, class_level: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fee Category *</Label>
                  <Select 
                    value={formData.fee_category_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, fee_category_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {feeCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (NGN) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="Enter amount"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Term (Optional)</Label>
                  <Select 
                    value={formData.term} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, term: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select term (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Terms</SelectItem>
                      {terms.map((term) => (
                        <SelectItem key={term.value} value={term.value}>
                          {term.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAddForm(false)
                    setFormData({ class_level: '', fee_category_id: '', amount: '', term: '' })
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddFee}>
                  <Save className="h-4 w-4 mr-2" />
                  Add Fee
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fee Structure Grid */}
        <div className="grid gap-6">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : Object.keys(groupedFees).length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No fee structures configured</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by adding your first fee structure
                </p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Fee
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(groupedFees).map(([classLevel, fees]) => (
                <Card key={classLevel}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CreditCard className="h-5 w-5" />
                      <span>{classLevelToDisplay(classLevel)}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {fees.map((fee) => (
                        <div key={fee.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{fee.fee_category?.name}</div>
                            {fee.term && (
                              <div className="text-xs text-muted-foreground">
                                {fee.term.split('_').map((word: string) => 
                                  word.charAt(0).toUpperCase() + word.slice(1)
                                ).join(' ')}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {editingId === fee.id ? (
                              <EditableFeeAmount
                                initialAmount={fee.amount}
                                onSave={(amount) => handleUpdateFee(fee.id, amount)}
                                onCancel={() => setEditingId(null)}
                              />
                            ) : (
                              <>
                                <span className="font-medium text-green-600">
                                  {formatCurrency(fee.amount)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingId(fee.id)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

// Editable fee amount component
function EditableFeeAmount({ 
  initialAmount, 
  onSave, 
  onCancel 
}: { 
  initialAmount: number
  onSave: (amount: number) => void
  onCancel: () => void 
}) {
  const [amount, setAmount] = useState(initialAmount.toString())

  const handleSave = () => {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      return
    }
    onSave(numAmount)
  }

  return (
    <div className="flex items-center space-x-1">
      <Input
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-24 h-8 text-sm"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') onCancel()
        }}
      />
      <Button variant="ghost" size="sm" onClick={handleSave}>
        <Save className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onCancel}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}
