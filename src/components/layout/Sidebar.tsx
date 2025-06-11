import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/auth"
import { auth } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import Logo from "@/assets/logo.png"
import {
  LayoutDashboard,
  Users,
  Receipt,
  CreditCard,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  UserPlus,
  Banknote,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  className?: string
  onClose?: () => void
}

export function Sidebar({ className, onClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, userRole, logout } = useAuthStore()
  const { toast } = useToast()

  const handleLogout = async () => {
    try {
      await auth.signOut()
      logout()
      navigate("/login")
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to log out",
      })
    }
  }

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      roles: ["admin", "registrar", "payment_desk_officer"]
    },
    {
      name: "Students",
      href: "/students",
      icon: Users,
      roles: ["admin", "registrar"]
    },
    {
      name: "Add Student",
      href: "/students/add",
      icon: UserPlus,
      roles: ["admin", "registrar"]
    },
    {
      name: "Invoices",
      href: "/invoices",
      icon: Receipt,
      roles: ["admin", "payment_desk_officer"]
    },
    {
      name: "Payments",
      href: "/payments",
      icon: Banknote,
      roles: ["admin", "registrar", "payment_desk_officer"]
    },
    {
      name: "Fee Structure",
      href: "/fee-structure",
      icon: CreditCard,
      roles: ["admin"]
    },
    {
      name: "Reports",
      href: "/reports",
      icon: FileText,
      roles: ["admin"]
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      roles: ["admin"]
    }
  ]

  const filteredNavigation = navigation.filter(item => 
    userRole && item.roles.includes(userRole)
  )

  const handleNavClick = () => {
    if (onClose) {
      onClose()
    }
  }

  return (
    <div className={cn(
      "flex flex-col h-full bg-card border-r border-border",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="rounded-lg">
              <img src={Logo} alt="Logo" className="h-10 w-10 sm:h-12 sm:w-12" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold">Royal Fees</h2>
              <p className="text-xs text-muted-foreground">Fee Management</p>
            </div>
          </div>
        )}
        
        {/* Close button for mobile, collapse button for desktop */}
        <div className="flex items-center space-x-1">
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 lg:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 hidden lg:flex"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 sm:p-4 space-y-1 sm:space-y-2 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href
          
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={handleNavClick}
              className={cn(
                "flex items-center space-x-3 px-3 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
                collapsed && "justify-center"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User Info */}
      <div className="p-3 sm:p-4 border-t border-border">
        {!collapsed && (
          <div className="mb-3">
            <p className="text-sm font-medium truncate">
              {user?.email}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {userRole?.replace("_", " ")}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          onClick={handleLogout}
          className={cn(
            "w-full",
            collapsed ? "h-8 w-8" : "justify-start"
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </div>
  )
}
