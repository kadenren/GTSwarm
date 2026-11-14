import { NextResponse } from 'next/server';
import { resetFromSeed } from '@/lib/db';
import { VIEWER_COOKIE, DEFAULT_VIEWER } from '@/lib/viewer';
import { demoToolsEnabled } from '@/lib/demoMode';
import { hosted } from '@/lib/pgstore';
import { SESSION_COOKIE } from '@/lib/session';

/** JSON version of /demo/reset for the demo guide. */
export async function POST() {
  if (hosted()) {
    // start this visitor over with a new private session; other visitors and the shared dataset are untouched
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, crypto.randomUUID(), { path: '/', sameSite: 'lax', httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 30 });
    res.cookies.set(VIEWER_COOKIE, DEFAULT_VIEWER, { path: '/', sameSite: 'lax' });
    return res;
  }
  if (!demoToolsEnabled()) return NextResponse.json({ error: 'Demo reset is disabled. Set GTSWARM_DEMO=1 to enable it.' }, { status: 403 });
  try {
    resetFromSeed();
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Reset failed' }, { status: 500 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(VIEWER_COOKIE, DEFAULT_VIEWER, { path: '/', sameSite: 'lax' });
  return res;
}
