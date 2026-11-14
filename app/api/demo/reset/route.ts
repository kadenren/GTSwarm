import { NextResponse } from 'next/server';
import { resetFromSeed } from '@/lib/db';
import { VIEWER_COOKIE, DEFAULT_VIEWER } from '@/lib/viewer';

/** JSON version of /demo/reset for the demo guide. */
export async function POST() {
  try {
    resetFromSeed();
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Reset failed' }, { status: 500 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(VIEWER_COOKIE, DEFAULT_VIEWER, { path: '/', sameSite: 'lax' });
  return res;
}
