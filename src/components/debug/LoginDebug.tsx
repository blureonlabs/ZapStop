'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginDebug() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testAdminLogin = async () => {
    setLoading(true)
    setResults(null)

    try {
      console.log('=== Starting Admin Login Debug ===')
      
      // Step 1: Try to sign in as admin
      console.log('Step 1: Attempting admin login...')
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'admin@zapstop.com',
        password: 'admin123'
      })
      
      console.log('Sign in result:', { signInData, signInError })
      
      if (signInError) {
        setResults({ step: 'signin', error: signInError })
        return
      }

      // Step 2: Get current user
      console.log('Step 2: Getting current user...')
      const { data: userData, error: userError } = await supabase.auth.getUser()
      console.log('Current user:', { userData, userError })

      // Step 3: Try to query users table with current user ID
      if (userData.user) {
        console.log('Step 3: Querying users table for current user...')
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userData.user.id)
          .single()
        
        console.log('Users query result:', { usersData, usersError })

        // Step 4: Try to query all users (admin should be able to do this)
        console.log('Step 4: Querying all users (admin test)...')
        const { data: allUsersData, error: allUsersError } = await supabase
          .from('users')
          .select('*')
          .limit(5)
        
        console.log('All users query result:', { allUsersData, allUsersError })

        // Step 5: Check JWT metadata
        console.log('Step 5: Checking JWT metadata...')
        const { data: sessionData } = await supabase.auth.getSession()
        console.log('Session data:', sessionData)
        console.log('JWT payload:', sessionData.session?.access_token ? 
          JSON.parse(atob(sessionData.session.access_token.split('.')[1])) : 'No token')

        setResults({
          signIn: { data: signInData, error: signInError },
          currentUser: { data: userData, error: userError },
          userQuery: { data: usersData, error: usersError },
          allUsersQuery: { data: allUsersData, error: allUsersError },
          session: sessionData
        })
      }
    } catch (error) {
      console.error('Debug test error:', error)
      setResults({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  const checkUserExists = async () => {
    setLoading(true)
    setResults(null)

    try {
      console.log('=== Checking if admin user exists ===')
      
      // Use admin client to check if user exists in users table
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'admin@zapstop.com')
        .single()
      
      console.log('Admin user in users table:', { usersData, usersError })
      
      setResults({
        adminUserInTable: { data: usersData, error: usersError }
      })
    } catch (error) {
      console.error('Check user error:', error)
      setResults({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-yellow-50">
      <h3 className="text-lg font-semibold mb-4">Admin Login Debug Tool</h3>
      <div className="space-x-2 mb-4">
        <button
          onClick={testAdminLogin}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Admin Login'}
        </button>
        <button
          onClick={checkUserExists}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Check User Exists'}
        </button>
      </div>
      
      {results && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Debug Results:</h4>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
