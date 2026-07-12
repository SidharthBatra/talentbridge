# TalentBridge — Backend (Foundation: Auth + Users)

Module 1 of 4. Provides the **authentication + user management foundation**
(NestJS + PostgreSQL + TypeORM) that the jobs/pipeline, AI, and frontend
teams build on top of. It deliberately contains **no** business logic
(job postings, applications, AI, WebSockets) — those live in other modules.

## Stack

NestJS 10 · TypeScript · PostgreSQL 15 · TypeORM (migrations) · Passport.js
(JWT) · bcrypt · Swagger · Jest + Supertest · Docker Compose.

## What's inside

| Area | Path |
| --- | --- |
| Auth (register/login/refresh/logout, JWT strategies) | `src/modules/auth` |
| Users (entity + ADMIN management CRUD) | `src/modules/users` |
| Shared auth scaffolding (guards, decorators, Role enum) | `src/common` |
| App/DB config | `src/config`, `src/database`, `src/app.module.ts` |
| Migrations | `src/migrations` |
| Tests | `src/**/*.spec.ts` (unit), `test/*.e2e-spec.ts` (integration) |

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
| `GEMINI_API_KEY` | Shared contract for the AI module (unused here) |

---

## Migrations

Schema is owned entirely by migrations — TypeORM `synchronize` is **off**.

```bash
npm run migration:run       # apply pending migrations (empty DB → ready)
npm run migration:revert    # roll back the last migration
# after changing an entity, generate a new migration:
npm run migration:generate -- src/migrations/DescribeChange
```

The initial migration (`src/migrations/1720000000000-InitSchema.ts`) creates
`users` and `refresh_tokens` and runs cleanly against an empty database.

---

## API summary

Base path: `/api`. Full interactive docs at **`/api`** (Swagger, generated
from decorators — not hand-written).

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
See `src/modules/users/users.controller.ts` for a working ADMIN-only example.

---

## Testing

```bash
npm test            # unit specs (no DB needed): auth service + RolesGuard
npm run test:cov    # unit specs with coverage
npm run test:e2e    # HTTP integration tests — REQUIRES a running Postgres
```

For `test:e2e`, point `DATABASE_URL` at a disposable database with the schema
applied (`docker-compose up -d postgres && npm run migration:run`). The e2e
suite covers register, login, invalid credentials, refresh (rotation +
expired + reuse), logout, and CANDIDATE-token rejection on an ADMIN route.
