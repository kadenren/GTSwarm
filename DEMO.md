# GT Swarm demo script (about 2 minutes)

**Live site:** https://gtswarm.vercel.app. Click **Demo** (top right) for a hands-on tour: the judge clicks the real site (navigation, example buttons, Find People, Find Startups, invites, the persona menu, Accept) and the tour moves on when they do. Every step also has **Skip, do it for me**. Every person, startup and request is **fictional**.

**Where it fits:** alongside CREATE-X, Startup Exchange, the Alumni Association and project courses, using only what people choose to share.

**The point to land:** Georgia Tech already has the people and the answers startups need, but founders, alumni and students can't see each other, so connections happen by luck. GT Swarm learns what each person has built and solved, matches them in both directions with reasons, and turns matches into real, consented connections. Connection is not only hiring: when a founder hits a wall (a bug, a hospital security review, a fundraising question), GT Swarm finds the alumni and students whose record and experience can help, maps how you're connected to them, and shares contact details once both say yes.

The demo shows instead of explains: every step is a moment that can't happen at Georgia Tech today. The case for adopting it comes only at the end.

| # | Moment | The judge does | What they see |
|---|---|---|---|
| 1 | Meet Elena | **Next** | A GT alum building a startup who needs other alumni's experience |
| 2 | Alum finds alum | Example, **Find people** | Dana ('18), who shipped a wearable and is open to cofounding. Two alumni who had never met |
| 3 | Why Dana? | **Why this match?** | Every reason is something Dana actually built |
| 4 | The alumni web | **View network** | Closer = more relevant; lines = people who built together |
| 5 | Is there a way in? | Click Dana on the map | Elena → Diego Park → Dana: a warm introduction |
| 6 | Reach out | **Invite to connect → Send invite** | Sent with the reason; Dana decides |
| 7 | Get Unstuck | Example "FDA 510(k) for a wearable" | A connection map of alumni and students who have worked on similar issues before |
| 8 | Who has worked on this before? | Click Priya on the map | Priya ('11), VP of Regulatory Affairs, worked through a wearable 510(k); Elena reaches her through Diego Park |
| 9 | Connect with Priya | **Connect with Priya → Send request** | Request goes to Priya with the problem attached |
| 10 | Priya's inbox | As Priya: **Accept** | Nothing is shared until she says yes |
| 11 | Connected | **Next** | Elena sees Priya's contact details (and Priya sees Elena's): they can talk directly |
| 12 | Students too | As Maya: **Find Your Startup** | Elena's startup, matched to a student from what she has built |
| 13 | Impact for GT | **Next** | Impact for GT: alum-to-alum and student-to-alum connections counted live |
| 14 | Close | **Finish** | Back on the homepage: "These connections happen at GT today, by luck. GT Swarm makes them happen on purpose." |

The tour opens pages and switches personas itself (about two minutes). Every action has **Skip, do it for me**.

**Before presenting:** click **Demo** once to warm the site up, then click it again. Each click starts a fresh private session, so a judge clicking along never sees your changes and you never see theirs.

## Optional extras
- **Why this match?** on a person card shows how the score adds up.
- **My Profile**: interests (exploring, cofounders, joining, advising, collaborating, investing), roles open to, hours, and the startups you own.
- **Get Unstuck** (top bar) has example problems across engineering, security, fundraising, equity and FDA. Each maps the people who can help, based on their record and experience, and how you are connected to them.
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
- **Alumni help alumni with what they've already solved.** Get Unstuck finds the alumni whose record and experience fit a specific problem and maps how you're connected to them; once they accept a request, both people see each other's contact details and can work through it directly.
- **Demo-only tools are off in production.** The data reset works in development, or only when `GTSWARM_DEMO=1` is set.

## If something goes wrong
- Click **Demo** again (it resets the data) or open `localhost:3000/demo/reset`.
- If Gemini is slow or unavailable, the matching still works. Keep going.
