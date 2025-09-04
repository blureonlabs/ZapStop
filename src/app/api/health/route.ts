import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const client = supabaseAdmin || supabase;
    
    // Check if owners table exists
    const { data: owners, error: ownersError } = await client
      .from('owners')
      .select('id')
      .limit(1);

    // Check if cars table exists
    const { data: cars, error: carsError } = await client
      .from('cars')
      .select('id')
      .limit(1);

    // Check if owner_cars table exists
    const { data: ownerCars, error: ownerCarsError } = await client
      .from('owner_cars')
      .select('id')
      .limit(1);

    const health = {
      database: {
        owners: !ownersError,
        cars: !carsError,
        owner_cars: !ownerCarsError,
        owners_error: ownersError?.message,
        cars_error: carsError?.message,
        owner_cars_error: ownerCarsError?.message
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(health);
  } catch (error) {
    console.error('Error in health check:', error);
    return NextResponse.json({ 
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
