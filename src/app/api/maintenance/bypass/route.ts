import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// GET: Return maintenance mode status and message (for the maintenance page)
export async function GET() {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ enabled: false, message: '' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('feature_flags')
    .select('enabled, metadata')
    .eq('key', 'system.maintenance_mode')
    .single();

  if (error || !data) {
    return NextResponse.json({ enabled: false, message: '' });
  }

  return NextResponse.json({
    enabled: data.enabled,
    message: data.metadata?.message || 'Site is under maintenance',
  });
}

// POST: Verify bypass password and set cookie
export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ success: false, error: 'Not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ success: false, error: 'Password required' }, { status: 400 });
    }

    // Get the maintenance mode settings
    const { data, error } = await supabase
      .from('feature_flags')
      .select('enabled, metadata')
      .eq('key', 'system.maintenance_mode')
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Configuration error' }, { status: 500 });
    }

    // If maintenance mode is not enabled, just allow through
    if (!data.enabled) {
      const response = NextResponse.json({ success: true });
      return response;
    }

    const bypassPassword = data.metadata?.bypass_password;

    // If no bypass password is set, deny access
    if (!bypassPassword) {
      return NextResponse.json({
        success: false,
        error: 'No bypass password configured'
      }, { status: 403 });
    }

    // Compare passwords (simple string comparison - passwords stored in plain text in metadata)
    if (password !== bypassPassword) {
      return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
    }

    // Password matches - set bypass cookie with current version
    const bypassVersion = data.metadata?.bypass_version || 0;
    const response = NextResponse.json({ success: true });

    // Set cookie that expires in 7 days, value is the bypass version
    response.cookies.set('maintenance_bypass', String(bypassVersion), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
