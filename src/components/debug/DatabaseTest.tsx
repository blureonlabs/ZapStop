'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DatabaseTest() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testDatabaseConnection = async () => {
    setLoading(true)
    setResults(null)

    try {
      // Test 1: Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser()
      console.log('Current user:', userData, userError)

      // Test 2: Try to query users table
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(1)

      console.log('Users query:', usersData, usersError)

      // Test 3: Try to query specific user if we have a user
      let specificUserData = null
      let specificUserError = null
      if (userData.user) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userData.user.id)
          .single()
        
        specificUserData = data
        specificUserError = error
        console.log('Specific user query:', data, error)
      }

      setResults({
        currentUser: userData,
        userError,
        usersQuery: usersData,
        usersError,
        specificUser: specificUserData,
        specificUserError
      })
    } catch (error) {
      console.error('Test error:', error)
      setResults({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Database Connection Test</h3>
      <button
        onClick={testDatabaseConnection}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Database Connection'}
      </button>
      
      {results && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Results:</h4>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
