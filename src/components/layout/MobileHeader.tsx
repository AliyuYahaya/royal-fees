import { useAuthStore } from "@/store/auth"
import { Button } from "@/components/ui/button"
import { Menu, LogOut } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { auth } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import Logo from "@/assets/logo.png"

interface MobileHeaderProps {
  onMenuToggle: () => void
}

export function MobileHeader({ onMenuToggle }: MobileHeaderProps) {
  const { user, userRole, logout } = useAuthStore()
  const navigate = useNavigate()
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

  return (
    <header className="bg-card border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Menu button and logo */}
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="h-9 w-9"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <img src={Logo} alt="Logo" className="h-8 w-8" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold">Royal Fees</h1>
            </div>
          </div>
        </div>

        {/* Right side - User info and logout */}
        <div className="flex items-center space-x-2">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium truncate max-w-32">
              {user?.email}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {userRole?.replace("_", " ")}
            </p>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-9 w-9"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
