import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { CACHE_HEADERS, generateETag, isClientCacheFresh, addPerformanceHeaders, calculatePagination, createPaginatedResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const client = supabaseAdmin || supabase;
    const { searchParams } = new URL(request.url);
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const { offset } = calculatePagination(page, limit);
    
    // Filter parameters
    const driverId = searchParams.get('driver_id');
    const status = searchParams.get('status');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const expenseType = searchParams.get('expense_type');

    // Build query
    let query = client
      .from('driver_expenses')
      .select(`
        *,
        users!inner(name, email)
      `, { count: 'exact' });

    // Apply filters
    if (driverId) {
      query = query.eq('driver_id', driverId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    if (expenseType) {
      query = query.eq('expense_type', expenseType);
    }

    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: expenses, error, count } = await query;

    if (error) {
      console.error('Error fetching expenses:', error);
      return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
    }

    const total = count || 0;
    const responseData = createPaginatedResponse(expenses || [], total, page, limit);
    const etag = generateETag(responseData);
    
    // Check if client has fresh data
    if (isClientCacheFresh(request, etag)) {
      return new NextResponse(null, { 
        status: 304,
        headers: CACHE_HEADERS.REAL_TIME
      });
    }

    const response = NextResponse.json(responseData);
    
    // Add caching headers
    Object.entries(CACHE_HEADERS.REAL_TIME).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    response.headers.set('ETag', etag);
    
    return addPerformanceHeaders(response);

  } catch (error) {
    console.error('Error in GET /api/expenses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
