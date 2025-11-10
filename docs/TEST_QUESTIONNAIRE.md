# Test Questionnaire - Seeded Data

This document describes the test questionnaire that can be injected into the local/dev database using the built-in seed endpoint, and how to use it for testing the Questionnaire Register UI.

## Seed endpoint

URL: `POST /api/questionnaires/seed`

Query parameters:
- `secret` (optional) — If you set `DEV_SEED_SECRET` in `.env.local`, provide the same value here to allow seeding.
- `variant=physical` (optional) — Seeds the physical security questionnaire described below.

Examples:

1) Seed the physical security questionnaire (no secret required in non-production):

```bash
curl -X POST "http://localhost:3000/api/questionnaires/seed?variant=physical"
```

2) Seed the default sample questionnaire:

```bash
curl -X POST "http://localhost:3000/api/questionnaires/seed"
```

## Physical Security Questionnaire (variant=physical)

The seeded questionnaire includes these questions and the pre-filled answers (test data):

1. Are all data center entry points protected by controlled access systems?
   - Answer: Partially Implemented

2. Is CCTV installed to cover all critical areas and are video recordings retained as per policy?
   - Answer: Yes

3. Are biometric or smart card authentication systems used for personnel access?
   - Answer: No

4. Are visitor entries and exits logged, monitored and reviewed regularly?
   - Answer: Yes

## How to test in the UI

1. Start the dev server:

```bash
npm run dev
```

2. Seed the questionnaire using the curl command above.

3. In the app, open the Questionnaire Register (the Risks page has been repurposed to show questionnaires).

4. Select the seeded questionnaire. Each question appears with the imported answer and a per-question form to create a risk.

5. Fill the risk fields (risk name, category, pre-mitigation probability/impact, mitigation cost, mitigation effectiveness) and click "Create Risk".

6. Verify that the risk was created by checking the Risks API or using the UI where registered risks are displayed.

## Notes
- The seeded questionnaire is marked with `status: pending`. If you want automatic analysis to run after seeding, we can update the seed endpoint to trigger `POST /api/analysis/process` for the saved questionnaire.
- The seed endpoint is intentionally dev-only: it will refuse to run if in production and the correct `DEV_SEED_SECRET` is not provided.
