# Automatic Questionnaire Analysis — Developer Guide

This document explains the recent Automatic Analysis work: what was added, why, how it works, how to test it, and operational / scaling guidance.

Table of contents
- Overview
- High-level flow
- Files changed / added (map)
- Key contracts & data shapes
- Detailed behavior per component
  - Questionnaire post-save hook
  - Analysis lock (Mongo-based)
  - performRiskAnalysis and dev stub
  - RiskAnalysis model
  - SSE hub and stream route
  - API routes changes (seed/fetch/process)
  - Dashboard client behavior
- How to test (local dev checklist)
- Edge cases and failure modes
- Production considerations and recommended improvements
- Admin / maintenance scripts
- Frequently asked developer questions (FAQ)

---

Overview
--------
Goal: automatically analyze questionnaires when they are created or imported, prevent duplicate/racing analysis runs, and push near-real-time updates to the dashboard.

Why this change:
- Previously analysis was triggered manually or from multiple places leading to race conditions and duplicate results.
- Developers want automatic processing for newly ingested questionnaires and prompt UI updates when analysis completes.

High-level flow
---------------
1. A `Questionnaire` is created/saved (seed endpoint, external fetch, or via UI).
2. Mongoose `post('save')` hook on `Questionnaire` starts an asynchronous analysis routine.
3. The hook acquires an analysis lock (Mongo-based) to ensure idempotency.
4. `performRiskAnalysis` runs (uses LLM when `OPENROUTER_API_KEY` is set; otherwise a dev stub).
5. `RiskAnalysis` document is saved and `Questionnaire.status` is updated to `analyzed`.
6. An `analysis` SSE event is broadcast to connected dashboard clients.
7. Dashboard clients refresh processed assessments (via SSE event handler or polling fallback).

Files changed / added (map)
---------------------------
New files:
- `models/AnalysisLock.ts` — Mongoose schema for locks (unique index on questionnaireId, expiresAt field).
- `lib/services/analysisLock.ts` — helpers: `acquireAnalysisLock(questionnaireId)`, `releaseAnalysisLock(questionnaireId)`.
- `lib/sseHub.ts` — in-memory SSE subscriber hub + `broadcastEvent`.
- `app/api/notifications/stream/route.ts` — SSE stream (EventSource-compatible) endpoint.

Modified files:
- `models/Questionnaire.ts` — added `post('save')` hook to run auto-analysis when `status === 'pending'`.
- `lib/services/riskAnalyzer.ts` — improved dev stub; `performRiskAnalysis` remains the main entrypoint.
- `app/api/questionnaires/seed/route.ts` — seed endpoint now supports `?random=true`/`?category=...` and no longer triggers analysis explicitly.
- `app/api/questionnaires/fetch/route.ts` — removed explicit analysis POST now that auto-analysis is handled by model hook.
- `app/api/analysis/process/route.ts` — manual analysis endpoint now uses lock acquisition and returns 409 if analysis is in progress.
- `app/dashboard/page.tsx` — subscribes to SSE stream and falls back to polling (15s) if SSE is not available.

Key contracts & data shapes
---------------------------
Note: these are the important shapes your code expects.

Question (IQuestion):
- id: number
- question: string
- answer: string
- section: string
- level: 'operational' | 'tactical' | 'strategic'

Questionnaire (IQuestionnaire):
- externalId, title, company, filledBy, role, filledDate
- category: string (required at model level; hook will infer if missing)
- status: string ('pending'|'analyzed'...)
- questions: IQuestion[]

RiskAnalysis (IRiskAnalysis):
- questionnaireId: ObjectId (unique) — prevents duplicate analyses
- company: string
- category: string
- metadata: { timestamp, totalQuestions, levels }
- operational, tactical, strategic: arrays of question analysis objects

QuestionAnalysis (IQuestionAnalysis) format (persisted in RiskAnalysis arrays):
- questionId, section, question, answer, level
- analysis: { likelihood:number, impact:number, riskScore:number, riskLevel:string, riskColor:string, gap:string, threat:string, mitigation:string }
- timestamp: Date

SSE `analysis` event payload (minimal):
- { id: string, company: string, category: string, summary: object }

Detailed behavior per component
-------------------------------

1) Questionnaire post-save hook (`models/Questionnaire.ts`)
- Trigger point: runs after `Questionnaire.save()` succeeds.
- Conditions: only runs when `doc.status === 'pending'` (so existing analyzed docs won't retrigger).
- Steps:
  a. Check if a `RiskAnalysis` already exists for this questionnaire.
  b. Infer `category` from question `level` counts if `doc.category` missing.
  c. Acquire a lock via `acquireAnalysisLock(doc._id)` (Mongo-based lock).
  d. If lock acquired, call `performRiskAnalysis(doc.questions, apiKey)`.
     - `apiKey` is `process.env.OPENROUTER_API_KEY || ''`.
  e. Save a `RiskAnalysis` document containing results.
  f. Broadcast an SSE `analysis` event with summary data.
  g. Update `Questionnaire.status` to `analyzed` (and persist inferred category).
  h. Release the lock in a finally block.
- Error handling: the hook wraps actions in try/catch and logs errors; it does not throw to the caller to avoid breaking the save operation.

2) Analysis Lock (`models/AnalysisLock.ts` + `lib/services/analysisLock.ts`)
- Purpose: ensure only one analyzer handles a questionnaire at a time, across processes.
- Implementation:
  - Mongo document with unique index on `questionnaireId`.
  - `acquireAnalysisLock(questionnaireId)` tries to `create()` the lock document.
    - On duplicate key error (11000), it checks for an existing `expiresAt` and if expired, removes it and tries again.
    - Returns an object `{ acquired: boolean, lock?: doc, reason?: string }`.
  - `releaseAnalysisLock(questionnaireId)` removes the lock document.
- TTL semantics: locks have an `expiresAt` timestamp. Default TTL is 5 minutes. This avoids permanent stale locks if the process dies before releasing.

3) performRiskAnalysis (`lib/services/riskAnalyzer.ts`)
- This is the central analysis orchestrator used by both the hook and manual endpoint.
- Behavior:
  - Accepts `questionnaireData` (array of questions) and `apiKey`.
  - If `apiKey` provided, uses `initializeAI(apiKey)` and `analyzeQuestion(...)` for each question.
  - If no `apiKey`, uses a smarter dev fallback (heuristics) that derives likelihood and impact from `question.answer`, `question.question`, and `question.level` with a small jitter so dev runs vary.
  - Returns an object with `metadata`, `operational`, `tactical`, `strategic`, and `summary` fields.
- Important: the stub now writes top-level `riskScore`, `riskLevel`, `riskColor` fields in the analysis object so downstream consumers like `createQuestionResult` read them consistently.

4) RiskAnalysis model
- Unchanged schema (except indexing) but it is the persisted artifact of analysis runs. `questionnaireId` is unique to prevent duplicate analyses.

5) SSE hub and stream route
- `lib/sseHub.ts` keeps a list of connected client controllers and exposes `subscribe`, `unsubscribe`, and `broadcastEvent(event, data)`.
- `app/api/notifications/stream/route.ts` creates a `ReadableStream`, subscribes its controller, and responds with `text/event-stream` so browsers can open an `EventSource`.
- The server broadcasts `analysis` events after saving a `RiskAnalysis`. The payload is a JSON data object stringified in the `data:` line.
- The SSE hub is in-memory. For multiple server instances or serverless environments you must replace it with Redis pub/sub (or another central broker).

6) API routes changes
- `app/api/questionnaires/seed/route.ts`
  - Adds `?random=true` or `?randomCategory=true` to randomize category.
  - You can force `?category=operational|tactical|strategic` to set a category explicitly.
  - Seed route no longer POSTs to `/api/analysis/process` because the model hook auto-runs analysis.

- `app/api/questionnaires/fetch/route.ts`
  - Now saves incoming questionnaires and relies on the model hook for analysis. No explicit POST to `/api/analysis/process`.

- `app/api/analysis/process/route.ts`
  - Manual analysis endpoint now attempts to `acquireAnalysisLock` and will return 409 if another analysis is in progress for that questionnaire.
  - It still performs analysis if lock succeeds; lock is released after analysis or on error.

7) Dashboard client changes (`app/dashboard/page.tsx`)
- Client attempts to connect to `/api/notifications/stream` with `EventSource`.
- If SSE connection is established, it listens for `analysis` events and triggers `fetchProcessedAssessments()` and `fetchQuestionnaires()` to refresh UI.
- If SSE is unavailable or errors out, client falls back to polling every 15 seconds.

How to test (local dev checklist)
---------------------------------
Prereqs:
- Make sure `MONGODB_URI` is set and points to your dev Mongo.
- Optionally set `OPENROUTER_API_KEY` if you want real LLM analysis.
- `DEV_SEED_SECRET` in `.env.local` for seed endpoint security.

Steps:
1. Start dev server: `npm run dev`.
2. Seed a test questionnaire (random category):
   ```
   curl -X POST "http://localhost:3000/api/questionnaires/seed?secret=YOUR_DEV_SECRET&random=true"
   ```
   - Watch server logs for `Auto-analysis completed for questionnaire <id>`.
3. Open Dashboard and ensure:
   - The new questionnaire appears with `status` changed to `analyzed` after processing.
   - The new RiskAnalysis displays in Processed Assessments.
   - SSE (EventSource) connection established: check your browser console network tab for `/api/notifications/stream`.
4. Manual analysis attempt
   - If you call `/api/analysis/process` on the same questionnaire simultaneously, one will acquire the lock and the other will return 409.

Edge cases & failure modes
--------------------------
- Missing category: hook infers category from question levels and persists it.
- Duplicate analyses: `questionnaireId` unique index and lock prevent duplicates.
- Stale locks: if a lock is never released (process crash), TTL on `expiresAt` allows another process to clean it up.
- SSE disconnects: client falls back to polling; server logs broadcast errors but does not fail analysis flow.
- Multi-instance scaling: SSE hub is in-memory — it won't broadcast across instances. Use Redis pub/sub for distributed broadcasting.
- Heavy analysis load: synchronous analysis in-process can tie up server resources; move to a queue/worker model for scale.

Production considerations & recommended improvements
--------------------------------------------------
1. Use a message queue / worker pool for analysis:
   - Move `performRiskAnalysis` invocations to background workers (BullMQ + Redis is a good fit).
   - API and hooks enqueue jobs; workers process and persist `RiskAnalysis`.
   - Benefits: control concurrency, retry, backoff, and better observability.

2. Replace in-memory SSE hub with centralized pub/sub (Redis Pub/Sub or Redis Streams):
   - Every server instance subscribes to a Redis channel; when an analysis completes, publish to Redis.
   - Each server instance receives the message and forwards it to its connected clients.

3. Strengthen lock semantics (optional):
   - Use Redis distributed locks (Redlock) for faster acquisition and TTL handling.
   - Alternatively, keep Mongo lock but add periodic cleanup job.

4. Observability & metrics:
   - Instrument analysis start/end durations, failures, queue size, and lock collisions.
   - Add structured logs with correlation ids (questionnaireId) to tie flows together.

5. Security:
   - Protect the SSE endpoint: verify sessions/cookies before allowing subscription.
   - Ensure analysis endpoints have proper authentication and authorization.

Admin / maintenance scripts
---------------------------
- Backfill categories for existing questionnaires (in repo or via mongo shell):
  ```js
  // mongo shell example
  db.questionnaires.find({ $or: [{ category: { $exists: false } }, { category: null }, { category: "" }] }).forEach(function(q) {
    const counts = { operational: 0, tactical: 0, strategic: 0 };
    (q.questions || []).forEach(function(qq) { if (qq && qq.level) { const lvl = String(qq.level).toLowerCase(); if (lvl in counts) counts[lvl]++; } });
    const chosen = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0] || 'operational';
    db.questionnaires.updateOne({ _id: q._id }, { $set: { category: chosen } });
    print('Updated', q._id, '->', chosen);
  });
  ```

- List & clear stale locks (example admin script idea):
  - Find `AnalysisLock` documents with `expiresAt < new Date()` and delete them.

FAQ (short)
-----------
Q: Why not trigger analysis directly from seed/fetch endpoints?
A: Doing so caused race conditions and duplicate runs. Centralizing analysis in the model hook ensures a single canonical behavior irrespective of source.

Q: Is SSE secure / scalable?
A: SSE is fine for single-instance servers and works with browser EventSource. For multi-instance deployment use central pub/sub to route broadcast messages to all instances.

Q: What if analysis fails?
A: The hook logs failures and leaves `Questionnaire.status` unchanged (still `pending`). You can implement an admin retry endpoint to re-run analysis for pending questionnaires.

Q: Can analysis be long-running?
A: Yes. For large questionnaires or slow LLMs, move analysis to a job queue and background worker for robust scaling.

Appendix: quick commands
------------------------
- Start dev:
  ```bash
  npm run dev
  ```

- Seed dev data (random category):
  ```bash
  curl -X POST "http://localhost:3000/api/questionnaires/seed?secret=YOUR_DEV_SECRET&random=true"
  ```

- Trigger manual analysis:
  ```bash
  curl -X POST http://localhost:3000/api/analysis/process \
    -H "Content-Type: application/json" \
    -d '{"questionnaireId":"<id>"}'
  ```

- Check environment key:
  ```bash
  printenv OPENROUTER_API_KEY || echo "NOT SET"
  ```

---

If you'd like, I can:
- Add this file to the repo (already created as `docs/AUTO_ANALYSIS.md`).
- Implement Redis-backed pub/sub for SSE (I can add code and a README showing setup).
- Convert the synchronous analysis to a BullMQ worker queue and a small worker script.

Tell me which next step you prefer and I will implement it.