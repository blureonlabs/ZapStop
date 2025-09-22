import { NextRequest, NextResponse } from 'next/server';
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
        return NextResponse.json({ error: 'Failed to fetch owners' }, { status: 500 });
      }

      // Transform the data to match the expected format
      owners = basicOwners?.map(owner => ({
        ...owner,
        total_cars: owner.owner_cars?.length || 0,
        cars: owner.owner_cars?.map(oc => oc.cars).filter(Boolean) || []
      })) || [];
    } else if (error) {
      console.error('Error fetching owners:', error);
      return NextResponse.json({ error: 'Failed to fetch owners' }, { status: 500 });
    }

    return NextResponse.json({ owners: owners || [] });
  } catch (error) {
    console.error('Error in GET /api/owners:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

    const { name, email, password, phone, address, documents, document_expiry_date } = body;

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Check if email already exists in both owners and users tables
    const [ownersCheck, usersCheck] = await Promise.all([
      client.from('owners').select('id').eq('email', email).single(),
      client.from('users').select('id').eq('email', email).single()
    ]);

    if (ownersCheck.data || usersCheck.data) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Create user in Supabase Auth using Admin API
    const { data: authData, error: authError } = await client.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: name.trim(),
        role: 'owner'
      },
      app_metadata: {
        role: 'owner'
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      if (authError.message.includes('already registered')) {
        return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user in Supabase Auth' }, { status: 500 });
    }

    // Create user record in users table
    const { data: userData, error: userError } = await client
      .from('users')
      .insert([{
        id: authData.user.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        role: 'owner'
      }])
      .select()
      .single();

    if (userError) {
      console.error('User creation error:', userError);
      // If user record creation fails, clean up the auth user
      await client.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // Create owner record in owners table
    const { data: owner, error: ownerError } = await client
      .from('owners')
      .insert({
        id: authData.user.id, // Use same ID as user
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        documents: documents || null,
        document_expiry_date: document_expiry_date || null
      })
      .select()
      .single();

    if (ownerError) {
      console.error('Error creating owner:', ownerError);
      
      // If owner record creation fails, clean up both auth user and user record
      await client.auth.admin.deleteUser(authData.user.id);
      await client.from('users').delete().eq('id', authData.user.id);
      
      return NextResponse.json({ 
        error: 'Failed to create owner', 
        details: ownerError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      owner,
      user: userData,
      message: 'Owner created successfully with authentication. Owner can now login to the dashboard.' 
    });
  } catch (error) {
    console.error('Error in POST /api/owners:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
