import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = supabaseAdmin || supabase;
    const { id } = await params;

    // Get owner's assigned cars
    const { data: ownerCars, error } = await client
      .from('owner_cars')
      .select(`
        id,
        assigned_at,
        car_id,
        cars (
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
        )
      `)
      .eq('owner_id', id)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Error fetching owner cars:', error);
      return NextResponse.json({ error: 'Failed to fetch owner cars' }, { status: 500 });
    }

    return NextResponse.json({ ownerCars });
  } catch (error) {
    console.error('Error in GET /api/owners/[id]/cars:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = supabaseAdmin || supabase;
    const { id } = await params;
    const body = await request.json();
    const { carIds } = body;

    if (!carIds || !Array.isArray(carIds) || carIds.length === 0) {
      return NextResponse.json({ error: 'Car IDs are required' }, { status: 400 });
    }

    // Check if owner exists
    const { data: owner } = await client
      .from('owners')
      .select('id')
      .eq('id', id)
      .single();

    if (!owner) {
      return NextResponse.json({ error: 'Owner not found' }, { status: 404 });
    }

    // Check if cars exist and are not already assigned to this owner
    const { data: existingAssignments } = await client
      .from('owner_cars')
      .select('car_id')
      .eq('owner_id', id)
      .in('car_id', carIds);

    const alreadyAssigned = existingAssignments?.map(assignment => assignment.car_id) || [];
    const newCarIds = carIds.filter(carId => !alreadyAssigned.includes(carId));

    if (newCarIds.length === 0) {
      return NextResponse.json({ error: 'All selected cars are already assigned to this owner' }, { status: 400 });
    }

    // Create new assignments
    const assignments = newCarIds.map(carId => ({
      owner_id: id,
      car_id: carId
    }));

    const { data: newAssignments, error } = await client
      .from('owner_cars')
      .insert(assignments)
      .select(`
        id,
        assigned_at,
        car_id,
        cars (
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
        )
      `);

    if (error) {
      console.error('Error assigning cars to owner:', error);
      return NextResponse.json({ error: 'Failed to assign cars to owner' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: `Successfully assigned ${newCarIds.length} car(s) to owner`,
      assignments: newAssignments
    });
  } catch (error) {
    console.error('Error in POST /api/owners/[id]/cars:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
