import { NextResponse } from 'next/server';
import { VIEWER_COOKIE } from '@/lib/viewer';
import { getDb } from '@/lib/db';
import { ready } from '@/lib/session';

export async function POST(req: Request) {
  await ready();
  const { id } = (await req.json()) as { id: string };
  const exists = typeof id === 'string' && !!getDb().prepare('SELECT 1 FROM people WHERE id = ?').get(id);
  if (!exists) return NextResponse.json({ error: 'Unknown viewer' }, { status: 400 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(VIEWER_COOKIE, id, { path: '/', sameSite: 'lax' });
  return res;
}
