'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { apiService, User } from '@/lib/api'

interface BackendAuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: unknown }>
  signOut: () => Promise<void>
}

const BackendAuthContext = createContext<BackendAuthContextType | undefined>(undefined)

export function BackendAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if there's a stored token
    const token = localStorage.getItem('auth_token')
    if (token) {
      // Verify token by getting current user
      apiService.getCurrentUser()
        .then((userData) => {
          setUser(userData)
        })
        .catch(() => {
          // Token is invalid, clear it
          localStorage.removeItem('auth_token')
          apiService.clearToken()
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password)
      
      // Store token in localStorage
      localStorage.setItem('auth_token', response.access_token)
      apiService.setToken(response.access_token)
      
      // Get user data
      const userData = await apiService.getCurrentUser()
      setUser(userData)
      
      return { error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      return { error }
    }
  }

  const signOut = async () => {
    try {
      // Clear token from localStorage
      localStorage.removeItem('auth_token')
      apiService.clearToken()
      setUser(null)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signOut,
  }

  return <BackendAuthContext.Provider value={value}>{children}</BackendAuthContext.Provider>
}

export function useBackendAuth() {
  const context = useContext(BackendAuthContext)
  if (context === undefined) {
    throw new Error('useBackendAuth must be used within a BackendAuthProvider')
  }
  return context
}
