import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; carId: string }> }
) {
  try {
    const client = supabaseAdmin || supabase;
    const { id, carId } = await params;

    // Remove car assignment from owner
    const { error } = await client
      .from('owner_cars')
      .delete()
      .eq('owner_id', id)
      .eq('car_id', carId);

    if (error) {
      console.error('Error removing car assignment:', error);
      return NextResponse.json({ error: 'Failed to remove car assignment' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Car assignment removed successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/owners/[id]/cars/[carId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
