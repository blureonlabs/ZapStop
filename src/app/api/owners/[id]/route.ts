export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = supabaseAdmin || supabase;
    const { id } = await params;

    const { data: owner, error } = await client
      .from('owners_with_cars')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching owner:', error);
      return NextResponse.json({ error: 'Owner not found' }, { status: 404 });
    }

    return NextResponse.json({ owner });
  } catch (error) {
    console.error('Error in GET /api/owners/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = supabaseAdmin || supabase;
    const { id } = await params;
    const body = await request.json();
    const { name, email, phone, address, documents, document_expiry_date } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Check if email already exists for another owner
    const { data: existingOwner } = await client
      .from('owners')
      .select('id')
      .eq('email', email)
      .neq('id', id)
      .single();

    if (existingOwner) {
      return NextResponse.json({ error: 'Owner with this email already exists' }, { status: 400 });
    }

    // Update owner
    const { data: owner, error } = await client
      .from('owners')
      .update({
        name,
        email,
        phone,
        address,
        documents,
        document_expiry_date
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating owner:', error);
      return NextResponse.json({ error: 'Failed to update owner' }, { status: 500 });
    }

    return NextResponse.json({ owner });
  } catch (error) {
    console.error('Error in PUT /api/owners/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = supabaseAdmin || supabase;
    const { id } = await params;

    // Check if owner has assigned cars
    const { data: assignedCars } = await client
      .from('owner_cars')
      .select('id')
      .eq('owner_id', id);

    if (assignedCars && assignedCars.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete owner with assigned cars. Please remove car assignments first.' 
      }, { status: 400 });
    }

    // Delete owner
    const { error } = await client
      .from('owners')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting owner:', error);
      return NextResponse.json({ error: 'Failed to delete owner' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Owner deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/owners/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
