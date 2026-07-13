# TalentBridge — Backend (Foundation + Pipeline + AI)

Modules 1–3 of 4. Module 1: **authentication + user management**. Module 2:
**job postings, candidate pipeline, interview scheduling, real-time
notifications**. Module 3: **AI proxy layer** (Gemini) for job description
generation, CV screening, interview question suggestions, and offer letter
drafting — all reusing Module 1/2's guards, decorators, and entities rather
than duplicating logic. The frontend (Module 4) lives elsewhere.

## Stack

NestJS 10 · TypeScript · PostgreSQL 15 · TypeORM (migrations) · Passport.js
(JWT) · Socket.io (`@nestjs/websockets`) · `@nestjs/schedule` (cron) ·
`multer` + `pdf-parse` (CV upload/extraction) · Google Gemini
(`@google/generative-ai`) · bcrypt · Swagger · Jest + Supertest ·
Docker Compose.

## What's inside

| Area | Path |
| --- | --- |
| Auth (register/login/refresh/logout, JWT strategies) | `src/modules/auth` |
| Users (entity + ADMIN management CRUD) | `src/modules/users` |
| Job postings (CRUD, status transitions, stats) | `src/modules/jobs` |
| Applications / pipeline (apply, stage transitions, bulk actions, CV upload) | `src/modules/applications` |
| Interview scheduler (propose/confirm, conflict detection, calendar) | `src/modules/interviews` |
| Real-time notifications (Socket.io gateway) | `src/modules/notifications` |
| Offers (draft, explicit approve-and-send, candidate response) | `src/modules/offers` |
| **AI proxy** (Gemini wrapper, 4 features, prompts, fallbacks) | `src/modules/ai` |
| Shared auth scaffolding (guards, decorators, enums) | `src/common` |
| App/DB config | `src/config`, `src/database`, `src/app.module.ts` |
| Migrations | `src/migrations` |
| Tests | `src/**/*.spec.ts` (unit), `test/*.e2e-spec.ts` (integration) |
| Prompt design docs | [`../PROMPTS.md`](../PROMPTS.md) (repo root) |

---

## Run it locally

### Option A — everything in Docker (recommended)

```bash
cd backend
cp .env.example .env          # optional: override JWT secrets
docker-compose up --build
```

This starts PostgreSQL **and** the API. The API container **runs pending
migrations automatically** before booting, so the schema is ready on first
start. API: <http://localhost:3000/api> · Swagger UI: <http://localhost:3000/api>.

### Option B — Postgres in Docker, API on host

```bash
cd backend
cp .env.example .env
docker-compose up -d postgres     # just the database
npm install
npm run migration:run             # create the schema
npm run start:dev
```

---

## Environment variables

Copy `.env.example` → `.env`. **`.env` is gitignored — never commit secrets.**

| Var | Purpose |
| --- | --- |
| `PORT` | API port (default 3000) |
| `DATABASE_URL` | Postgres connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Signing secrets |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | `15m` / `7d` |
| `GEMINI_API_KEY` | Google Gemini API key, read **only** by `src/modules/ai/ai.service.ts` — never exposed in any response DTO or reachable from the frontend |

---

## Migrations

Schema is owned entirely by migrations — TypeORM `synchronize` is **off**.

```bash
npm run migration:run       # apply pending migrations (empty DB → ready)
npm run migration:revert    # roll back the last migration
# after changing an entity, generate a new migration:
npm run migration:generate -- src/migrations/DescribeChange
```

Three migrations ship so far, and all run cleanly against an empty database:

- `src/migrations/1720000000000-InitSchema.ts` — `users`, `refresh_tokens`
- `src/migrations/1720100000000-JobsPipelineInterviews.ts` — `job_postings`, `applications`, `interviews`
- `src/migrations/1720200000000-AiOffersAndInterviewQuestions.ts` — `interviews.questions` (jsonb), `offers`

---

## API summary

Base path: `/api`. Full interactive docs at **`/api`** (Swagger, generated
from decorators — not hand-written).

### Auth & Users (Module 1)

| Method | Route | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | public | Role selectable **for demo**; in production non-CANDIDATE roles would be invite-only |
| POST | `/api/auth/login` | public | Returns `accessToken` (15m) + `refreshToken` (7d) **in the body** |
| POST | `/api/auth/refresh` | refresh token | Rotates the refresh token, returns a new pair |
| POST | `/api/auth/logout` | refresh token | Revokes the presented refresh token |
| GET | `/api/users` | ADMIN | List users |
| GET | `/api/users/:id` | ADMIN | Get one |
| PATCH | `/api/users/:id/role` | ADMIN | Change role |
| PATCH | `/api/users/:id/deactivate` | ADMIN | Soft-disable |

### Job Postings (Module 2)

| Method | Route | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/jobs/public` | public | Published jobs only |
| GET | `/api/jobs/public/:id` | public | 404s unless the job is published |
| GET | `/api/jobs` | RECRUITER/HM/ADMIN | All statuses; `?status=` filter |
| GET | `/api/jobs/:id` | RECRUITER/HM/ADMIN | Any status |
| GET | `/api/jobs/:id/stats` | RECRUITER/HM/ADMIN | Total applications, per-stage counts, days open |
| POST | `/api/jobs` | RECRUITER/ADMIN | Starts as `draft` |
| PATCH | `/api/jobs/:id` | RECRUITER/ADMIN | Creator or ADMIN only |
| PATCH | `/api/jobs/:id/status` | RECRUITER/ADMIN | Forward-only: draft→published→closed→archived |
| DELETE | `/api/jobs/:id` | RECRUITER/ADMIN | Creator or ADMIN only |

### Applications / Pipeline (Module 2)

| Method | Route | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/applications` | CANDIDATE | Job must be `published` |
| GET | `/api/applications` | any authenticated | `?jobId=&stage=&sortBy=`; candidates only ever see their own |
| GET | `/api/applications/:id` | any authenticated | Candidates restricted to their own |
| PATCH | `/api/applications/:id/stage` | RECRUITER/HM/ADMIN | RECRUITER: applied→screened→shortlisted. HIRING_MANAGER: shortlisted→interview_scheduled→offer→hired/rejected. Wrong role or skipped stage → 403/400 |
| POST | `/api/applications/bulk-action` | RECRUITER/HM/ADMIN | `{ applicationIds, action: 'advance' \| 'reject' }`; each id evaluated independently |
| POST | `/api/applications/:id/cv` | CANDIDATE (owner) | multipart, PDF only, max 5MB; extracts text into `cvExtractedText` |

### Interviews (Module 2)

| Method | Route | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/interviews` | RECRUITER/ADMIN | Propose slots |
| PATCH | `/api/interviews/:id/confirm` | CANDIDATE | Rejects overlapping confirmed interviews for the same hiring manager (409) |
| PATCH | `/api/interviews/:id/request-alternatives` | CANDIDATE | Declines all proposed slots |
| PATCH | `/api/interviews/:id/slots` | RECRUITER/ADMIN | Offers a fresh set of slots |
| PATCH | `/api/interviews/:id/cancel` | RECRUITER/HM/ADMIN | |
| GET | `/api/interviews/calendar?userId=` | any authenticated | Confirmed interviews for a user (candidate or hiring manager) |

### Real-time notifications

Socket.io namespace `/notifications`. Connect with the access token as
`socket.handshake.auth.token` (or an `Authorization: Bearer` header) — the
gateway verifies it with the same secret/config as Module 1's `JwtStrategy`
and joins the socket to rooms `user:{userId}` and `role:{role}`. Bad/missing
tokens are disconnected immediately after the handshake.

| Event | Emitted to | When |
| --- | --- | --- |
| `application.stageChanged` | `user:{candidateId}` | `PATCH /applications/:id/stage` (or bulk-action) succeeds |
| `interview.reminder` | `user:{candidateId}`, `user:{hiringManagerId}` | Cron scan finds a confirmed interview ~24h out (`InterviewReminderCron`, every 10 min) |
| `offer.responded` | `user:{recruiterId}` | Emitted by `OffersController` on `PATCH /offers/:id/respond` |

### Offers (Module 3)

| Method | Route | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/offers` | RECRUITER/HM/ADMIN | Creates a `draft` offer (letter drafted separately via `/ai/offer-letter`) |
| GET | `/api/offers/:id` | any authenticated | |
| POST | `/api/offers/:id/approve-and-send` | RECRUITER/HM/ADMIN | The **only** way status becomes `sent` — requires `draft` status + a letter already attached |
| PATCH | `/api/offers/:id/respond` | CANDIDATE | Accept/reject/negotiate; only valid once status is `sent`; emits `offer.responded` |

### AI proxy (Module 3)

All Gemini calls happen **only** inside `AiService` (`src/modules/ai/ai.service.ts`) —
the frontend never sees `GEMINI_API_KEY` or calls Gemini directly; every
feature below is a normal JWT-guarded REST endpoint on this backend.

| Method | Route | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/ai/job-description` | RECRUITER/ADMIN | Inclusive, structured JD. Call again with the same input to regenerate — no special flag |
| POST | `/api/ai/cv-score/:applicationId` | RECRUITER/HM/ADMIN | Pulls `cvExtractedText` + job data from the DB; persists `aiScore`/`aiStrengths`/`aiGaps` onto the application |
| POST | `/api/ai/interview-questions` | RECRUITER/HM/ADMIN | Pulls JD + CV summary from the DB automatically; 9 tailored questions |
| PATCH | `/api/ai/interview-questions/:interviewId` | RECRUITER/HM/ADMIN | Persists the hiring manager's final edited question list onto `interviews.questions` |
| POST | `/api/ai/offer-letter` | RECRUITER/ADMIN | Drafts letter text only — never touches the `Offer` entity or sends anything |

**Graceful degradation** (see [`PROMPTS.md`](../PROMPTS.md) for the full
rationale): every feature has a fallback, but **CV scoring is the
designated must-degrade feature** per the project constraints — if Gemini
fails or rate-limits (429), `aiScore` is left `null` and the endpoint
returns `{ scored: false, message: "...manual review is required" }`
instead of a 500. The application is never hidden or blocked from
`GET /applications` because of an AI outage; only the AI convenience layer
(auto-score/auto-sort) degrades, not candidate visibility. `AiService`
retries once on a transient failure (timeout/429/5xx) before handing back
a typed `AiResult` for the caller's fallback path — it never throws.

**Token transport decision:** both tokens are returned in the JSON body
(not httpOnly cookies). The client stores the refresh token and sends it as
`{ "refreshToken": "..." }` to `/auth/refresh` and `/auth/logout`. Refresh
tokens are persisted **hashed** in `refresh_tokens`; logout/rotation revokes
them, so a stolen-but-revoked token is rejected. Passwords are never returned
in any response.

---

## How another dev protects a new route

Import the shared scaffolding from `src/common` (barrel export) — do **not**
re-implement auth:

```ts
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  AuthenticatedUser,
  Role,
} from '../../common';

@Controller('jobs')
export class JobsController {
  // Any authenticated user:
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.jobsService.findByOwner(user.userId);
  }

  // Role-restricted (order matters: JwtAuthGuard first, then RolesGuard):
  @Roles(Role.RECRUITER, Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  create(@Body() dto: CreateJobDto) { /* ... */ }
}
```

`@CurrentUser()` yields `{ userId, email, role, companyId }`.
See `src/modules/users/users.controller.ts` for a working ADMIN-only example,
or `src/modules/applications/applications.controller.ts` for a route guarded
by both role AND resource-ownership checks.

To emit a real-time notification from another module (e.g. Module 3's
Offer flow), inject `NotificationsGateway` from `src/modules/notifications`
and call one of its `emit*` methods — no socket/auth code needed:

```ts
constructor(private readonly notifications: NotificationsGateway) {}
// ...
this.notifications.emitOfferResponded(recruiterId, offerId, 'accepted');
```

---

## CV storage

Uploaded CVs are written to `backend/uploads/cvs/` on local disk
(`src/modules/applications/cv-upload.config.ts`) — a fixed path noted there
as a placeholder for S3 in production; swapping `multer`'s `diskStorage` for
`multer-s3` is the only change needed since the rest of the upload flow only
deals with the stored file path/URL, not the storage engine.

`cvExtractedText` (populated by `pdf-parse` on upload) is a **shared
contract with Module 3** — do not rename it. `aiScore`, `aiStrengths`, and
`aiGaps` columns already exist on `Application` (nullable) so Module 3's AI
scorer needs no schema migration of its own.

---

## Testing

```bash
npm test            # unit specs (no DB needed): guard/service logic
npm run test:cov    # unit specs with coverage
npm run test:e2e    # HTTP integration tests — REQUIRES a running Postgres
```

For `test:e2e`, point `DATABASE_URL` at a disposable database with the schema
applied (`docker-compose up -d postgres && npm run migration:run`). Coverage:

- `test/auth.e2e-spec.ts` — register, login, invalid credentials, refresh
  (rotation + expired + reuse), logout, CANDIDATE-token rejection on an
  ADMIN route
- `test/jobs.e2e-spec.ts` — CRUD, creator-only edit guard, public vs.
  internal visibility, full draft→published→closed→archived transition
  chain (including rejecting skips/backward moves/terminal-state exits),
  aggregate stats
- `test/applications.e2e-spec.ts` — apply flow, publish-status guard,
  candidate-scoped listing, RECRUITER/HIRING_MANAGER stage-transition guard
  (valid + wrong-role + skipped-stage cases), bulk actions, CV upload
  mimetype/size/ownership validation
- `test/interviews.e2e-spec.ts` — propose→confirm flow, invalid-slot
  rejection, overlapping-confirmed-interview conflict detection (409)
- `test/ai.e2e-spec.ts` — all 4 AI endpoints + the interview-questions PATCH
  + the full offer draft→approve-and-send→respond flow, with
  `AiService.generateJson` overridden at the provider level (no real Gemini
  calls in tests) so every fallback path is exercised deterministically:
  rate-limit, timeout, and "not configured" all trigger their respective
  fallback responses
- Unit specs (`src/modules/applications/applications.service.spec.ts`,
  `src/modules/interviews/interviews.service.spec.ts`) cover the same
  stage-transition and conflict-detection logic in isolation, without a DB
- `src/modules/ai/ai.service.spec.ts` — unit tests for `AiService` itself,
  mocking `@google/generative-ai` directly (one level lower than the e2e
  suite): JSON parsing, markdown-fence stripping, 429/5xx/timeout
  classification, the single-retry behavior, and missing-API-key handling

Controller coverage from the e2e suite alone is comfortably above the 60%
target (auth 100%, applications ~96%, interviews ~92%, jobs ~77%, users 86%,
ai 100%, offers ~97%).
