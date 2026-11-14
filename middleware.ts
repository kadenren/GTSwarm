import { NextResponse, type NextRequest } from 'next/server';

/**
 * Give every visitor a private demo session (an opaque random id in an httpOnly cookie).
 * Their invites, requests and edits are stored under this id only, so visitors never disturb each other.
 * Kept free of server-only imports because middleware runs on the edge runtime.
 */
const COOKIE = 'gtswarm_session';
const VALID = /^[a-z0-9-]{16,64}$/;

export function middleware(req: NextRequest) {
  if (VALID.test(req.cookies.get(COOKIE)?.value ?? '')) return NextResponse.next();
  const id = crypto.randomUUID();
  req.cookies.set(COOKIE, id); // visible to this request's pages and routes
  const res = NextResponse.next({ request: { headers: req.headers } });
  res.cookies.set(COOKIE, id, { path: '/', sameSite: 'lax', httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 30 });
  return res;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|icon|apple-icon).*)'] };
