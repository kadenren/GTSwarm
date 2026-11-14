# GT Swarm demo script (about 2 minutes)

**Live site:** https://gtswarm.vercel.app. Click **Try Demo** and the guided tour walks through these ten steps, switching demo accounts for you. Every person, startup and request is **fictional**.

**The point to land:** Georgia Tech already has the talent startups need, but founders, alumni and students can't see each other, so connections happen by luck. GT Swarm learns what each person has built and wants, matches them in both directions with reasons, and turns matches into real, consented connections.

| # | Chapter | Screen | Do | Say (one line) |
|---|---|---|---|---|
| 1 | Why | Discover (hero numbers) | Point at the startups and open roles | "The talent is here. The connections aren't." |
| 2 | Builder profile | Join (alumni invite) | **Use a sample resume** | "Alumni join from an invite. A resume becomes a profile." |
| 3 | Builder profile | My Profile, as Maya (student) | Point at skills, projects, roles open to | "This is what matching runs on: what you've built and what you want." |
| 4 | Find People · alum → alum | As Elena (alum founder) | Alumni cofounder for a medical wearable | "Only alumni open to cofounding are ranked. Dana comes out on top." |
| 5 | Find People · alum → alum | Dana's card, **Why this match?** | Read the reason and score | "Real work, not keywords: she solved a battery problem on a wearable board." |
| 6 | Find People · alum → alum | **View network** | Look at the map | "Best fits at the center; lines link people who built together." |
| 7 | Find People · alum → alum | Dana's card | **Invite to connect → Send invite** | |
| 8 | Find People · alum → student | Same search, Engineer, Students | Look at the top three | "The same search finds students with real firmware work." |
| 9 | Find Startups · student → alum | As Maya, nothing typed | Restwell's card | "From her profile alone: Restwell needs her BLE firmware skills." |
| 10 | Find Startups · student → alum | Same | **Request to join → Send request** | |
| 11 | Connect · alum ↔ alum | Inbox, as Dana | **Accept** Elena's invite | "Nothing happens without a yes." |
| 12 | Connect · student ↔ alum | Inbox, as Elena | **Accept** Maya's request | "Joining the team stays the founder's choice." |
| 13 | Network | My Swarm, as Elena | Look at the map | "Two new connections, mapped. Every connection improves the next match." |
| 14 | Close | Discover | | "The right people for every GT startup: alum to alum, alum to student, student to alum." |

**Before presenting:** click **Try Demo** once to warm the site up, then click it again. Each click starts a fresh private session, so a judge clicking along never sees your changes and you never see theirs.

## Optional extras
- **View network** on Find People results opens the radial relevance web.
- **My Profile**: interests (exploring, cofounders, joining, advising, collaborating, investing), roles open to, hours, and the startups you own.
- Footer links: **Post a startup** and **Join GT Swarm** (fill a profile or startup from a resume, report or poster), **Get Unstuck** (find who already solved your technical problem), **My Swarm**, **Whole network** and **Impact**.

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
- **Students use it at specific moments:** looking for a team or startup, needing an advisor or engineer, or stuck on a technical problem, not as a daily feed.
- **Demo-only tools are off in production.** The data reset works in development, or only when `GTSWARM_DEMO=1` is set.

## If something goes wrong
- Click **Demo** again (it resets the data) or open `localhost:3000/demo/reset`.
- If Gemini is slow or unavailable, the matching still works. Keep going.
