# GT Swarm demo script (about 2 minutes)

**Live site:** https://gtswarm.vercel.app. Click **Try Demo** for a hands-on tour: the judge clicks the real site (navigation, example buttons, Find People, Find Startups, invites, the persona menu, Accept) and the tour moves on when they do. Every step also has **Skip, do it for me**. Every person, startup and request is **fictional**.

**The point to land:** Georgia Tech already has the talent startups need, but founders, alumni and students can't see each other, so connections happen by luck. GT Swarm learns what each person has built and wants, matches them in both directions with reasons, and turns matches into real, consented connections.

| # | Chapter | The judge does | What they see |
|---|---|---|---|
| 1 | Why | Reads, **Next** | Startups and open roles nobody can see |
| 2–3 | Discover | Clicks **View startup** on Restwell Patch | A startup's page: stage, open roles, needs, recommended people |
| 4 | Find People · alum → alum | Clicks **Find Matches** (as Elena, alum founder) | The Find Matches page |
| 5 | Find People · alum → alum | Types a need or clicks the example, then **Find people** | Dana Whitfield on top, with a reason from her record |
| 6 | Find People · alum → alum | **Why this match?** | The score, built from her real work |
| 7 | Find People · alum → alum | **View network** | The match map |
| 8 | Find People · alum → alum | **Matches → Invite to connect → Send invite** | "Sent" |
| 9 | Find People · alum → student | **Student firmware engineer**, then **Find people** | Students with firmware work lead |
| 10 | Switch sides | Picks **Maya Okafor** in **Viewing as** | Now a student |
| 11–12 | Builder profile | **My Profile** | Projects, skills, roles open to |
| 13 | Builder profile | Turns on interests, **Save preferences** | "Saved"; her matches use it |
| 14–15 | Builder profile | Footer **Join GT Swarm**, **Use a sample resume** | A profile drafted from a resume |
| 16 | Find Startups · student → alum | **Find Matches → Find Startups** | Restwell, matched from her profile |
| 17 | Find Startups · student → alum | **Request to join → Send request** | "Sent to Elena" |
| 18–20 | Connect · alum ↔ alum | Picks **Dana**, **Inbox**, **Accept** | Two alumni connected |
| 21–22 | Connect · student ↔ alum | Picks **Elena**, **Accept** | Connected; team membership stays Elena's choice |
| 23–24 | Network | Footer **My Swarm** | Dana and Maya on Elena's map |
| 25 | Close | **Finish** | "Click around; everything you just did is real" |

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
