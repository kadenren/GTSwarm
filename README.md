# GT Swarm

**An intelligent startup matchmaking exchange for Georgia Tech students and alumni.** A demo for the Georgia Tech SGA Campus Solutions Hackathon.

- **Discover** what Yellow Jackets are building: a feed of student- and alumni-founded startups you can browse without committing to anything.
- **Find People** (founder to people): describe what you are building and who you need; get the alumni and students who fit, each with a reason grounded in their record.
- **Find Startups** (person to startup): describe your skills and interests, or use your saved profile; get the startups seeking exactly that, and request to join.
- **Connect**: invites and join requests need a yes. Accepting creates a connection, never a title; joining a team is a separate step the founder takes.

It works alum to alum, alum to student, student to alum and student to student. The graph and matching algorithms are the underlying intelligence; the startup exchange is the product. Matching is deterministic and works offline; Gemini optionally adds meaning-based search and reads documents and photos.

> Demo data: every person, startup and outcome is fictional, and the site says so on every page.

## How Georgia Tech would run it

One Next.js app and one SQLite database (swap for Postgres at scale). No other infrastructure.

- **Students** sign in with GT single sign-on (not built in the demo; a "Viewing as" switcher stands in).
- **Alumni** join from an invite link the Alumni Association emails: **/join?invite=alumni** (also `create`, `vip`, `sga`). They upload a resume or LinkedIn PDF, add GitHub, website and Google Scholar links, review every field, and choose what they're open to. Right after joining, the profile shows **Builds that could use you**.
- **Builds** come from what teams already write: capstone reports, VIP summaries, posters, READMEs (**Post a build**).
- Everything is opt-in. Requests need a yes. Accepting a request creates a connection; adding someone to a team is a separate step only the team can take. Nothing is scraped.

## Run it

Requires Node.js 20 or 22 (LTS).

```bash
npm install
npm run seed
npm run dev
```

Open http://localhost:3000.

- `npm run seed` builds `data/gtswarm.db` (229 people, 157 projects, solved problems and lineages) plus a pristine snapshot `data/gtswarm.seed.db` used by the reset route.
- `npm test` runs the acceptance tests against a throwaway copy of the seed database.
- `npm run build` is a production build with type checking.

## Gemini (optional)

Put `GEMINI_API_KEY=...` in `.env.local` (git-ignored), run `npm run ai:warm`, and restart `npm run dev`. The default model is `gemini-3.5-flash-lite`, with automatic fallback to `gemini-3.5-flash` and `gemini-3.8-flash` when a model is busy (override with `GEMINI_MODEL` and `GEMINI_FALLBACK_MODELS`). On a free-tier key, the first `ai:warm` takes about 7 minutes (embeddings are limited to 100 per minute). With a key:

- **Meaning-based search:** every person, project and solved problem gets a Gemini embedding, blended with keyword scores.
- **Matchmaker:** in Find People, Gemini reads the shortlisted candidates' records against the request and adds a one-sentence reason.
- **Reads messy input:** a poster photo or scanned PDF in Post a build, and a resume in Join.

Without a key (or when Gemini is busy), everything falls back to the graph plus keyword matching and local file parsing. The build recommendations that drive the demo story are deterministic either way.

## Main pages

| Page | What it does |
|---|---|
| Discover `/` | Three ways in (build a team, join a startup, get unstuck), privacy principles, and the startup feed with filters for industry, skills needed, stage, founder type and actively recruiting |
| Find Matches `/match` | **Find People** (role and students/alumni filters, match cards, Why this match?, View connections, View network) and **Find Startups** (from text or your saved profile, Request to join) |
| Get Unstuck `/stuck` | Describe a problem (technical, security, regulatory, fundraising, equity); see who solved it and how; ask them for 15 minutes |
| My Profile `/profile` | Your record, interests, roles you are open to, hours, what you want to work on, your startups, startups that could use you |
| Inbox `/inbox` | Invites and join requests, accept or decline, your connections, and the founder's separate "add to team" step |
| Startup page `/projects/[id]` | Stage, open roles, needs, recommended people with Invite, join requests, build record |
| Footer | Post a startup, Join GT Swarm, My Swarm, Whole network, Impact for GT (alumni engagement, help requests, connections by direction) |

## Full show-through

See **[DEMO.md](DEMO.md)** for the 2-minute demo script, how matching works, and our assumptions. The gold **Demo** button (top right) starts a 14-step guided tour of the same story: it resets the data, switches accounts, and highlights what to click with an arrow at each step.

## How it works

| Piece | Where | What it does |
|---|---|---|
| Data | `lib/db.ts`, `scripts/seed.ts` | SQLite schema and deterministic seed |
| Graph | `lib/graph/build.ts` | graphology graph of people, projects, problems and skills with weighted edges |
| Builds | `lib/builds.ts` | Stage, open roles and needs for active builds (set by the team) |
| Two-sided matching | `lib/matching.ts`, `lib/searchApi.ts` | Person to startup (similarity, skills needed, role, industry and startup interest, stage, ties) and founder to people (the ranking below), each with a one-sentence reason from stored facts. Chosen roles are eligibility checks. |
| Preferences | `lib/prefs.ts` | Interests and "looking for", derived from stated roles until the person saves their own |
| Search | `lib/search.ts`, `lib/geminiVec.ts` | BM25 with a synonym table, blended with Gemini embeddings when available |
| Ranking | `lib/graph/rank.ts` | `score = 0.55 E + 0.20 X + 0.10 T + 0.10 R + 0.05 A` (text match, documented experience, shared ties, role fit, availability). No per-person boosts. |
| Warm paths | `lib/graph/path.ts` | Weighted shortest path (Dijkstra) with readable steps |
| My Swarm | `lib/graph/myswarm.ts` | Graph closeness blended with match relevance |
| Relevance web | `components/RelevanceWeb.tsx` | D3 + SVG radial web: rings by score, gold best match |

## Reset

Clicking **Demo** (or `GET /demo/reset`, which works in development, or in production only with `GTSWARM_DEMO=1`) restores the database from `data/gtswarm.seed.db`. Use it between demo runs.
