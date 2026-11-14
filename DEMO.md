# GT Swarm demo script (about 2 minutes)

**Live site:** https://gtswarm.vercel.app. Click **Demo** (top right) for a hands-on tour: the judge clicks the real site (navigation, example buttons, Find People, Find Startups, invites, the persona menu, Accept) and the tour moves on when they do. Every step also has **Skip, do it for me**. Every person, startup and request is **fictional**.

**Who runs it:** the Student Government Association, as a one-semester opt-in pilot, with CREATE-X, Startup Exchange, the Alumni Association and project courses bringing people in (proposed; no existing partnership). Details at `/pilot`.

**The point to land:** Georgia Tech already has the people and the answers startups need, but founders, alumni and students can't see each other, so connections happen by luck. GT Swarm learns what each person has built and solved, matches them in both directions with reasons, and turns matches into real, consented connections. Connection is not only hiring: when a founder hits a wall (a bug, a hospital security review, a fundraising question), GT Swarm finds the student or alum who already solved it, and the ask is just 15 minutes.

The demo shows instead of explains: every step is a moment that can't happen at Georgia Tech today. The case for adopting it comes only at the end.

| # | Moment | The judge does | What they feel |
|---|---|---|---|
| 1 | Meet Elena | **Next** | An alum founder with a startup (Restwell Patch) and no cofounder |
| 2 | Smart match | Example, **Find people** | Seconds later: Dana, an alum who shipped a wearable and is open to cofounding. Elena had never heard of her |
| 3 | Why Dana? | **Why this match?** | Not a keyword hit: every line is something Dana actually built |
| 4 | The web | **View network** | Every dot a Yellow Jacket, closer = more relevant, every line two people who built together |
| 5 | Is there a way in? | Click Dana on the map | Elena → Diego Park → Dana: a warm introduction no one could see before |
| 6 | Reach out | **Invite to connect → Send invite** | One click, reason attached; Dana decides |
| 7 | Get Unstuck | Example problem | Her hospital pilot is frozen in a security review; Tara, an alum founder, got through the exact same one |
| 8 | How did she do it? | **See how Tara solved it** | The fix is on record, with the project it happened on |
| 9 | Ask for 15 minutes | **Ask Tara for 15 minutes → Send request** | Sent to Tara's inbox. Alumni who'd never join a startup will give 15 minutes on something they already solved |
| 10 | Meanwhile, Maya | As Maya: **Find Your Startup** | A student matched to Restwell from what she's built, without typing |
| 11 | Maya asks to join | **Request to join → Send request** | Sent to Elena |
| 12 | Connected | As Elena: **Accept** | A student and an alum founder who'd never have met are connected; the web grows |
| 13 | For SGA | **Next** | Impact for GT: every introduction counted, live from the demo |
| 14 | Next semester | **Finish** | "These connections happen at GT today, by luck. GT Swarm makes them happen on purpose." One opt-in semester; it already runs |

The tour opens pages and switches personas itself (about two minutes). Every action has **Skip, do it for me**.

**Before presenting:** click **Demo** once to warm the site up, then click it again. Each click starts a fresh private session, so a judge clicking along never sees your changes and you never see theirs.

## Optional extras
- **Why this match?** on a person card shows how the score adds up.
- **My Profile**: interests (exploring, cofounders, joining, advising, collaborating, investing), roles open to, hours, and the startups you own.
- **Get Unstuck** (top bar) has example problems across engineering, security, fundraising, equity and FDA. Each finds the person who solved it, with the fix.
- **Startup pages**: what the team needs, recommended people with Invite, solved problems, and **Add a solved problem**, which is how problems get into Get Unstuck.
- Footer links: **Post a startup** and **Join GT Swarm** (fill a startup or profile from a resume, report or poster) and **Impact for GT**.

## How matching works (for questions)
- **Founder → people:** a ranking score from what people actually built and solved compared with the request (55%), documented experience (20%), shared GT ties (10%), openness to the role (10%) and availability (5%). A chosen role and the students/alumni filter are eligibility checks, not score boosts. No person is boosted by name.
- **Person → startup:** text similarity (35%), skills the startup needs that you have (25%), a role it needs that you are open to (20%), industry and startup interest (10%), stage (5%) and shared ties (5%).
- Every result shows a one-sentence reason built only from stored records, plus a score breakdown under **Why this match?**. Scores are the algorithm's real output, not invented percentages.

## Assumptions
- **Data comes from people opting in.** Alumni and students create their own profiles (resume, GitHub, website; LinkedIn and Scholar are links only). Nothing is scraped. In the demo, every profile is fictional.
- **Campus partners help with reach, not engineering.** We assume the Alumni Association emails invite links (`/join?invite=alumni`) and that CREATE-X, VIP and SGA share links with students. No access to private alumni databases is assumed.
- **Sign-in would use GT single sign-on** for students and email invites for alumni. Not built; the "Viewing as" switcher stands in for it.
- **Founders keep their startup pages current** (stage, open roles, needs). Stale pages make matches worse; owners can edit status in one click.
- **People are honest about roles and availability.** Willingness to cofound or advise is self-reported, and it gates who appears for that role.
- **One office could run it.** It is one web app and one database, with an optional Gemini key for meaning-based search and document reading. Matching works without it.
- **Students use it at specific moments:** looking for a team or startup, needing an advisor or engineer, or stuck on a problem, not as a daily feed.
- **Alumni give small amounts of time.** Most alumni will not join a startup, but many will answer a specific 15-minute question about something they already solved. The product is built around that small ask.
- **Demo-only tools are off in production.** The data reset works in development, or only when `GTSWARM_DEMO=1` is set.

## If something goes wrong
- Click **Demo** again (it resets the data) or open `localhost:3000/demo/reset`.
- If Gemini is slow or unavailable, the matching still works. Keep going.
