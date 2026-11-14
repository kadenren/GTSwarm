# GT Swarm demo script (about 3 minutes)

**Live site:** https://gtswarm.vercel.app. Click **Start guided demo** on the homepage (or in the Demo persona menu, top right). Each step explains what's on screen or asks the judge to click the real site; every step has **Skip, do it for me**. Every person, community, event and posting is **fictional**.

**The point to land:** Georgia Tech already has the people who could help each other, but those connections live in group chats, LinkedIn and luck. GT Swarm matches people on what they've actually built and solved, shows how they're connected through confirmed ties, and only introduces people who said yes. It stays with you from student to alum.

**What's unique:** matching on demonstrated work (projects built, problems solved), not job titles; explained matches ("Why this match?"); the connection web with warm introduction paths built only from confirmed ties; matching in both directions (founders find people, students find startups); consent before ranking.

## Main guided demo: four moments in a Yellow Jacket's life

| # | Moment | The judge does | What they see |
|---|---|---|---|
| 1 | Why GT Swarm | Next | The problem: the people exist, finding them is luck |
| 2 | Kenji, robotics student | Search "robotics career advice", purpose **Career advice or mentorship** | Only alumni who chose to mentor students, each with a plain reason |
| 3 | The web of connections | **See connections** | Relevance web; lines are only confirmed ties; Kenji's warm path to Quinn |
| 4 | Ask for mentorship | **Ask to connect → Send request** in the side panel | A mentorship request with an editable note |
| 5 | Opportunities | Next | Alumni-posted internships; official listings stay on CareerBuzz |
| 6 | Elena, alum founder, is stuck | Example problem in Get Unstuck | Tara already solved the hospital security review |
| 7 | Matchmaking | Example, **Find people** | Dana ranks first for an alumni hardware cofounder |
| 8 | Why Dana? | **Why this match?** | Every factor from her record: work match (keyword + meaning), shipped wearable, GT ties, open to cofounding |
| 9 | The web behind the match | **View network**, click Dana | Elena → Diego Park → Dana: a warm introduction through teammates |
| 10 | Invite | **Invite to connect → Send invite** | Sent with the reason; Dana decides |
| 11 | Matching both ways | **Find Your Startup** as Maya | Restwell is recommended from her profile, no typing |
| 12 | Noah moves to Seattle | **Explore community** on GT in Seattle | Suggested because he shared his city |
| 13 | A hello | **Ask to connect → Send** on Jamie | Only members who welcome requests |
| 14 | Consent | **Accept** as Jamie | Connected; the new tie joins the web |
| 15 | Sofia graduates | **Simulate verified graduation** | Same account becomes Verified alum (labeled simulated) |
| 16 | Alumni spaces open | Next | The alumni-only community now lets her join; enforced on the server |
| 17 | Why it works for GT | Next | One-semester opt-in pilot with existing programs (proposed) |
| 18 | Close | Finish | "Georgia Tech gives us a community. GT Swarm makes it easier to find our place in it—and stay part of it for life." |

## Startup demo (Startups page → Watch the startup demo)

| # | Chapter | The judge does | What they see |
|---|---|---|---|
| 1 | The problem | Reads, **Next** | Founders can't find help; builders can't find startups |
| 2 | Discover | Reads, **Next** | Restwell Patch in the startup feed (no sign-up); you are now Elena, its alum founder |
| 3 | Founder → Expertise | Fills the example (or types), **Find people** | Dana Whitfield, an alum, ranks first |
| 4 | Founder → Expertise | **Why this match?** | How her score adds up, from her record |
| 5 | The web behind the match | **View network** | Distance = relevance; lines = documented ties only |
| 6 | The web behind the match | Clicks Dana on the map | Documented warm path: Elena → Diego Park → Dana; keyword vs semantic relevance |
| 7 | Founder → Expertise | **Invite to connect → Send invite** | "Sent", reason attached |
| 6 | Builder → Opportunity | As Maya: **Find Your Startup** tab | Restwell recommended from her profile |
| 7 | Builder → Opportunity | **Request to join → Send request** | "Sent to Elena" |
| 8 | Consent | As Elena: **Accept** | Accepted; joining the team stays her choice |
| 9 | Introduction made | Reads, **Next** | Maya in Elena's connections; Dana's invite waiting |
| 10 | How GT gets this | **Finish** | The SGA pilot plan: a one-semester, opt-in pilot run by SGA with existing programs (proposed) |

The tour opens pages and switches personas itself; the judge only does the actions above (about 60 to 90 seconds). Every action has **Skip, do it for me**. Get Unstuck, profile building from a resume, the network map and Impact for GT are left for the judge to explore.

**Before presenting:** click **Start guided demo** once to warm the site up, then click it again. Each click starts a fresh private session, so a judge clicking along never sees your changes and you never see theirs.

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
- **Sign-in would use GT single sign-on** for students and email invites for alumni. Not built; the "Demo persona" switcher stands in for it.
- **Founders keep their startup pages current** (stage, open roles, needs). Stale pages make matches worse; owners can edit status in one click.
- **People are honest about roles and availability.** Willingness to cofound or advise is self-reported, and it gates who appears for that role.
- **One office could run it.** It is one web app and one database, with an optional Gemini key for meaning-based search and document reading. Matching works without it.
- **Students use it at specific moments:** looking for a team or startup, needing an advisor or engineer, or stuck on a problem, not as a daily feed.
- **Alumni give small amounts of time.** Most alumni will not join a startup, but many will answer a specific 15-minute question about something they already solved. The product is built around that small ask.
- **Demo-only tools are off in production.** The data reset works in development, or only when `GTSWARM_DEMO=1` is set.

## If something goes wrong
- Click **Demo** again (it resets the data) or open `localhost:3000/demo/reset`.
- If Gemini is slow or unavailable, the matching still works. Keep going.
