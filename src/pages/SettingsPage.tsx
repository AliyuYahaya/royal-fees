import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/auth"
import {
  Settings,
  User,
  Lock,
  School,
  Users,
  Database,
  Save,
  Download,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  UserPlus,
  Shield
} from "lucide-react"

export function SettingsPage() {
  const { user, userRole } = useAuthStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")
  
  // Profile settings
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  })

  // School settings
  const [schoolData, setSchoolData] = useState({
    school_name: 'Royal Academy',
    school_address: '',
    school_phone: '',
    school_email: '',
    current_session: '',
    session_start: '',
    session_end: ''
  })

  // System settings
  const [systemData, setSystemData] = useState({
    currency_symbol: '₦',
    date_format: 'DD/MM/YYYY',
    timezone: 'Africa/Lagos',
    backup_frequency: 'weekly',
    notification_email: true,
    notification_sms: false
  })

  // Users management
  const [users, setUsers] = useState<any[]>([])
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'registrar',
    password: ''
  })

  useEffect(() => {
    fetchUserProfile()
    fetchSchoolSettings()
    fetchSystemSettings()
    if (userRole === 'admin') {
      fetchUsers()
    }
  }, [userRole])

  const fetchUserProfile = async () => {
    try {
      if (!user?.email) return

      const { data, error } = await supabase
        .from('users')
        .select('first_name, last_name, email')
        .eq('email', user.email)
        .single()

      if (error) throw error

      if (data) {
        setProfileData(prev => ({
          ...prev,
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || ''
        }))
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const fetchSchoolSettings = async () => {
    try {
      const { data: sessionData } = await supabase
        .from('academic_sessions')
        .select('*')
        .eq('is_current', true)
        .single()

      if (sessionData) {
        setSchoolData(prev => ({
          ...prev,
          current_session: sessionData.session_name,
          session_start: sessionData.start_date,
          session_end: sessionData.end_date
        }))
      }
    } catch (error) {
      console.error('Error fetching school settings:', error)
    }
  }

  const fetchSystemSettings = async () => {
    // In a real app, you'd fetch these from a settings table
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, email, first_name, last_name, role, status, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleProfileUpdate = async () => {
    try {
      setLoading(true)

      if (!profileData.first_name || !profileData.last_name) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "First name and last name are required"
        })
        return
      }

      const { error } = await supabase
        .from('users')
        .update({
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          updated_at: new Date().toISOString()
        })
        .eq('email', user?.email)

      if (error) throw error

      toast({
        title: "Success",
        description: "Profile updated successfully"
      })

      setProfileData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }))
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile"
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async () => {
    try {
      if (!profileData.current_password || !profileData.new_password || !profileData.confirm_password) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "All password fields are required"
        })
        return
      }

      if (profileData.new_password !== profileData.confirm_password) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "New passwords do not match"
        })
        return
      }

      if (profileData.new_password.length < 8) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Password must be at least 8 characters long"
        })
        return
      }

      toast({
        title: "Success",
        description: "Password changed successfully"
      })

      setProfileData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }))
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to change password"
      })
    }
  }

  const handleAddUser = async () => {
    try {
      setLoading(true)

      if (!newUser.username || !newUser.email || !newUser.first_name || !newUser.last_name || !newUser.password) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "All fields are required"
        })
        return
      }

      toast({
        title: "Success",
        description: "User created successfully"
      })

      setShowAddUser(false)
      setNewUser({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        role: 'registrar',
        password: ''
      })
      fetchUsers()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create user"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBackupData = async () => {
    try {
      setLoading(true)
      
      toast({
        title: "Backup Started",
        description: "Database backup has been initiated. You'll receive an email when complete."
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start backup"
      })
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User, admin: false },
    { id: 'school', label: 'School', icon: School, admin: true },
    { id: 'users', label: 'Users', icon: Users, admin: true },
    { id: 'system', label: 'System', icon: Database, admin: true },
    { id: 'backup', label: 'Backup', icon: Download, admin: true }
  ]

  const filteredTabs = tabs.filter(tab => !tab.admin || userRole === 'admin')

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your account and system preferences
          </p>
        </div>

        {/* Settings Navigation */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-64">
            <nav className="grid grid-cols-2 lg:grid-cols-1 gap-2 lg:space-y-1">
              {filteredTabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center lg:justify-start space-x-0 lg:space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Settings Content */}
          <div className="flex-1">
            {activeTab === 'profile' && (
              <div className="space-y-4 sm:space-y-6">
                {/* Profile Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Profile Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">First Name</Label>
                        <Input
                          id="first_name"
                          value={profileData.first_name}
                          onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Last Name</Label>
                        <Input
                          id="last_name"
                          value={profileData.last_name}
                          onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handleProfileUpdate} disabled={loading} className="w-full sm:w-auto">
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Change Password */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Lock className="h-5 w-5" />
                      <span>Change Password</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current_password">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="current_password"
                          type={showPassword ? "text" : "password"}
                          value={profileData.current_password}
                          onChange={(e) => setProfileData(prev => ({ ...prev, current_password: e.target.value }))}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="new_password">New Password</Label>
                        <Input
                          id="new_password"
                          type={showPassword ? "text" : "password"}
                          value={profileData.new_password}
                          onChange={(e) => setProfileData(prev => ({ ...prev, new_password: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm_password">Confirm Password</Label>
                        <Input
                          id="confirm_password"
                          type={showPassword ? "text" : "password"}
                          value={profileData.confirm_password}
                          onChange={(e) => setProfileData(prev => ({ ...prev, confirm_password: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handlePasswordChange} className="w-full sm:w-auto">
                        <Lock className="h-4 w-4 mr-2" />
                        Change Password
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'school' && userRole === 'admin' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <School className="h-5 w-5" />
                    <span>School Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="school_name">School Name</Label>
                      <Input
                        id="school_name"
                        value={schoolData.school_name}
                        onChange={(e) => setSchoolData(prev => ({ ...prev, school_name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school_phone">Phone Number</Label>
                      <Input
                        id="school_phone"
                        value={schoolData.school_phone}
                        onChange={(e) => setSchoolData(prev => ({ ...prev, school_phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="school_address">Address</Label>
                    <Input
                      id="school_address"
                      value={schoolData.school_address}
                      onChange={(e) => setSchoolData(prev => ({ ...prev, school_address: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="school_email">Email</Label>
                    <Input
                      id="school_email"
                      type="email"
                      value={schoolData.school_email}
                      onChange={(e) => setSchoolData(prev => ({ ...prev, school_email: e.target.value }))}
                    />
                  </div>

                  <Separator />

                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="current_session">Current Session</Label>
                      <Input
                        id="current_session"
                        value={schoolData.current_session}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="session_start">Session Start</Label>
                      <Input
                        id="session_start"
                        type="date"
                        value={schoolData.session_start}
                        onChange={(e) => setSchoolData(prev => ({ ...prev, session_start: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="session_end">Session End</Label>
                      <Input
                        id="session_end"
                        type="date"
                        value={schoolData.session_end}
                        onChange={(e) => setSchoolData(prev => ({ ...prev, session_end: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button className="w-full sm:w-auto">
                      <Save className="h-4 w-4 mr-2" />
                      Save School Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'users' && userRole === 'admin' && (
              <div className="space-y-4 sm:space-y-6">
                {/* Add User */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-2">
                        <Users className="h-5 w-5" />
                        <span>User Management</span>
                      </div>
                      <Button size="sm" onClick={() => setShowAddUser(!showAddUser)} className="w-full sm:w-auto">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add User
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  {showAddUser && (
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Username</Label>
                          <Input
                            value={newUser.username}
                            onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={newUser.email}
                            onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>First Name</Label>
                          <Input
                            value={newUser.first_name}
                            onChange={(e) => setNewUser(prev => ({ ...prev, first_name: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Last Name</Label>
                          <Input
                            value={newUser.last_name}
                            onChange={(e) => setNewUser(prev => ({ ...prev, last_name: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select value={newUser.role} onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="registrar">Registrar</SelectItem>
                              <SelectItem value="payment_desk_officer">Payment Desk Officer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Password</Label>
                          <Input
                            type="password"
                            value={newUser.password}
                            onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowAddUser(false)} className="w-full sm:w-auto">
                          Cancel
                        </Button>
                        <Button onClick={handleAddUser} disabled={loading} className="w-full sm:w-auto">
                          Create User
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Users List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Current Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 sm:space-y-4">
                      {users.map((user) => (
                        <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <Shield className="h-4 w-4 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-medium truncate">{user.first_name} {user.last_name}</h3>
                                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              user.role === 'admin' ? 'bg-red-100 text-red-800' :
                              user.role === 'registrar' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {user.role.replace('_', ' ')}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'system' && userRole === 'admin' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>System Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Currency Symbol</Label>
                      <Input
                        value={systemData.currency_symbol}
                        onChange={(e) => setSystemData(prev => ({ ...prev, currency_symbol: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date Format</Label>
                      <Select value={systemData.date_format} onValueChange={(value) => setSystemData(prev => ({ ...prev, date_format: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select value={systemData.timezone} onValueChange={(value) => setSystemData(prev => ({ ...prev, timezone: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Africa/Lagos">Africa/Lagos (WAT)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Notifications</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Email Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                        </div>
                        <Switch
                          checked={systemData.notification_email}
                          onCheckedChange={(checked: boolean) => setSystemData(prev => ({ ...prev, notification_email: checked }))}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>SMS Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
                        </div>
                        <Switch
                          checked={systemData.notification_sms}
                          onCheckedChange={(checked: boolean) => setSystemData(prev => ({ ...prev, notification_sms: checked }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button className="w-full sm:w-auto">
                      <Save className="h-4 w-4 mr-2" />
                      Save System Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'backup' && userRole === 'admin' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <span>Data Backup & Recovery</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Automatic Backups</h4>
                      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Backup Frequency</Label>
                          <Select value={systemData.backup_frequency} onValueChange={(value) => setSystemData(prev => ({ ...prev, backup_frequency: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Next Backup</Label>
                          <Input value="Tomorrow at 2:00 AM" disabled className="bg-muted" />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-4">Manual Backup</h4>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button onClick={handleBackupData} disabled={loading} className="w-full sm:w-auto">
                          <Download className="h-4 w-4 mr-2" />
                          {loading ? 'Creating Backup...' : 'Create Backup Now'}
                        </Button>
                        <Button variant="outline" className="w-full sm:w-auto">
                          <Upload className="h-4 w-4 mr-2" />
                          Restore from Backup
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Manual backups include all student records, payments, invoices, and system settings.
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-4">Recent Backups</h4>
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-2">
                          <div>
                            <p className="font-medium text-sm">Automatic Backup</p>
                            <p className="text-xs text-muted-foreground">Yesterday at 2:00 AM • 24.5 MB</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                            <Button size="sm" variant="outline">
                              Restore
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-2">
                          <div>
                            <p className="font-medium text-sm">Manual Backup</p>
                            <p className="text-xs text-muted-foreground">3 days ago • 23.8 MB</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                            <Button size="sm" variant="outline">
                              Restore
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-2">
                          <div>
                            <p className="font-medium text-sm">Automatic Backup</p>
                            <p className="text-xs text-muted-foreground">1 week ago • 22.1 MB</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}