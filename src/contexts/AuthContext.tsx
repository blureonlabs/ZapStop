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
  const [loading, setLoading] = useState(false) // Start with false for faster initial render

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', { hasUser: !!session?.user, userId: session?.user?.id })
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchAppUser(session.user.id)
      } else {
        console.log('No initial session, setting loading to false')
        setAppUser(null)
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.id)
      
      // Handle different auth events
      if (event === 'SIGNED_OUT' || !session?.user) {
        console.log('User signed out or no session')
        setUser(null)
        setAppUser(null)
        setLoading(false)
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('SIGNED_IN or TOKEN_REFRESHED event, fetching app user...')
        setUser(session.user)
        // Fire-and-forget to avoid blocking the auth state change callback
        fetchAppUser(session.user.id).catch((error) => {
          console.error('Error in fetchAppUser from onAuthStateChange:', error)
        })
      } else if (event === 'USER_UPDATED') {
        console.log('USER_UPDATED event - keeping current session')
        // Don't change user state on USER_UPDATED events (like password changes)
        // Just refresh the app user data if we have a current user
        if (session.user && user?.id === session.user.id) {
          fetchAppUser(session.user.id).catch((error) => {
            console.error('Error refreshing app user after USER_UPDATED:', error)
          })
        }
      } else {
        console.log('Unhandled auth event:', event)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchAppUser = async (userId: string) => {
    console.log('fetchAppUser called with userId:', userId)
    try {
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('fetchAppUser timeout')), 10000)
      })
      
      const fetchPromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any

      if (error) {
        console.error('Error fetching app user:', {
          message: error.message || 'No message',
          code: error.code || 'No code',
          details: error.details || 'No details',
          hint: error.hint || 'No hint',
          fullError: error
        })
        // If user doesn't exist in database, try to find by email first
        if (error.code === 'PGRST116') {
          console.log('User not found in database by ID, trying to find by email...')
          
          // Get user email from Supabase auth user if available
          const authUser = user || await supabase.auth.getUser().then(({ data }) => data.user)
          const userEmail = authUser?.email
          
          console.log('Auth user details:', {
            id: authUser?.id,
            email: authUser?.email,
            user_metadata: authUser?.user_metadata,
            app_metadata: authUser?.app_metadata
          })
          
          if (userEmail) {
            // Try to find user by email first
            const { data: existingUser, error: emailError } = await supabase
              .from('users')
              .select('*')
              .eq('email', userEmail)
              .single()
            
            if (emailError) {
              console.log('User not found by email either, creating new user...')
              console.log('Creating user with ID:', userId)
              
              const userName = authUser?.user_metadata?.full_name || 'Admin User'
              const userRole = authUser?.user_metadata?.role || 'admin' // Use role from metadata, default to admin
              
              const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({
                  id: userId,
                  name: userName,
                  email: userEmail,
                  role: userRole,
                  phone: '+971501234567',
                  assigned_car_id: null
                })
                .select()
                .single()

              if (createError) {
                console.error('Error creating user - Full error object:', JSON.stringify(createError, null, 2))
                console.error('Error details:', {
                  message: createError.message || 'No message',
                  details: createError.details || 'No details',
                  hint: createError.hint || 'No hint',
                  code: createError.code || 'No code'
                })
                
                // If it's a duplicate key error (user already exists), try to fetch the existing user
                if (createError.code === '23505') {
                  console.log('User already exists (duplicate key), fetching existing user...')
                  
                  // Try to find user by email first (more reliable than ID)
                  const { data: existingUser, error: fetchError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', userEmail)
                    .single()
                  
                  if (fetchError) {
                    console.error('Error fetching existing user by email:', {
                      message: fetchError.message || 'No message',
                      code: fetchError.code || 'No code',
                      details: fetchError.details || 'No details'
                    })
                    console.warn('Failed to fetch existing user, keeping current session')
                  } else {
                    console.log('Found existing user by email:', existingUser)
                    setAppUser(existingUser)
                  }
                } else {
                  // Don't set appUser to null on error - keep current state
                  console.warn('Failed to create user, keeping current session')
                }
              } else {
                console.log('User created successfully:', newUser)
                setAppUser(newUser)
              }
            } else {
              console.log('Found existing user by email:', existingUser)
              setAppUser(existingUser)
            }
          } else {
            console.log('No email available, trying to create user with fallback email...')
            
            // Try to create a user with a fallback email based on user ID
            const fallbackEmail = `user-${userId}@zapstop.com`
            const userName = authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || 'User'
            const userRole = authUser?.user_metadata?.role || authUser?.app_metadata?.role || 'driver'
            
            console.log('Creating user with fallback email:', {
              id: userId,
              email: fallbackEmail,
              name: userName,
              role: userRole
            })
            
            const { data: newUser, error: createError } = await supabase
              .from('users')
              .insert({
                id: userId,
                name: userName,
                email: fallbackEmail,
                role: userRole,
                phone: '+971501234567',
                assigned_car_id: null
              })
              .select()
              .single()

            if (createError) {
              console.error('Error creating user with fallback email:', {
                message: createError.message || 'No message',
                code: createError.code || 'No code',
                details: createError.details || 'No details'
              })
              console.warn('Failed to create user, keeping current session')
            } else {
              console.log('User created successfully with fallback email:', newUser)
              setAppUser(newUser)
            }
          }
        } else {
          // For other errors, don't immediately log out - just log the error
          console.warn('Failed to fetch user data, keeping current session:', {
            message: error.message || 'No message',
            code: error.code || 'No code',
            details: error.details || 'No details',
            fullError: error
          })
        }
      } else {
        setAppUser(data)
      }
    } catch (error) {
      console.error('Exception fetching app user:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        fullError: error
      })
      // Don't set appUser to null on exception - keep current state
      console.warn('Exception fetching user data, keeping current session')
    } finally {
      console.log('fetchAppUser finally block - setting loading to false')
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      console.log('AuthContext signIn called with email:', email)
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('Supabase Anon Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      
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
    try {
      console.log('Signing out user...')
      await supabase.auth.signOut()
      
      // Clear local state immediately
      setUser(null)
      setAppUser(null)
      setLoading(false)
      
      console.log('User signed out successfully')
    } catch (error) {
      console.error('Error during sign out:', error)
      // Even if there's an error, clear local state
      setUser(null)
      setAppUser(null)
      setLoading(false)
      throw error
    }
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
