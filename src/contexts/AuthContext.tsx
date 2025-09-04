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
        fetchAppUser(session.user.id)
      } else {
        setAppUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchAppUser = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching app user:', error)
        // If user doesn't exist in database, create a default admin user
        if (error.code === 'PGRST116') {
          console.log('User not found in database, creating default admin user...')
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              id: userId,
              name: 'Admin User',
              email: 'admin@zapstop.com',
              role: 'admin',
              phone: '+971501234567',
              assigned_car_id: null
            })
            .select()
            .single()

          if (createError) {
            console.error('Error creating user:', createError)
            setAppUser(null)
          } else {
            setAppUser(newUser)
          }
        } else {
          setAppUser(null)
        }
      } else {
        setAppUser(data)
      }
    } catch (error) {
      console.error('Exception fetching app user:', error)
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
      
      // Wait for the user state to be updated
      if (data.user) {
        await fetchAppUser(data.user.id)
      }
      
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
