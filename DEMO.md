# GT Swarm demo script (about 2 minutes)

**Live site:** https://gtswarm.vercel.app. Click **Try Demo** and the guided tour walks through these ten steps, switching demo accounts for you. Every person, startup and request is **fictional**.

**The point to land:** Georgia Tech builders can't find each other. GT Swarm matches a startup with exactly the people it needs, and people with exactly the startups that need them, and shows why.

| # | Screen | Do | Say (one line) |
|---|---|---|---|
| 1 | Discover | Point at the startup grid | "Every student and alumni startup at GT, in one place, with who they need." |
| 2 | Join (alumni invite) | Click **Use a sample resume** | "A resume becomes a profile. Skills and projects fill in, the person reviews them." |
| 3 | Find People, as Elena (alum founder) | Search: alumni cofounder for a medical wearable | "She describes exactly who she needs. Dana fits, and the card says why, from Dana's own record." |
| 4 | Same results, **View network** | Look at the map | "Closer to the center is a better fit. Lines link people who built together." |
| 5 | Same results | **Invite to connect → Send invite** | "One click to reach the right alum." |
| 6 | Find Startups, as Maya (student) | Look at Restwell's card | "It works both ways: Restwell needs Maya's BLE firmware experience." |
| 7 | Same | **Request to join → Send request** | |
| 8 | Inbox, as Elena | **Accept** | "The founder decides. Accepting connects them; joining the team is a separate choice." |
| 9 | My Swarm, as Elena | Look at the map | "Her whole network, mapped: people and startups linked by real work together." |
| 10 | Discover | | "Alum to alum, alum to student, student to student. The right people for every GT startup." |

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
