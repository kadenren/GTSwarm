import { NextResponse } from 'next/server';
import { ActionError } from './actions';

export async function handle<T>(fn: () => Promise<T> | T) {
  try {
    return NextResponse.json(await fn());
  } catch (e) {
    if (e instanceof ActionError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
