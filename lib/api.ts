import { NextResponse } from 'next/server';
import { ActionError } from './actions';
import { ready, persist } from './session';

export async function handle<T>(fn: () => Promise<T> | T) {
  try {
    await ready();
    const out = await fn();
    await persist();
    return NextResponse.json(out);
  } catch (e) {
    if (e instanceof ActionError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof Error && /demo session is full|readonly|query_only/i.test(e.message)) return NextResponse.json({ error: /full/.test(e.message) ? e.message : 'Demo changes need a session. Reload the page and try again.' }, { status: 409 });
    console.error(e);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
