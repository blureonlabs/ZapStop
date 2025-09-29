import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Use admin client for server-side operations
    const client = supabaseAdmin || supabase;
    
    // First try to get owners with cars using the view
    let { data: owners, error } = await client
      .from('owners_with_cars')
      .select('*')
      .order('created_at', { ascending: false });

    // If the view doesn't exist, fall back to basic owners query
    if (error && error.code === 'PGRST116') {
      console.log('owners_with_cars view not found, falling back to basic query');
      const { data: basicOwners, error: basicError } = await client
        .from('owners')
        .select(`
          *,
          owner_cars (
            id,
            assigned_at,
            car_id,
            cars (
              id,
              plate_number,
              model,
              monthly_due,
              assigned_driver_id
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (basicError) {
        console.error('Error fetching owners (basic query):', basicError);
        return NextResponse.json({ error: 'Failed to fetch owners' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
      }

      // Transform the data to match the expected format
      owners = basicOwners?.map(owner => ({
        ...owner,
        total_cars: owner.owner_cars?.length || 0,
        cars: owner.owner_cars?.map(oc => oc.cars).filter(Boolean) || []
      })) || [];
    } else if (error) {
      console.error('Error fetching owners:', error);
      return NextResponse.json({ error: 'Failed to fetch owners' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.json({ owners: owners || [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error in GET /api/owners:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Use admin client for server-side operations
    const client = supabaseAdmin || supabase;
    
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { name, email, phone, address, documents, document_expiry_date } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Check if email already exists
    const { data: existingOwner, error: checkError } = await client
      .from('owners')
      .select('id')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing owner:', checkError);
      return NextResponse.json({ error: 'Failed to check existing owner' }, { status: 500 });
    }

    if (existingOwner) {
      return NextResponse.json({ error: 'Owner with this email already exists' }, { status: 400 });
    }

    // Create new owner
    const { data: owner, error } = await client
      .from('owners')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        documents: documents || null,
        document_expiry_date: document_expiry_date || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating owner:', error);
      
      // Handle specific database errors
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Owner with this email already exists' }, { status: 400 });
      }
      
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Owners table not found. Please run the database migration first.' }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to create owner', 
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      owner,
      message: 'Owner created successfully' 
    });
  } catch (error) {
    console.error('Error in POST /api/owners:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
