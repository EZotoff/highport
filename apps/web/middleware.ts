import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isAuthenticated = !!req.auth;

  // Public routes that don't require authentication
  const publicPaths = ['/login', '/register'];
  const isPublicPath = publicPaths.some((path) => pathname === path);
  const isAuthApi = pathname.startsWith('/api/auth');
  const isNextAsset = pathname.startsWith('/_next') || pathname === '/favicon.ico';

  // Allow public paths, auth API, and Next.js assets
  if (isPublicPath || isAuthApi || isNextAsset) {
    // Redirect authenticated users away from login/register
    if (isAuthenticated && isPublicPath) {
      return NextResponse.redirect(new URL('/campaigns', req.url));
    }
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
