# Deploying GT Swarm (Vercel + Supabase + GitHub)

The public demo runs on **Vercel** (the Next.js app) with **Supabase Postgres** (the data). The code lives on **GitHub**; every push to the main branch redeploys automatically.

## How hosted data works

- **Dataset in Postgres.** Schema `gts` mirrors the app's tables (people, projects, skills, problems, milestones, connections, requests, build statuses, preferences, precomputed Gemini embeddings). `npm run db:seed` creates and fills it from the local demo database. Run it once, and again only when the demo data changes.
- **One private demo session per visitor.** Middleware gives every visitor an opaque `gtswarm_session` cookie. Their invites, requests, accepts and profile edits are appended to `gts.session_ops` under that id. On each request the server loads the dataset into an in-memory SQLite copy (cached per function instance) and replays that visitor's log, so:
  - nothing is lost between serverless invocations or deployments;
  - visitors never see or disturb each other's demo;
  - "Demo" / reset starts a new private session for that visitor only. There is no shared reset endpoint.
- **Locked down.** Row level security is on for every table with no policies, and the `gts` schema is not exposed through Supabase's API, so the public anon key cannot read or write anything. Only the server, holding `DATABASE_URL`, can. Each session is capped at 600 changes.
- **Deterministic matching, no AI required.** Matching uses the stored records and keyword scoring. The local embedding model is never loaded on Vercel. `GEMINI_API_KEY` is optional; leave it unset for the most predictable judging demo.

## First deployment

1. **Supabase.** Create a project (free tier; region East US is closest to Vercel's default). In **Connect → Connection string → Transaction pooler**, copy the URI (port 6543) and put your database password in it.
2. **Seed the database** from this folder. Put the URI in `.env.deploy.local` as `DATABASE_URL=...` (this file is git-ignored), then:
   ```bash
   npx tsx --env-file=.env.deploy.local scripts/db-seed.ts
   ```
3. **GitHub.** Create an empty repository and push:
   ```bash
   git remote add origin https://github.com/<you>/gt-swarm.git
   git push -u origin master
   ```
4. **Vercel.** Add New → Project → import the repository. Framework: Next.js (detected). Under Environment Variables add `DATABASE_URL` (the same pooler URI). Deploy.

## Redeploying updates

- Code: commit and `git push`. Vercel builds and deploys automatically.
- Demo data: change it locally (`npm run seed`, `npm run ai:warm`), then rerun the seed command above. Add `-- --reset-sessions` to also clear every visitor's demo changes.

## Local development

Without `DATABASE_URL` the app uses `data/gtswarm.db` exactly as before: `npm run dev`.
