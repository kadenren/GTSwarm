# GT Swarm

**Where Yellow Jackets build together.** A demo for the Georgia Tech SGA x College of Lifetime Learning Campus Solutions Challenge (Engineering track).

GT Swarm maps what Georgia Tech students and alumni have built (capstones, VIP teams, CREATE-X startups, labs, clubs) as a graph of people, projects, skills and solved problems. Builders use it at every step to find the right person: a cofounder, an advisor, an early engineer, or someone who already solved the bug they are stuck on.

**The graph and its algorithms are the product. AI is a helper, not the core.** Search, ranking, warm paths, circles and introductions all run locally with no network calls.

> Demo data: every person is fictional.

## Run it

Requires Node.js 20 or 22 (LTS).

```bash
npm install
npm run seed
npm run dev
```

Open http://localhost:3000.

- `npm run seed` builds `data/gtswarm.db` (220 people, 150 projects, 266 solved problems, 12 lineages) plus a pristine snapshot `data/gtswarm.seed.db` used by the reset route. It also downloads the `Xenova/all-MiniLM-L6-v2` embedding model once (about 25 MB) into `data/models`, and stores embeddings in SQLite.
- **Offline or blocked model download?** Seeding still succeeds and search runs on the built-in BM25 keyword scorer. The footer shows which mode is active: `semantic (local MiniLM embeddings + BM25)` or `keyword (BM25 fallback)`. Re-run `npm run seed` with internet to switch to semantic mode.
- `npm test` runs the acceptance tests (against a throwaway copy of the seed database).
- `npm run build` is a production build with type checking.
- Optional: put `ANTHROPIC_API_KEY=...` in `.env.local` to turn on two AI helpers. Without a key, both fall back to deterministic code, and nothing in the core demo calls an API.
  - **Add project:** Claude extracts the fields from a pasted abstract (otherwise a keyword extractor does).
  - **Polished wording:** in a person's panel, Claude rephrases the fact-built connection description. The rewrite is fact-checked against the original (no new names, numbers or terms, no gendered pronouns) and cached, and the cache survives `/demo/reset`. To pre-warm it for the demo, open each hero's panel once before presenting.

## Demo script (about 5 minutes)

Before you start, open **http://localhost:3000/demo/reset** to restore the seeded state.

1. **Viewing as: Leo Martinez (PulseBand student).** Go to **Find expertise**, choose **Cofounder**, search `low-power embedded hardware, has shipped a product` (or click the suggestion). Dana Whitfield sits on the inner ring with the gold line. Hover to see her one-line connection, click to read the full description, the score breakdown and the warm path. Click **Request Cofounder conversation**, then **Send request**.
2. **I'm stuck:** search `Bluetooth drops when the sensor sleeps`. Marcus Reyes is on the inner ring; his panel leads with his solved problem and the fix.
3. **My projects → PulseBand → Log progress:** add the solved problem `Bluetooth drops when the sensor sleeps`, a short solution, and **Marcus Reyes** as helper. It appears on the build record, and searching it in I'm stuck now finds it.
4. **Switch to Elena Brooks (alum founder).** Find expertise, **Advisor**, `FDA approval for a wearable medical device`. Priya Natarajan is rank 1 (alum to alum), and **You should meet** below suggests Priya, from the same circle, through Hannah Lee.
5. **As Elena:** **Early engineer**, **Students**, `wearable firmware`. Maya Okafor, Jordan Kim and Sofia Alvarez fill the inner ring (alum to student).
6. **Switch to Dana Whitfield.** **Inbox** → **Accept** Leo's request. **Impact** shows the student-to-alum tile go up by one. Switch back to **Leo** → **Inbox** → **Add to project as Cofounder**. Dana now appears on the PulseBand team.
7. **Network:** the gold path from PulseBand to Dana (continued from Wearable Sensing 2017). Drag the year slider to watch the swarm grow.

Extras: **Expand** in a person's panel re-centers the web on their network; **Circles** shows auto-detected communities; startup project pages have a **Team builder**; **Add project** turns an abstract into a project that animates into the swarm.

## How it works

| Piece | Where | What it does |
|---|---|---|
| Data | `lib/db.ts`, `scripts/seed.ts` | SQLite schema and deterministic seed with hero records and partial-match decoys |
| Graph | `lib/graph/build.ts` | graphology graph of people, projects, problems and skills with weighted edges (builder 1.0, maintainer 1.2, advisor 1.5, solved 1.0, continued-from 1.0, skill 2.0, connection 1.0) |
| Search | `lib/search.ts`, `lib/embed.ts` | Local MiniLM cosine similarity blended with BM25; BM25 alone when the model is unavailable |
| Ranking | `lib/graph/rank.ts` | `score = 0.55 E + 0.20 X + 0.10 T + 0.10 R + 0.05 A` (text match, documented experience, shared ties, role fit, availability), each 0 to 1. No per-person boosts. |
| Warm paths | `lib/graph/path.ts` | Weighted shortest path (Dijkstra) with readable steps |
| Descriptions | `lib/graph/describe.ts` | Deterministic template built only from database facts |
| Circles and intros | `lib/graph/circles.ts` | Louvain communities named by their skills; Adamic-Adar "You should meet" |
| Skill gaps | `lib/graph/gaps.ts` | Team skills vs. skills common in similar successful projects |
| Relevance web | `components/RelevanceWeb.tsx` | D3 + SVG radial web: rings by score, gold best match, dashed peer links, hover and click |

## Reset

`GET /demo/reset` restores the database from `data/gtswarm.seed.db` and sets the viewer back to Leo. Use it between demo runs.
