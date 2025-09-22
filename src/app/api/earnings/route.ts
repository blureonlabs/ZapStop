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
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const platform = searchParams.get('platform');

    // Build query
    let query = client
      .from('driver_earnings')
      .select(`
        *,
        users!inner(name, email)
      `, { count: 'exact' });

    // Apply filters
    if (driverId) {
      query = query.eq('driver_id', driverId);
    }
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    // Apply pagination
    query = query
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: earnings, error, count } = await query;

    if (error) {
      console.error('Error fetching earnings:', error);
      return NextResponse.json({ error: 'Failed to fetch earnings' }, { status: 500 });
    }

    // Filter by platform if specified (client-side filtering for now)
    let filteredEarnings = earnings || [];
    if (platform) {
      filteredEarnings = filteredEarnings.filter(earning => {
        switch (platform) {
          case 'uber':
            return earning.uber_cash > 0 || earning.uber_account > 0;
          case 'bolt':
            return earning.bolt_cash > 0 || earning.bolt_account > 0;
          case 'individual':
            return earning.individual_cash > 0;
          default:
            return true;
        }
      });
    }

    const total = count || 0;
    const responseData = createPaginatedResponse(filteredEarnings, total, page, limit);
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
    console.error('Error in GET /api/earnings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
