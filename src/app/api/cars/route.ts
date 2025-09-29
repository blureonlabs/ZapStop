import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const client = supabaseAdmin || supabase;
    const { searchParams } = new URL(request.url);
    const excludeOwnerId = searchParams.get('excludeOwnerId');
    
    // Get all cars with their assigned drivers
    let query = client
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
      `);

    // If excludeOwnerId is provided, show only cars NOT assigned to any owner
    // OR cars assigned to the current owner (so they can be reassigned)
    if (excludeOwnerId) {
      query = query.or(`owner_id.is.null,owner_id.eq.${excludeOwnerId}`);
    } else {
      // If no excludeOwnerId, show only unassigned cars
      query = query.is('owner_id', null);
    }

    const { data: cars, error } = await query.order('plate_number', { ascending: true });

    if (error) {
      console.error('Error fetching cars:', error);
      return NextResponse.json({ error: 'Failed to fetch cars' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.json({ cars: cars || [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error in GET /api/cars:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
