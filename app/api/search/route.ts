import { handle } from '@/lib/api';
import { getViewerId } from '@/lib/viewer';
import { runSearch, type SearchRequest } from '@/lib/searchApi';

export async function POST(req: Request) {
  const viewerId = await getViewerId();
  const body = (await req.json()) as SearchRequest;
  return handle(() => runSearch(viewerId, body));
}
