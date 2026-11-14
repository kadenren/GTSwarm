import { getViewerId } from '@/lib/viewer';
import { runScout, type ScoutEvent } from '@/lib/scout';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Streams scout progress as newline-delimited JSON, one event per line. */
export async function POST(req: Request) {
  const viewerId = await getViewerId();
  const { need, web } = (await req.json()) as { need?: string; web?: boolean };
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: ScoutEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + '\n'));
      try {
        await runScout(String(need ?? ''), viewerId, emit, { web: !!web });
      } catch (e) {
        emit({ type: 'step', kind: 'error', label: 'Scout failed', detail: e instanceof Error ? e.message : String(e) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' } });
}
