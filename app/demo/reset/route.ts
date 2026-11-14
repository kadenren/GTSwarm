import { NextResponse } from 'next/server';
import { resetFromSeed } from '@/lib/db';
import { VIEWER_COOKIE, DEFAULT_VIEWER } from '@/lib/viewer';

/** Hidden route: restores the pristine seeded database so the demo can be rerun cleanly. */
export async function GET() {
  try {
    resetFromSeed();
  } catch (e) {
    return new NextResponse(`Reset failed: ${e instanceof Error ? e.message : e}`, { status: 500 });
  }
  const html = `<!doctype html><meta charset="utf-8"><title>GT Swarm demo reset</title>
<body style="font-family:Inter,system-ui,sans-serif;background:#F7F6F2;color:#003057;display:grid;place-items:center;height:100vh;margin:0">
<div style="text-align:center"><h1 style="font-family:'Space Grotesk',sans-serif">Demo reset</h1>
<p>The database is back to its seeded state and you are viewing as the PulseBand student.</p>
<p><a href="/" style="color:#003057;font-weight:600">Back to GT Swarm</a></p></div></body>`;
  const res = new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
  res.cookies.set(VIEWER_COOKIE, DEFAULT_VIEWER, { path: '/', sameSite: 'lax' });
  return res;
}
