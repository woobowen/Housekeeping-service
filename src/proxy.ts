import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE_NAME, verifyAdminSessionToken } from '@/lib/auth/session';

const PUBLIC_PATHS: string[] = [
  '/login',
  '/register',
  '/api/auth/send-code',
  '/api/auth/e2e-code',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path: string) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token: string | undefined = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifyAdminSessionToken(token) : null;

  if (isPublicPath(pathname) && session) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
