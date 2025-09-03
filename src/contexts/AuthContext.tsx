'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, User as AppUser } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  appUser: AppUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: unknown }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchAppUser(session.user.id)
      } else {
        setAppUser(null)
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchAppUser(session.user.id)
      } else {
        setAppUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchAppUser = async (userId: string) => {
    try {
      console.log('Fetching app user for ID:', userId)
      console.log('Current auth user:', await supabase.auth.getUser())
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      console.log('Query result:', { data, error })

      if (error) {
        console.error('Error fetching app user:', {
          error,
          userId,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          fullError: JSON.stringify(error, null, 2)
        })
        setAppUser(null)
      } else {
        console.log('Successfully fetched app user:', data)
        setAppUser(data)
      }
    } catch (error) {
      console.error('Exception fetching app user:', {
        error,
        userId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        fullError: JSON.stringify(error, null, 2)
      })
      setAppUser(null)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
      
      if (error) {
        console.error('Sign in error details:', error)
    return { error }
  }

      console.log('Sign in successful:', data)
      return { error: null }
    } catch (err) {
      console.error('Sign in exception:', err)
      return { error: err }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    user,
    appUser,
    loading,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
