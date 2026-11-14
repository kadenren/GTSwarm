# GT Swarm

**Your Georgia Tech network, for life.** GT Swarm connects Georgia Tech students and alumni with the people, opportunities and expertise that matter, from first year to decades after graduation: mentorship, internships and jobs, groups, events, startups and Get Unstuck, all matched on demonstrated experience and explained. All demo data is fictional.

## GT Swarm 2.0: membership and community

| Piece | Where | Notes |
|---|---|---|
| Membership states | `lib/access.ts` | CURRENT_STUDENT, ALUMNI_PENDING_VERIFICATION, VERIFIED_ALUMNI, ADMIN. Capabilities are separate from status; every protected read and write checks them on the server. No record means unverified. |
| Graduation lifecycle | `lib/lifecycle.ts` | A member can only move themselves to pending. Verification needs an ADMIN (a stand-in for an authorized source). The demo persona Sofia Alvarez can run a labeled simulated verification (disable with `GTSWARM_DEMO_DATA=false`). The person record is updated in place, so projects, connections, mentorships and groups carry over. |
| Mentorship | `lib/community.ts`, `/mentorship` | Opt-in mentor profiles (topics, mentees, capacity, contact), hybrid-ranked recommendations with grounded reasons, request → accept/decline in Inbox → active → ended. |
| Opportunities | `/opportunities` | Internships, full-time, part-time and startup roles; audience and class-year eligibility; expiry; saving; alumni proposals wait for a moderator. Demo postings are synthetic. |
| Groups | `/groups` | Explicit per-group policy: eligibility (all, students, verified alumni) and access (open, request). Admin approval for requests; member lists hidden from ineligible viewers. |
| Events | `/events` | Audiences (all, students, verified alumni, group members), capacity, deadlines, duplicate prevention, RSVP and cancel; restricted details hidden. |
| Dashboards | `/home` | Different for students and verified alumni; all recommendations come from stored records. |
| Data | `lib/db.ts`, `lib/community-data.ts` | New tables: membership, verification_request, mentor_profile, mentorship, opportunity, saved_opportunity, community_group, group_member, community_event, event_rsvp, content_report. Mirrored to the hosted Postgres like every other table; no new provider. |

**Simulated in the demo:** Georgia Tech sign-in (the "Viewing as" switcher), alumni verification (seeded as "Demo seed (simulated verification)"), email delivery, every person, posting, group and event.
**Needs institutional approval before real data:** Georgia Tech identity provider (OIT), alumni verification source (Alumni Association), any use of real student or alumni records, data governance and retention. GT Swarm does not claim FERPA certification or university endorsement.


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
| Home `/` | The problem, Find Your People / Find Your Startup, how GT Swarm differs from directories (with a real example from the data), the two-way flow, the pilot plan with privacy and what is real vs simulated, and the startup feed |
| SGA pilot plan `/pilot` | Who runs it (SGA), how it fits CREATE-X, Startup Exchange, the Alumni Association and project courses (proposed), a one-semester timeline, success measures, resources, risks, privacy, and what is real vs simulated |
| Find Matches `/match` | **Find Your People** (role and students/alumni filters, match cards, Why this match?, View network) and **Find Your Startup** (from text or your saved profile, Request to join), plus a "How the intelligence works" section explaining every scoring factor and the knowledge graph |
| Get Unstuck `/stuck` | Describe a problem (technical, security, regulatory, fundraising, equity); see who solved it and how; ask them for 15 minutes |
| My Profile `/profile` | Your record, interests, roles you are open to, hours, what you want to work on, your startups, startups that could use you |
| Inbox `/inbox` | Invites and join requests, accept or decline, your connections, and the founder's separate "add to team" step |
| Startup page `/projects/[id]` | Stage, open roles, needs, recommended people with Invite, join requests, solved problems, team, Add a solved problem |
| Footer | Post a startup, Join GT Swarm, Impact for GT (a few live numbers: opt-ins, alumni engagement, help requests, connections by direction, outcomes) |

## Full show-through

See **[DEMO.md](DEMO.md)** for the 2-minute demo script, how matching works, and our assumptions. The gold **Demo** button (top right) starts a 10-step guided tour of the same story: it resets the data, switches accounts, and highlights what to click with an arrow at each step.

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
| Relevance web | `components/RelevanceWeb.tsx` | D3 + SVG radial web: rings by score, gold best match |

## Reset

Clicking **Demo** (or `GET /demo/reset`, which works in development, or in production only with `GTSWARM_DEMO=1`) restores the database from `data/gtswarm.seed.db`. Use it between demo runs.
