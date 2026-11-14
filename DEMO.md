# GT Swarm demo script (about 2 minutes)

**Live site:** https://gtswarm.vercel.app. Click **Try Demo** for a hands-on tour: the judge clicks the real site (navigation, example buttons, Find People, Find Startups, invites, the persona menu, Accept) and the tour moves on when they do. Every step also has **Skip, do it for me**. Every person, startup and request is **fictional**.

**The point to land:** Georgia Tech already has the people and the answers startups need, but founders, alumni and students can't see each other, so connections happen by luck. GT Swarm learns what each person has built and solved, matches them in both directions with reasons, and turns matches into real, consented connections. Connection is not only hiring: when a founder hits a wall (a bug, a hospital security review, a fundraising question), GT Swarm finds the student or alum who already solved it, and the ask is just 15 minutes.

| # | Chapter | The judge does | What they see |
|---|---|---|---|
| 1 | The goal | Reads, **Next** | The three ways GT Swarm connects people: build a team, get unstuck, join a startup |
| 2 | 1 · Build your team | Fills the example (or types), **Find people** | Dana Whitfield, an alum, on top, with the reason on her card |
| 3 | 1 · Build your team | **View network** | The match map |
| 4 | 1 · Build your team | **Matches → Invite to connect → Send invite** | "Sent" (alum to alum) |
| 5 | 2 · Get unstuck | Clicks **Hospital security review stalled our pilot** (or types a problem) | Tara Holloway, an alum founder who solved it |
| 6 | 2 · Get unstuck | **See how Tara solved it → Ask Tara for 15 minutes → Send request** | The fix on record, and a specific ask |
| 7 | 3 · Join a startup | **Use a sample resume** (as Maya, a student) | A profile drafted from a resume |
| 8 | 3 · Join a startup | **Find Startups** tab, then **Request to join** on Restwell | Restwell needs what Maya has built (student to alum) |
| 9 | Connect | **Accept** (as Elena) | Connected; joining the team stays her choice |
| 10 | What GT gets | **Finish** | Alumni engagement and help requests, counted live |

The tour opens pages and switches personas itself; the judge only does the actions above. Every action has **Skip, do it for me**.

**Before presenting:** click **Try Demo** once to warm the site up, then click it again. Each click starts a fresh private session, so a judge clicking along never sees your changes and you never see theirs.

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
