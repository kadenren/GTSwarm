/**
 * Turn what a builder hands us (pasted description, uploaded files, links) into one source text for extraction.
 * Everything runs locally except fetching a link, which the user explicitly asked for.
 */
export interface SourceInfo { name: string; kind: 'text' | 'pdf' | 'docx' | 'link' | 'description'; chars: number; ok: boolean; note?: string }

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_CHARS_PER_SOURCE = 12000;

const clean = (t: string) => t.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

export async function textFromFile(name: string, buf: Buffer): Promise<{ text: string; info: SourceInfo }> {
  const lower = name.toLowerCase();
  if (buf.length > MAX_FILE_BYTES) return { text: '', info: { name, kind: 'text', chars: 0, ok: false, note: 'File is larger than 8 MB' } };
  try {
    if (lower.endsWith('.pdf')) {
      const { extractText, getDocumentProxy } = await import('unpdf');
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const { text, totalPages } = await extractText(pdf, { mergePages: true });
      const t = clean(text).slice(0, MAX_CHARS_PER_SOURCE);
      return { text: t, info: { name, kind: 'pdf', chars: t.length, ok: t.length > 0, note: `${totalPages} ${totalPages === 1 ? 'page' : 'pages'}${t.length ? '' : ', no selectable text (scanned?)'}` } };
    }
    if (lower.endsWith('.docx')) {
      const mammoth = await import('mammoth');
      const { value } = await mammoth.extractRawText({ buffer: buf });
      const t = clean(value).slice(0, MAX_CHARS_PER_SOURCE);
      return { text: t, info: { name, kind: 'docx', chars: t.length, ok: t.length > 0 } };
    }
    if (/\.(txt|md|markdown|csv|json|rst|tex)$/.test(lower)) {
      const t = clean(buf.toString('utf8')).slice(0, MAX_CHARS_PER_SOURCE);
      return { text: t, info: { name, kind: 'text', chars: t.length, ok: t.length > 0 } };
    }
    return { text: '', info: { name, kind: 'text', chars: 0, ok: false, note: 'Unsupported type: use PDF, Word (.docx), text or Markdown' } };
  } catch (e) {
    return { text: '', info: { name, kind: 'text', chars: 0, ok: false, note: `Could not read: ${e instanceof Error ? e.message : 'unknown error'}` } };
  }
}

/** Fetch a public page (README, project site, poster page) and keep its readable text. GitHub repos use the README. */
export async function textFromLink(url: string): Promise<{ text: string; title: string; info: SourceInfo }> {
  let u: URL;
  try { u = new URL(url); } catch { return { text: '', title: url, info: { name: url, kind: 'link', chars: 0, ok: false, note: 'Not a valid URL' } }; }
  if (!/^https?:$/.test(u.protocol) || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[?::1)/.test(u.hostname)) {
    return { text: '', title: url, info: { name: url, kind: 'link', chars: 0, ok: false, note: 'Only public http(s) links' } };
  }
  const gh = u.hostname === 'github.com' ? u.pathname.split('/').filter(Boolean) : [];
  const target = gh.length >= 2 ? `https://raw.githubusercontent.com/${gh[0]}/${gh[1]}/HEAD/README.md` : u.toString();
  try {
    const res = await fetch(target, { signal: AbortSignal.timeout(6000), headers: { 'user-agent': 'GT-Swarm/0.1 (project import)' }, redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = res.headers.get('content-type') ?? '';
    const raw = (await res.text()).slice(0, 400_000);
    let title = gh.length >= 2 ? `${gh[0]}/${gh[1]} README` : u.hostname;
    let text = raw;
    if (type.includes('html')) {
      title = raw.match(/<title[^>]*>([^<]{1,200})<\/title>/i)?.[1]?.trim() ?? title;
      const meta = raw.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,500})/i)?.[1] ?? '';
      text = meta + '\n' + raw
        .replace(/<(script|style|nav|footer|header|noscript)[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"');
    }
    const t = clean(text).slice(0, MAX_CHARS_PER_SOURCE);
    return { text: t, title, info: { name: title, kind: 'link', chars: t.length, ok: t.length > 0 } };
  } catch (e) {
    return { text: '', title: url, info: { name: url, kind: 'link', chars: 0, ok: false, note: `Could not fetch (${e instanceof Error ? e.message : 'error'}); the link is still saved` } };
  }
}

export interface RepoInfo { name: string; description: string; year: number; language: string | null; url: string; stars: number }

/** Public repositories for a GitHub profile URL or username (GitHub's public REST API, no token). */
export async function githubRepos(profile: string): Promise<{ user: string | null; repos: RepoInfo[]; info: SourceInfo }> {
  const user = profile.trim().replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/^@/, '').split(/[/?#]/)[0];
  if (!/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(user)) return { user: null, repos: [], info: { name: profile, kind: 'link', chars: 0, ok: false, note: 'Not a GitHub username or profile URL' } };
  try {
    const res = await fetch(`https://api.github.com/users/${user}/repos?sort=pushed&per_page=12&type=owner`, {
      signal: AbortSignal.timeout(6000), headers: { accept: 'application/vnd.github+json', 'user-agent': 'GT-Swarm/0.1 (profile import)' },
    });
    if (!res.ok) throw new Error(res.status === 404 ? 'user not found' : `HTTP ${res.status}`);
    const data = (await res.json()) as { name: string; description: string | null; created_at: string; language: string | null; html_url: string; fork: boolean; stargazers_count: number }[];
    const repos = data.filter((r) => !r.fork).slice(0, 8).map((r) => ({
      name: r.name, description: r.description ?? '', year: new Date(r.created_at).getFullYear(), language: r.language, url: r.html_url, stars: r.stargazers_count,
    }));
    return { user, repos, info: { name: `GitHub: ${user}`, kind: 'link', chars: repos.length, ok: true, note: `${repos.length} public ${repos.length === 1 ? 'repository' : 'repositories'}` } };
  } catch (e) {
    return { user, repos: [], info: { name: `GitHub: ${user}`, kind: 'link', chars: 0, ok: false, note: `Could not reach GitHub (${e instanceof Error ? e.message : 'error'}); the link is still saved` } };
  }
}
