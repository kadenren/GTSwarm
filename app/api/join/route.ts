import { NextResponse } from 'next/server';
import { createPerson, saveProfile } from '@/lib/profile';
import { ActionError } from '@/lib/actions';
import { VIEWER_COOKIE } from '@/lib/viewer';
import { getDb, bumpDataVersion } from '@/lib/db';
import { ready, persist } from '@/lib/session';

/** Join GT Swarm: create your own profile from the confirmed draft, then act as yourself. */
export async function POST(req: Request) {
  await ready();
  const b = await req.json();
  let id: string | null = null;
  try {
    id = createPerson({ name: String(b.name ?? ''), type: b.type, major: String(b.major ?? ''), grad_year: Number(b.grad_year) });
    const out = await saveProfile(id, b);
    await persist();
    const res = NextResponse.json({ id, ...out });
    res.cookies.set(VIEWER_COOKIE, id, { path: '/', sameSite: 'lax' });
    return res;
  } catch (e) {
    if (id) { getDb().prepare('DELETE FROM people WHERE id = ?').run(id); bumpDataVersion(); } // do not leave half-created profiles
    if (e instanceof ActionError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: 'Could not create your profile.' }, { status: 500 });
  }
}
