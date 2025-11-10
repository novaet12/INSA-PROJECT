# Setup & Demo Guide — Run the app with seeded questionnaires

This document explains how to get the project running locally, inject the test (physical-security) questionnaire, verify the UI and DB, and how to clean up or harden the disposable test code before deploying.

Intended audience: developers preparing a demo or presentation.

---

## Quick summary (one-liners)

- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Seed the physical questionnaire (HTTP): `curl -X POST "http://localhost:3000/api/questionnaires/seed?variant=physical"`
- Or seed directly using the local script: `node scripts/seedNow.js`
- Open the app and go to `/risks` (Questionnaire Register) to view the seeded questionnaire and create risks.

---

## Prerequisites

- Node.js 18+ (v20 tested here). Confirm with:

```bash
node -v
```

- MongoDB running and reachable. For local development, a local MongoDB listening on default port is fine (mongodb://localhost:27017). You can use MongoDB Atlas if you prefer.

- A terminal with bash (Linux/macOS recommended).

---

## Environment variables (.env.local)

Create a `.env.local` at the project root (there is an example already) with at least:

```
MONGODB_URI=mongodb://localhost:27017/csrars
NEXTAUTH_SECRET=some_long_random_secret
NEXTAUTH_URL=http://localhost:3000
```

Optional for the test seed endpoint (recommended):

```
DEV_SEED_SECRET=mysupersecret
```

Notes:
- `DEV_SEED_SECRET` is optional. If set, the seed API requires `?secret=mysupersecret`. If not set, the seed route will accept requests in non-production environments.
- Never commit `.env.local` or any secrets to version control.

---

## Install dependencies

From the project root:

```bash
npm install
```

If you see issues with native packages, ensure your Node version is compatible with the dependencies in `package.json`.

---

## Run the app (dev)

Start the dev server:

```bash
npm run dev
```

Common notes:
- If `npm run dev` exits with code `130`, it typically means the process was interrupted (SIGINT). Re-run the command and watch the server logs for errors.
- If the server fails to start due to TypeScript errors, run a type check:

```bash
npx tsc --noEmit
```

And fix any reported errors.

---

## Seed the physical-security questionnaire (two ways)

### Option A — Call the seed HTTP endpoint (requires dev server running)

- Without a secret (allowed on local/dev):

```bash
curl -X POST "http://localhost:3000/api/questionnaires/seed?variant=physical"
```

- With a secret (if you set `DEV_SEED_SECRET`):

```bash
curl -X POST "http://localhost:3000/api/questionnaires/seed?variant=physical&secret=mysupersecret"
```

The endpoint returns JSON with the created questionnaire. The endpoint will also attempt to auto-trigger analysis by calling `/api/analysis/process` (best-effort). If analysis runs, you should see an analysis and/or reports generated.

### Option B — Run the local seed script (does not require the dev server)

We included `scripts/seedNow.js` to insert the questionnaire directly into the database.

Run:

```bash
node scripts/seedNow.js
```

This prints the saved document and the new document ID. (This script reads `.env.local` manually — no extra dependencies required.)

---

## Verify the seeded questionnaire

1. API listing (requires dev server):

```bash
curl "http://localhost:3000/api/questionnaires/list"
```

Look for objects with `externalId` starting with `DEV-` or the seeded title.

2. UI verification:
- Open a browser and go to `http://localhost:3000/risks`.
- The left panel lists questionnaires. Select the newly seeded questionnaire (title: "Physical Security Assessment - Seed (Test)").
- Each question should appear with the imported answer. Use the per-question form to create risks.

3. DB verification (Mongo shell or Compass):

Connect to your DB and query:

```js
use csrars
db.questionnaires.find({ externalId: /^DEV-/ }).pretty()
```

You should see the seeded document.

---

## What the seed endpoint does (so you can modify or remove it)

File: `app/api/questionnaires/seed/route.ts`

- Inserts a `Questionnaire` document containing the `variant` you request (`physical` or `default`).
- After inserting, it attempts to POST to `/api/analysis/process` with `{ questionnaireId }` to start analysis. This is best-effort and errors are logged.
- Access control: the endpoint accepts requests if either:
  - `NODE_ENV !== 'production'` (development mode), or
  - `DEV_SEED_SECRET` is set and the request matches `?secret=...`.

If you plan to deploy or publish this repository, consider one of these:

- Remove `app/api/questionnaires/seed/route.ts` entirely. This is the safest option for production.
- Require `NODE_ENV === 'development' && secret === DEV_SEED_SECRET` so it cannot be triggered in production.
- Replace with a CLI script (e.g., `node scripts/seedNow.js`) and do not expose an HTTP endpoint.

---

## Cleanup / Hardening before deployment

Before deploying to production, follow these steps:

1. Remove or restrict seed endpoint:
   - Delete `app/api/questionnaires/seed/route.ts`, or
   - Require `NODE_ENV === 'development' && secret === DEV_SEED_SECRET`.

2. Remove the seed script or protect it (keep it in a private admin-only repo or as a local-only script).

3. Remove any developer-only UI or gate it behind a feature flag or admin role.

4. Ensure `.env.local` and any secrets are not committed.

5. Run type-check and lint:

```bash
npx tsc --noEmit
npm run lint
```

Note: running `npm run lint` may prompt an ESLint setup if not configured. Ensure `.eslintrc.json` is present or install the necessary packages.

---

## Files added/modified for testing (disposable)

- Added: `app/api/questionnaires/seed/route.ts` — dev-only HTTP seed endpoint
- Added: `app/api/questionnaires/list/route.ts` — lists questionnaires for the UI
- Modified: `app/risks/page.tsx` — repurposed page to act as "Questionnaire Register" for testing
- Added: `scripts/seedNow.js` — Node script to seed directly into DB (no dev server required)
- Added: `docs/TEST_QUESTIONNAIRE.md` and `docs/SETUP_WITH_SEED.md` — documentation for testing

---

## Troubleshooting tips

- "Cannot connect to MongoDB": make sure MongoDB is running and `MONGODB_URI` is correct.
- `node scripts/seedNow.js` fails with module errors: the script uses only built-in Node modules + `mongoose`. Ensure `npm install` completed and `mongoose` is installed.
- TypeScript errors: `npx tsc --noEmit` to see exact issues.
- Dev server exit with code 130: typically interrupted manually. Re-run `npm run dev` and capture the logs.

---

## Want me to do any final prep for the presentation?

I can:
- Remove/harden the seed endpoint before you push the repo.
- Add a one-click demo script (a single shell script that runs install, starts the server in background, seeds, and opens the browser — useful for demos).
- Create a short PDF slide or a one-page handout summarizing how the demo works.

Tell me which of these you'd like and I will implement it now.
