import { serve } from 'https://deno.land/std@0.178.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CarData {
  plate_number: string
  model: string
  monthly_due: number
  assigned_driver_id?: string
  owner_id?: string
  year?: number
  color?: string
  vin?: string
  insurance_expiry?: string
  registration_expiry?: string
  notes?: string
}

interface CreateCarRequest {
  action: 'create' | 'update' | 'delete' | 'get' | 'list' | 'assign_driver' | 'unassign_driver'
  carData?: CarData
  carId?: string
  driverId?: string
  ownerId?: string
  filters?: {
    search?: string
    owner_id?: string
    assigned_driver_id?: string
    unassigned?: boolean
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
    const { action, carData, carId, driverId, ownerId, filters }: CreateCarRequest = await req.json()

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
        if (!carData) {
          return new Response(
            JSON.stringify({ success: false, error: 'Car data is required for create action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Validate required fields
        if (!carData.plate_number || !carData.model || !carData.monthly_due) {
          return new Response(
            JSON.stringify({ success: false, error: 'Plate number, model, and monthly due are required' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Check if car with same plate number already exists
        const { data: existingCar } = await supabaseClient
          .from('cars')
          .select('id')
          .eq('plate_number', carData.plate_number)
          .single()

        if (existingCar) {
          return new Response(
            JSON.stringify({ success: false, error: 'Car with this plate number already exists' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Create car
        const { data: newCar, error: carError } = await supabaseClient
          .from('cars')
          .insert([{
            plate_number: carData.plate_number,
            model: carData.model,
            monthly_due: carData.monthly_due,
            assigned_driver_id: carData.assigned_driver_id || null,
            owner_id: carData.owner_id || null,
          }])
          .select(`
            id,
            plate_number,
            model,
            monthly_due,
            assigned_driver_id,
            owner_id,
            created_at,
            updated_at,
            users!cars_assigned_driver_id_fkey (
              id,
              name,
              email
            )
          `)
          .single()

        if (carError) {
          console.error('Error creating car:', carError)
          return new Response(
            JSON.stringify({ success: false, error: carError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: newCar,
            message: 'Car created successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'update': {
        if (!carId || !carData) {
          return new Response(
            JSON.stringify({ success: false, error: 'Car ID and data are required for update action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Check if car exists
        const { data: existingCar } = await supabaseClient
          .from('cars')
          .select('id')
          .eq('id', carId)
          .single()

        if (!existingCar) {
          return new Response(
            JSON.stringify({ success: false, error: 'Car not found' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            }
          )
        }

        // Update car
        const { data: updatedCar, error: updateError } = await supabaseClient
          .from('cars')
          .update({
            plate_number: carData.plate_number,
            model: carData.model,
            monthly_due: carData.monthly_due,
            assigned_driver_id: carData.assigned_driver_id || null,
            owner_id: carData.owner_id || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', carId)
          .select(`
            id,
            plate_number,
            model,
            monthly_due,
            assigned_driver_id,
            owner_id,
            created_at,
            updated_at,
            users!cars_assigned_driver_id_fkey (
              id,
              name,
              email
            )
          `)
          .single()

        if (updateError) {
          console.error('Error updating car:', updateError)
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
            data: updatedCar,
            message: 'Car updated successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'delete': {
        if (!carId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Car ID is required for delete action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Check if car has driver assigned
        const { data: assignedDriver } = await supabaseClient
          .from('cars')
          .select('assigned_driver_id')
          .eq('id', carId)
          .single()

        if (assignedDriver?.assigned_driver_id) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Cannot delete car with assigned driver. Please unassign driver first.' 
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Delete car
        const { error: deleteError } = await supabaseClient
          .from('cars')
          .delete()
          .eq('id', carId)

        if (deleteError) {
          console.error('Error deleting car:', deleteError)
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
            message: 'Car deleted successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'assign_driver': {
        if (!carId || !driverId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Car ID and driver ID are required for assign_driver action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Check if car exists
        const { data: car } = await supabaseClient
          .from('cars')
          .select('id, assigned_driver_id')
          .eq('id', carId)
          .single()

        if (!car) {
          return new Response(
            JSON.stringify({ success: false, error: 'Car not found' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            }
          )
        }

        // Check if driver exists
        const { data: driver } = await supabaseClient
          .from('users')
          .select('id, role')
          .eq('id', driverId)
          .eq('role', 'driver')
          .single()

        if (!driver) {
          return new Response(
            JSON.stringify({ success: false, error: 'Driver not found or invalid role' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            }
          )
        }

        // Check if driver is already assigned to another car
        const { data: existingAssignment } = await supabaseClient
          .from('cars')
          .select('id, plate_number')
          .eq('assigned_driver_id', driverId)
          .neq('id', carId)
          .single()

        if (existingAssignment) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Driver is already assigned to car ${existingAssignment.plate_number}` 
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Assign driver to car
        const { data: updatedCar, error: assignError } = await supabaseClient
          .from('cars')
          .update({ assigned_driver_id: driverId })
          .eq('id', carId)
          .select(`
            id,
            plate_number,
            model,
            monthly_due,
            assigned_driver_id,
            users!cars_assigned_driver_id_fkey (
              id,
              name,
              email
            )
          `)
          .single()

        if (assignError) {
          console.error('Error assigning driver to car:', assignError)
          return new Response(
            JSON.stringify({ success: false, error: assignError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: updatedCar,
            message: 'Driver assigned to car successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'unassign_driver': {
        if (!carId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Car ID is required for unassign_driver action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Unassign driver from car
        const { data: updatedCar, error: unassignError } = await supabaseClient
          .from('cars')
          .update({ assigned_driver_id: null })
          .eq('id', carId)
          .select(`
            id,
            plate_number,
            model,
            monthly_due,
            assigned_driver_id
          `)
          .single()

        if (unassignError) {
          console.error('Error unassigning driver from car:', unassignError)
          return new Response(
            JSON.stringify({ success: false, error: unassignError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: updatedCar,
            message: 'Driver unassigned from car successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'get': {
        if (!carId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Car ID is required for get action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Get car with driver info
        const { data: car, error: carError } = await supabaseClient
          .from('cars')
          .select(`
            id,
            plate_number,
            model,
            monthly_due,
            assigned_driver_id,
            owner_id,
            created_at,
            updated_at,
            users!cars_assigned_driver_id_fkey (
              id,
              name,
              email
            )
          `)
          .eq('id', carId)
          .single()

        if (carError) {
          if (carError.code === 'PGRST116') {
            return new Response(
              JSON.stringify({ success: false, error: 'Car not found' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
              }
            )
          }
          console.error('Error fetching car:', carError)
          return new Response(
            JSON.stringify({ success: false, error: carError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: car
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'list': {
        // Get all cars with driver info
        let query = supabaseClient
          .from('cars')
          .select(`
            id,
            plate_number,
            model,
            monthly_due,
            assigned_driver_id,
            owner_id,
            created_at,
            updated_at,
            users!cars_assigned_driver_id_fkey (
              id,
              name,
              email
            )
          `)
          .order('plate_number', { ascending: true })

        // Apply filters
        if (filters?.search) {
          query = query.or(`plate_number.ilike.%${filters.search}%,model.ilike.%${filters.search}%`)
        }

        if (filters?.owner_id) {
          query = query.eq('owner_id', filters.owner_id)
        }

        if (filters?.assigned_driver_id) {
          query = query.eq('assigned_driver_id', filters.assigned_driver_id)
        }

        if (filters?.unassigned) {
          query = query.is('assigned_driver_id', null)
        }

        if (filters?.limit) {
          query = query.limit(filters.limit)
        }

        if (filters?.offset) {
          query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
        }

        const { data: cars, error: carsError } = await query

        if (carsError) {
          console.error('Error fetching cars:', carsError)
          return new Response(
            JSON.stringify({ success: false, error: carsError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: cars || []
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
    console.error('Error in manage-cars Edge Function:', error)
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
