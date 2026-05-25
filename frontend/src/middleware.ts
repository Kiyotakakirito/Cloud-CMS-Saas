import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token');
  const path = request.nextUrl.pathname;
  
  const isDashboard = path.startsWith('/dashboard');

  // 1. If trying to access dashboard without a token, redirect to login
  if (isDashboard && !token) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // 2. If already logged in and at the login page, let the client-side handle redirection
  // (We skip middleware redirection here because the JWT 'role' is usually just 'authenticated')
  if (path === '/' && token) {
    // We'll let the login page or DashboardLayout handle the initial landing
    // to avoid "authenticated" role 404s
    return NextResponse.next();
  }

  // 3. For all other cases, continue
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
