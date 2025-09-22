import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Log all request details
    console.log('=== DEBUG OWNER CREATION ===');
    console.log('Request URL:', request.url);
    console.log('Request method:', request.method);
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Get request body
    const body = await request.json();
    console.log('Request body:', body);
    
    // Check for any suspicious data
    const bodyString = JSON.stringify(body);
    if (bodyString.includes('youtube') || bodyString.includes('youtu.be')) {
      console.error('SUSPICIOUS: Request body contains YouTube URL!');
      return NextResponse.json({ 
        error: 'Suspicious request detected',
        details: 'Request body contains YouTube URL',
        body: body
      }, { status: 400 });
    }
    
    // Simulate the owner creation process
    const mockOwner = {
      id: 'debug-' + Date.now(),
      name: body.name,
      email: body.email,
      phone: body.phone,
      address: body.address,
      document_expiry_date: body.document_expiry_date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Mock owner created:', mockOwner);
    
    return NextResponse.json({
      success: true,
      message: 'Debug owner creation successful',
      owner: mockOwner,
      debug: {
        requestUrl: request.url,
        requestMethod: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: body,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ 
      error: 'Debug API error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
