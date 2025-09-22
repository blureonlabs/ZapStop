'use client'

import CreateOwnerForm from '@/components/forms/CreateOwnerForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, UserPlus, Key, Shield } from 'lucide-react'

export default function TestOwnerCreationPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Owner Creation Test
          </h1>
          <p className="text-gray-600">
            Test the new owner creation functionality with password authentication
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Features Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span>New Features</span>
              </CardTitle>
              <CardDescription>
                What's new in owner creation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <Key className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold">Password Authentication</h3>
                  <p className="text-sm text-gray-600">
                    Owners can now login with email and password
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <UserPlus className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold">Dual Table Creation</h3>
                  <p className="text-sm text-gray-600">
                    Creates records in both users and owners tables
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold">Auto Email Confirmation</h3>
                  <p className="text-sm text-gray-600">
                    Owners can login immediately without email verification
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Card */}
          <CreateOwnerForm 
            onSuccess={() => {
              console.log('Owner created successfully!')
            }}
          />
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How to Test</CardTitle>
            <CardDescription>
              Follow these steps to test the owner creation functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Fill out the owner creation form with valid details</li>
              <li>Click "Create Owner" to submit the form</li>
              <li>Check the success message confirming owner creation</li>
              <li>Go to the login page and try logging in with the owner credentials</li>
              <li>Verify that the owner can access the Owner Dashboard</li>
              <li>Check your Supabase dashboard to see the created records in both users and owners tables</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
