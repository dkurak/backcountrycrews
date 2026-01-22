import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that should always be accessible
const PUBLIC_PATHS = [
  '/maintenance',
  '/api/maintenance/bypass',
  '/login',
  '/signup',
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/images',
  '/fonts',
];

// Check if a path should bypass maintenance mode
function shouldBypassPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );
}

// Fetch maintenance mode from Supabase REST API
async function getMaintenanceMode(): Promise<{
  enabled: boolean;
  bypassPassword: string | null;
  message: string;
  bypassVersion: number;
} | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/feature_flags?key=eq.system.maintenance_mode&select=enabled,metadata`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        // Cache for 30 seconds to avoid hammering the DB
        next: { revalidate: 30 },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data || data.length === 0) {
      return { enabled: false, bypassPassword: null, message: '', bypassVersion: 0 };
    }

    const flag = data[0];
    return {
      enabled: flag.enabled,
      bypassPassword: flag.metadata?.bypass_password || null,
      message: flag.metadata?.message || 'Site is under maintenance',
      bypassVersion: flag.metadata?.bypass_version || 0,
    };
  } catch (error) {
    console.error('Middleware: Error fetching maintenance mode:', error);
    return null;
  }
}

// Check if user has admin session via Supabase auth cookie
async function isAdminUser(request: NextRequest): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return false;
  }

  // Get auth token from cookies - Supabase stores it in various cookie formats
  const cookies = request.cookies;
  let accessToken: string | null = null;

  // Try different cookie name patterns that Supabase uses
  for (const [name, cookie] of cookies) {
    if (name.includes('auth-token') || name.includes('sb-') && name.includes('-auth-token')) {
      try {
        const parsed = JSON.parse(cookie.value);
        accessToken = parsed.access_token || parsed[0]?.access_token;
        if (accessToken) break;
      } catch {
        // Not JSON, might be direct token
        if (cookie.value.startsWith('ey')) {
          accessToken = cookie.value;
          break;
        }
      }
    }
  }

  if (!accessToken) {
    return false;
  }

  try {
    // Get the user from Supabase
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      return false;
    }

    const user = await userResponse.json();
    if (!user?.id) {
      return false;
    }

    // Check if user is admin
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=is_admin`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!profileResponse.ok) {
      return false;
    }

    const profiles = await profileResponse.json();
    return profiles?.[0]?.is_admin === true;
  } catch (error) {
    console.error('Middleware: Error checking admin status:', error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  if (shouldBypassPath(pathname)) {
    return NextResponse.next();
  }

  // Check maintenance mode
  const maintenance = await getMaintenanceMode();

  // If we couldn't fetch maintenance status or it's disabled, allow through
  if (!maintenance || !maintenance.enabled) {
    return NextResponse.next();
  }

  // Check for bypass cookie with matching version
  const bypassCookie = request.cookies.get('maintenance_bypass');
  if (bypassCookie?.value) {
    const cookieVersion = parseInt(bypassCookie.value, 10);
    if (!isNaN(cookieVersion) && cookieVersion === maintenance.bypassVersion) {
      return NextResponse.next();
    }
    // Old cookie version or 'true' from old system - will be ignored
  }

  // Check if user is admin
  const isAdmin = await isAdminUser(request);
  if (isAdmin) {
    return NextResponse.next();
  }

  // Redirect to maintenance page
  const maintenanceUrl = new URL('/maintenance', request.url);
  return NextResponse.redirect(maintenanceUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
