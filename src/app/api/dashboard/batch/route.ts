import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { CACHE_HEADERS, generateETag, isClientCacheFresh, addPerformanceHeaders } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const client = supabaseAdmin || supabase;
    const { searchParams } = new URL(request.url);
    const timeFilter = searchParams.get('timeFilter') || 'monthly';
    const includeRealTime = searchParams.get('includeRealTime') === 'true';

    // Calculate date range based on time filter
    const getDateRange = (filter: string) => {
      const now = new Date();
      let start: Date;

      switch (filter) {
        case 'daily':
          start = new Date(now);
          break;
        case 'weekly':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case '3months':
          start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        case '6months':
          start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
          break;
        case 'yearly':
          start = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          start = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      return {
        start: start.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0]
      };
    };

    const dateRange = getDateRange(timeFilter);

    // Prepare queries based on what's needed
    const queries = [
      // Static data (always needed)
      client.from('users').select('*').order('created_at', { ascending: false }),
      client.from('cars').select('*'),
      client.from('owners_with_cars').select('*'),
    ];

    // Add real-time data if requested
    if (includeRealTime) {
      queries.push(
        client
          .from('driver_earnings')
          .select('*')
          .gte('date', dateRange.start)
          .lte('date', dateRange.end),
        client
          .from('driver_expenses')
          .select('*')
          .eq('status', 'approved')
          .gte('date', dateRange.start)
          .lte('date', dateRange.end),
        client
          .from('attendance')
          .select('*')
          .eq('date', new Date().toISOString().split('T')[0])
      );
    }

    // Execute all queries in parallel
    const results = await Promise.all(queries);

    // Process results
    const [usersResult, carsResult, ownersResult, earningsResult, expensesResult, attendanceResult] = results;

    // Check for errors
    const errors = [
      usersResult.error,
      carsResult.error,
      carsResult.error,
      ownersResult.error,
      earningsResult?.error,
      expensesResult?.error,
      attendanceResult?.error
    ].filter(Boolean);

    if (errors.length > 0) {
      console.error('Batch API errors:', errors);
      return NextResponse.json({ 
        error: 'Some data could not be fetched',
        details: errors.map(e => e?.message).join(', ')
      }, { status: 500 });
    }

    // Process and structure the data
    const drivers = usersResult.data?.filter(u => u.role === 'driver') || [];
    
    // Join cars with drivers
    const carsWithDrivers = carsResult.data?.map(car => {
      const assignedDriver = usersResult.data?.find(user => user.id === car.assigned_driver_id);
      return {
        ...car,
        assigned_driver: assignedDriver ? { 
          name: assignedDriver.name, 
          email: assignedDriver.email 
        } : null
      };
    }) || [];

    const responseData = {
      drivers,
      cars: carsWithDrivers,
      owners: ownersResult.data || [],
      earnings: earningsResult?.data || [],
      expenses: expensesResult?.data || [],
      attendance: attendanceResult?.data || [],
      meta: {
        timeFilter,
        dateRange,
        includeRealTime,
        timestamp: new Date().toISOString()
      }
    };

    const etag = generateETag(responseData);
    
    // Check if client has fresh data
    if (isClientCacheFresh(request, etag)) {
      return new NextResponse(null, { 
        status: 304,
        headers: includeRealTime ? CACHE_HEADERS.REAL_TIME : CACHE_HEADERS.AGGREGATED
      });
    }

    const response = NextResponse.json(responseData);
    
    // Add appropriate caching headers
    const cacheHeaders = includeRealTime ? CACHE_HEADERS.REAL_TIME : CACHE_HEADERS.AGGREGATED;
    Object.entries(cacheHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    response.headers.set('ETag', etag);
    
    return addPerformanceHeaders(response);

  } catch (error) {
    console.error('Error in batch dashboard API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
