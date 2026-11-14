# GT Swarm show-through (about 8 minutes)

All people, projects and files in this demo are fictional. Sample files live in [demo-files/](demo-files/).

## Before the judges arrive (5 minutes)

1. Open a terminal in the **GT Swarm** folder and run `npm run dev`. Open http://localhost:3000 in a full-size browser window.
2. **Gemini:** the key is already in `.env.local`. After any re-seed, run `npm run ai:warm` once (about 7 minutes on the free tier) and restart `npm run dev`. It embeds the swarm with Gemini and pre-runs every demo search, so nothing waits on the network on stage. The footer should read "Matching: Gemini embeddings + Gemini matchmaker".
3. Click the gold **Demo guide** button (bottom right) → **Reset data**. You are now viewing as **Leo Martinez**, a student cofounder of PulseBand.
4. Keep the **demo-files** folder open next to the browser so you can drag files in.

Without a key, everything still works: matching uses the graph and keyword search, and only the poster photo and screenshot need Gemini (use the report PDF and log file instead).

## The story

> "Georgia Tech builds hundreds of projects a year: capstones, VIP teams, CREATE-X startups. When a team gets stuck or needs a cofounder, the person who already solved it is usually one or two introductions away, but nobody can see that. GT Swarm maps everything Yellow Jackets have built into one graph, and finds the right person at every step of building."

## 1. Home (20 seconds)
Point at the hero: search is right there, the web on the right is the product, and the numbers are the swarm: 150 projects, 205 builders, 266 solved problems, 23 handoffs.

## 2. Find a cofounder (90 seconds) — student to alum
- Click **Find expertise**. Role **Cofounder**, search `low-power embedded hardware, has shipped a product` (or click the suggestion).
- **Say:** "Closer to the center means a stronger match. Teal are alumni, purple are students, dashed lines mean these people already know each other."
- Hover **Dana Whitfield** (inner ring, gold line): her one-line connection appears.
- Click Dana. Read the top of the panel: she built the 2017 sensor board PulseBand continued from, then shipped a consumer wearable.
  - With Gemini: point at **"Gemini's read of Dana's record"** and the **AI fit (Gemini)** score.
  - Show the score breakdown and the warm path ("You → Jordan Kim → Dana").
- Click **Request Cofounder conversation** → **Send request**.
- **Say:** "Every match is explainable: what they built, why they ranked, and who can introduce you."

## 3. Get unstuck from an error log (60 seconds)
- Click **I'm stuck**. In **Ask the scout**, click **+ Have an error log or a screenshot?**
- Drag in `demo-files/6-hydraband-serial-log.txt` (or `7-error-screenshot.png` with Gemini) → **Turn into a problem**. It becomes "BLE connection drops when the device enters sleep mode (nRF52 / Zephyr firmware)".
- Click **Send the scout**. Watch it search solved problems, rank builders and check warm paths. **Marcus Reyes** solved exactly this in 2020; the fix is right there.
- **Say:** "You don't need to know what to search for. Paste the log."

## 4. Map a new project from files (75 seconds) — grow the swarm
- Click **Add**. Drag in `1-HydraBand-capstone-report.pdf` and `3-HydraBand-README.md` (and `2-HydraBand-poster.jpg`, a phone photo of the poster, if Gemini is on).
- Click **Read and fill in**. Point at "What we read" and the filled-in name, team, technologies and three solved problems. Edit anything, then **Add to the swarm**.
- The new project animates into its neighborhood.
- **Say:** "Every capstone becomes searchable for the next team, from documents students already write."

## 5. An alum joins in two minutes (75 seconds) — how real people get in
- Click **Profile** → **Create your own profile** (or go to `/join`).
- Type `Rachel Bianchi`, choose **An alum**, drag in `4-resume-Rachel-Bianchi-alum.pdf`. Optionally paste a GitHub or website link.
- Click **Read and draft my profile**. Show that every field is editable and that **Rachel chooses** what she is open to: pick **Advisor** and **Helper**. **Create my profile**.
- **Say:** "Alumni and students create their own profiles from their resume, LinkedIn's Save to PDF, GitHub or website. Nothing is saved until they confirm, and we never scrape anyone."
- Prove it: switch **Viewing as** back to Leo. In **Find expertise**, role **Advisor**, **Alumni**, search `BLE firmware that stays connected through sleep, medical wearable`. **Rachel is rank 1**, seconds after joining.

## 6. Alum to alum, alum to student (45 seconds)
- **Viewing as** → **Elena Brooks** (alum founder). Role **Advisor**, `FDA approval for a wearable medical device` → **Priya Natarajan** at rank 1. Scroll to **You should meet**: Priya again, predicted from shared connections.
- Role **Early engineer**, **Students**, `wearable firmware` → three students with firmware build records fill the inner ring.

## 7. Consent, then connect (45 seconds)
- **Viewing as** → **Dana**. **Inbox** → **Accept** Leo's request. "Accepting only creates a connection."
- **Viewing as** → **Leo**. **Inbox** → **Add to project as Cofounder**. Open **My projects → PulseBand**: Dana is on the team.

## 8. The whole swarm and the impact (45 seconds)
- **Network**: the gold path PulseBand → Wearable Sensing (2017) → Dana. Drag the year slider from 2026 back to 2012 and forward again.
- **Impact**: 93% of alumni are within three introductions of a current student; 66% of connections cross majors; 44 solved problems were handed to the next team. "Every number is computed live from the graph."

## Close (10 seconds)
> "GT Swarm turns what Georgia Tech has already built into the fastest way to find the right person: a cofounder, an advisor, or the alum who fixed your exact bug."

## Likely questions

- **Where does the data come from?** People add themselves (resume, LinkedIn PDF, GitHub, website) and their projects (reports, posters, READMEs). A rollout would use GT single sign-on for students and Alumni Association invites for alumni, and could pre-fill records from public Capstone Expo and VIP listings that stay hidden until claimed.
- **What does the AI do?** Gemini reads messy input (posters, resumes, logs) and does the matching: meaning-based embeddings plus a matchmaker that reads each shortlisted candidate's record and scores the fit, with a reason. The graph supplies the shortlist, warm paths, circles and introductions, so every match stays explainable.
- **Privacy?** No scraping. Everything is opt-in and confirmed by the person. Requests need consent. LinkedIn and Scholar links are shown, never read automatically.
- **Does it work offline?** Yes. Without a key it falls back to graph and keyword matching, and every Gemini result used in the demo is cached.

## If something goes wrong
- Anything looks off: **Demo guide → Reset data**, then restart from step 2.
- A Gemini step is slow or fails: the app falls back automatically; keep talking and continue.
- Poster photo without a key: use the report PDF instead (the app says so).
