import { serve } from 'https://deno.land/std@0.178.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OwnerData {
  name: string
  email: string
  password: string
  phone?: string
  address?: string
  emergency_contact?: string
  emergency_phone?: string
  notes?: string
}

interface CarAssignment {
  car_id: string
  assigned_at?: string
}

interface CreateOwnerRequest {
  action: 'create' | 'update' | 'delete' | 'get' | 'list'
  ownerData?: OwnerData
  ownerId?: string
  carAssignments?: CarAssignment[]
  filters?: {
    search?: string
    limit?: number
    offset?: number
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, ownerData, ownerId, carAssignments, filters }: CreateOwnerRequest = await req.json()

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Action is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    switch (action) {
      case 'create': {
        if (!ownerData) {
          return new Response(
            JSON.stringify({ success: false, error: 'Owner data is required for create action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Validate required fields
        if (!ownerData.name || !ownerData.email || !ownerData.password) {
          return new Response(
            JSON.stringify({ success: false, error: 'Name, email, and password are required' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Check if owner with same email already exists in both owners and users tables
        const [ownersCheck, usersCheck] = await Promise.all([
          supabaseClient.from('owners').select('id').eq('email', ownerData.email).single(),
          supabaseClient.from('users').select('id').eq('email', ownerData.email).single()
        ])

        if (ownersCheck.data || usersCheck.data) {
          return new Response(
            JSON.stringify({ success: false, error: 'User with this email already exists' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Create user in Supabase Auth using Admin API
        const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
          email: ownerData.email.trim().toLowerCase(),
          password: ownerData.password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            name: ownerData.name.trim(),
            role: 'owner'
          },
          app_metadata: {
            role: 'owner'
          }
        })

        if (authError) {
          console.error('Auth error:', authError)
          return new Response(
            JSON.stringify({ success: false, error: authError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        if (!authData.user) {
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to create user in Supabase Auth' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        // Create user record in users table
        const { data: userData, error: userError } = await supabaseClient
          .from('users')
          .insert([{
            id: authData.user.id,
            name: ownerData.name.trim(),
            email: ownerData.email.trim().toLowerCase(),
            phone: ownerData.phone?.trim() || null,
            role: 'owner'
          }])
          .select()
          .single()

        if (userError) {
          console.error('User creation error:', userError)
          // If user record creation fails, clean up the auth user
          await supabaseClient.auth.admin.deleteUser(authData.user.id)
          return new Response(
            JSON.stringify({ success: false, error: userError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        // Create owner record in owners table
        const { data: newOwner, error: ownerError } = await supabaseClient
          .from('owners')
          .insert([{
            id: authData.user.id, // Use same ID as user
            name: ownerData.name.trim(),
            email: ownerData.email.trim().toLowerCase(),
            phone: ownerData.phone?.trim() || null,
            address: ownerData.address?.trim() || null,
          }])
          .select()
          .single()

        if (ownerError) {
          console.error('Error creating owner:', ownerError)
          // If owner record creation fails, clean up both auth user and user record
          await supabaseClient.auth.admin.deleteUser(authData.user.id)
          await supabaseClient.from('users').delete().eq('id', authData.user.id)
          return new Response(
            JSON.stringify({ success: false, error: ownerError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        // Assign cars if provided
        if (carAssignments && carAssignments.length > 0) {
          const assignments = carAssignments.map(assignment => ({
            owner_id: newOwner.id,
            car_id: assignment.car_id,
            assigned_at: assignment.assigned_at || new Date().toISOString()
          }))

          const { error: assignmentError } = await supabaseClient
            .from('owner_cars')
            .insert(assignments)

          if (assignmentError) {
            console.warn('Error assigning cars to owner:', assignmentError)
            // Don't fail the entire operation, just log the warning
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: newOwner,
            user: userData,
            message: 'Owner created successfully with authentication. Owner can now login to the dashboard.'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'update': {
        if (!ownerId || !ownerData) {
          return new Response(
            JSON.stringify({ success: false, error: 'Owner ID and data are required for update action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Check if owner exists
        const { data: existingOwner } = await supabaseClient
          .from('owners')
          .select('id')
          .eq('id', ownerId)
          .single()

        if (!existingOwner) {
          return new Response(
            JSON.stringify({ success: false, error: 'Owner not found' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            }
          )
        }

        // Update owner
        const { data: updatedOwner, error: updateError } = await supabaseClient
          .from('owners')
          .update({
            name: ownerData.name,
            email: ownerData.email,
            phone: ownerData.phone || null,
            address: ownerData.address || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', ownerId)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating owner:', updateError)
          return new Response(
            JSON.stringify({ success: false, error: updateError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: updatedOwner,
            message: 'Owner updated successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'delete': {
        if (!ownerId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Owner ID is required for delete action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Check if owner has cars assigned
        const { data: assignedCars } = await supabaseClient
          .from('owner_cars')
          .select('id')
          .eq('owner_id', ownerId)

        if (assignedCars && assignedCars.length > 0) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Cannot delete owner with assigned cars. Please unassign cars first.' 
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Delete owner
        const { error: deleteError } = await supabaseClient
          .from('owners')
          .delete()
          .eq('id', ownerId)

        if (deleteError) {
          console.error('Error deleting owner:', deleteError)
          return new Response(
            JSON.stringify({ success: false, error: deleteError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Owner deleted successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'get': {
        if (!ownerId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Owner ID is required for get action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Get owner with cars
        const { data: owner, error: ownerError } = await supabaseClient
          .from('owners_with_cars')
          .select('*')
          .eq('id', ownerId)
          .single()

        if (ownerError) {
          if (ownerError.code === 'PGRST116') {
            return new Response(
              JSON.stringify({ success: false, error: 'Owner not found' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
              }
            )
          }
          console.error('Error fetching owner:', ownerError)
          return new Response(
            JSON.stringify({ success: false, error: ownerError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: owner
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'list': {
        // Get all owners with cars
        let query = supabaseClient
          .from('owners_with_cars')
          .select('*')
          .order('created_at', { ascending: false })

        // Apply filters
        if (filters?.search) {
          query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
        }

        if (filters?.limit) {
          query = query.limit(filters.limit)
        }

        if (filters?.offset) {
          query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
        }

        const { data: owners, error: ownersError } = await query

        if (ownersError) {
          console.error('Error fetching owners:', ownersError)
          return new Response(
            JSON.stringify({ success: false, error: ownersError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: owners || []
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
    }
  } catch (error) {
    console.error('Error in manage-owners Edge Function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
