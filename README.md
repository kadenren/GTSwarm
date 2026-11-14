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
- Optional: put `ANTHROPIC_API_KEY=...` in `.env.local` to turn on the AI helpers. Without a key, each falls back to deterministic code, and nothing in the core demo calls an API.
  - **Scout (I'm stuck):** Claude plans and runs searches over the GT Swarm network. A "live web" checkbox appears that also searches the public web for Georgia Tech alumni (off by default, so the demo never searches on the spot). Without a key, a deterministic scout reads the request, infers the role and audience, and searches the network.
  - **Add project:** Claude fills in the fields from a description, uploaded files (PDF, Word, text, Markdown) and links (GitHub links import the README). Without a key, a keyword extractor does.
  - **Polished wording:** in a person's panel, Claude rephrases the fact-built connection description. The rewrite is fact-checked against the original (no new names, numbers or terms, no gendered pronouns) and cached, and the cache survives `/demo/reset`. To pre-warm it for the demo, open each hero's panel once before presenting.

## Gemini (optional, recommended for the demo)

Put `GEMINI_API_KEY=...` in `.env.local`, then run `npm run ai:warm` and restart `npm run dev`. With a key:

- **Matching is done by Gemini.** Every person, project and solved problem gets a Gemini embedding, so search matches meaning rather than keywords. The graph then shortlists about 16 candidates, and a Gemini matchmaker reads each candidate's record against the request and scores the fit, with a one-sentence reason shown in the panel. Shared ties, role fit and availability still count. `ai:warm` pre-computes the embeddings and every demo search, so the live demo never waits on the network.
- **Gemini reads messy input:** a phone photo of a poster or a scanned PDF in **Add project**, a resume (or LinkedIn's Save to PDF) in **Join / Profile**, and a screenshot of an error in **I'm stuck**.

Without a key, all of this falls back to the graph plus keyword matching and local file parsing, and is covered by the tests.

## People add themselves

Alumni and students create their own profiles at **/join** (or **Profile**): resume upload, plus GitHub (public repositories become optional projects), personal website, LinkedIn and Google Scholar links (shown on the profile, never scraped). They review every field and choose what they are open to before anything is saved.

## Full show-through

See **[DEMO.md](DEMO.md)** for the 8-minute presenter script with talking points, the sample files in **demo-files/** (regenerate with `npm run demo:files`) and answers to likely questions.

## Demo script (about 5 minutes)

Before you start, open **http://localhost:3000/demo/reset** to restore the seeded state. The gold **Demo guide** button (bottom right) walks through every step below with one click each, switching the viewer for you, and has its own **Reset data** button.

1. **Viewing as: Leo Martinez (PulseBand student).** Go to **Find expertise**, choose **Cofounder**, search `low-power embedded hardware, has shipped a product` (or click the suggestion). Dana Whitfield sits on the inner ring with the gold line. Hover to see her one-line connection, click to read the full description, the score breakdown and the warm path. Click **Request Cofounder conversation**, then **Send request**.
2. **I'm stuck → Search solved problems:** search `Bluetooth drops when the sensor sleeps`. Marcus Reyes is on the inner ring; his panel leads with his solved problem and the fix. Then switch to **Ask the scout** and type a need in plain words (for example `We need an advisor who has been through FDA clearance for a wearable`): it shows each search step and returns people with evidence.
3. **My projects → PulseBand → Log progress:** add the solved problem `Bluetooth drops when the sensor sleeps`, a short solution, and **Marcus Reyes** as helper. It appears on the build record, and searching it in I'm stuck now finds it.
4. **Switch to Elena Brooks (alum founder).** Find expertise, **Advisor**, `FDA approval for a wearable medical device`. Priya Natarajan is rank 1 (alum to alum), and **You should meet** below suggests Priya, from the same circle, through Hannah Lee.
5. **As Elena:** **Early engineer**, **Students**, `wearable firmware`. Maya Okafor, Jordan Kim and Sofia Alvarez fill the inner ring (alum to student).
6. **Switch to Dana Whitfield.** **Inbox** → **Accept** Leo's request. **Impact** shows the student-to-alum tile go up by one. Switch back to **Leo** → **Inbox** → **Add to project as Cofounder**. Dana now appears on the PulseBand team.
7. **Network:** the gold path from PulseBand to Dana (continued from Wearable Sensing 2017). Drag the year slider to watch the swarm grow.

Extras: **Expand** in a person's panel re-centers the web on their network; **Circles** shows auto-detected communities; startup project pages have a **Team builder**; **Add project** turns an abstract into a project that animates into the swarm.

## About the data

People in the demo are fictional on purpose: the app attributes availability, roles and connections to people, so those must be stated by the people themselves. In a real rollout, data comes in with consent: builders claim their profile and add their own projects through **Add project** (write-ups, reports, posters, READMEs). The live web search in the scout only reads public pages and only reports leads backed by a cited source.

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
