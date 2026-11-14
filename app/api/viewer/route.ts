import { NextResponse } from 'next/server';
import { VIEWERS, VIEWER_COOKIE } from '@/lib/viewer';

export async function POST(req: Request) {
  const { id } = (await req.json()) as { id: string };
  if (!VIEWERS.some((v) => v.id === id)) return NextResponse.json({ error: 'Unknown viewer' }, { status: 400 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(VIEWER_COOKIE, id, { path: '/', sameSite: 'lax' });
  return res;
}
