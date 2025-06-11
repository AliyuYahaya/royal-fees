import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import type { UserRole } from '@/types/database'

interface AuthState {
  user: User | null
  userRole: UserRole | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  setUserRole: (role: UserRole | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  userRole: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ 
    user, 
    isAuthenticated: !!user,
    isLoading: false 
  }),
  setUserRole: (userRole) => set({ userRole }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ 
    user: null, 
    userRole: null, 
    isAuthenticated: false,
    isLoading: false 
  }),
}))
