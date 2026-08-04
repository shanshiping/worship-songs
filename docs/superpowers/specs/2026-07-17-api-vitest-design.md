# API + Lib Vitest Testing Design

**Date:** 2026-07-17  
**Status:** Approved  
**Approach:** A — Vitest + route unit tests + Prisma mock

## Summary

Introduce Vitest for API route handlers and pure `src/lib` functions. Mock Prisma (no real database). Enforce “feature changes must pass tests” via a Cursor project rule and `pnpm test` scripts. No CI, no pre-commit hook, no Playwright/E2E in this scope.

## Decisions

| Decision | Choice |
|----------|--------|
| Test layers | API routes + `src/lib` pure functions |
| Database | Mock Prisma (`vi.mock('@/lib/prisma')`) |
| Runner | Vitest |
| Enforcement | Cursor rule (`alwaysApply`) + `pnpm test` |
| UI / E2E | Out of scope |
| CI / hooks | Out of scope |
| Auth internals | Do not unit-test `auth/[...nextauth]`; mock session / permissions instead |

## Architecture

### Layout

```
tests/
  setup.ts
  helpers/
    mock-prisma.ts
    request.ts
  unit/
    lib/
      errors.test.ts
      permissions.test.ts
      utils.test.ts
      i18n.test.ts
      songs-normalize.test.ts   # normalizeOptional / isValidHttpUrl from songs route
  api/
    songs.test.ts
    songs-[id].test.ts
    meetings.test.ts
    meetings-[id].test.ts
    categories.test.ts
    categories-[id].test.ts
    leaderboard.test.ts
    dashboard.test.ts
    export.test.ts
    import.test.ts
    share.test.ts
    users.test.ts
    settings-profile.test.ts
    settings-password.test.ts
    teams.test.ts
    teams-[id].test.ts
    teams-members.test.ts
    teams-messages.test.ts
    auth-register.test.ts
    auth-send-code.test.ts
    upload.test.ts
    files-upload.test.ts
```

### Tooling

- `vitest.config.ts` — Node environment, `@/` path alias matching `tsconfig`
- `tests/setup.ts` — shared setup if needed
- Scripts in `package.json`:
  - `pnpm test` — run once (CI-friendly default)
  - `pnpm test:watch` — local watch mode

### Mock conventions

- Mock `@/lib/prisma` with a factory that exposes `vi.fn()` for used models/methods (`song`, `meeting`, `category`, etc.)
- Mock `next-auth` / `@/lib/server-permissions` when routes require session or roles
- `beforeEach`: reset mocks; set return values per case
- Call exported handlers (`GET`, `POST`, `PUT`, `DELETE`) with a constructed `Request` and optional `{ params: Promise<{ id }> }`
- Assert HTTP status + JSON body (and key Prisma call shapes when relevant, e.g. song update uses `category: { connect }`)

### Helpers

- `tests/helpers/request.ts` — build `Request` with method/URL/body/headers; parse `NextResponse` JSON
- `tests/helpers/mock-prisma.ts` — create/reset typed-ish prisma mock object

## Coverage checklist

### Lib unit tests

| Module | Cases |
|--------|--------|
| `errors` | `getErrorMessage` for `Error` and non-Error |
| `permissions` | role → permission matrix (`hasPermission`, role lists) |
| `utils` | `cn` class merging |
| `i18n` | `isLocale`, `htmlLang`, `translate` (fallback + `{param}` interpolation) |
| songs route exports | `normalizeOptional`, `isValidHttpUrl` |

### API routes (each: happy path + primary failure / auth)

| Area | Routes |
|------|--------|
| Songs | `/api/songs`, `/api/songs/[id]` |
| Meetings | `/api/meetings`, `/api/meetings/[id]` |
| Categories | `/api/categories`, `/api/categories/[id]` |
| Leaderboard / Dashboard | `/api/leaderboard`, `/api/dashboard` |
| Data | `/api/import`, `/api/export` |
| Share | `/api/share` |
| Users / Settings | `/api/users`, `/api/settings/profile`, `/api/settings/password` |
| Teams | `/api/teams`, `/api/teams/[id]`, `members`, `messages` |
| Auth | `/api/auth/register`, `/api/auth/send-code` |
| Upload | `/api/upload`, `/api/files/upload` (mock filesystem / parsers) |

### Explicitly out of scope

- `auth/[...nextauth]` handler internals
- React page / component tests
- Playwright / Cypress E2E
- Real PostgreSQL or Docker test DB
- GitHub Actions CI and git hooks

## Cursor rule

File: `.cursor/rules/testing.mdc` (`alwaysApply: true`)

1. Behavior changes to API routes or `src/lib` must add or update matching tests under `tests/`
2. Before claiming work complete, run `pnpm test` and confirm green
3. Do not ship production-only changes without tests for the changed behavior
4. New API routes require a corresponding `tests/api/*.test.ts`

## Acceptance criteria

1. `pnpm test` runs successfully with Vitest installed and configured
2. All listed lib modules have at least the cases above
3. All listed API routes (except nextauth catch-all) have tests covering success + main error/auth paths
4. Cursor testing rule is present and always applied
5. README briefly documents how to run tests (`pnpm test`)

## Implementation notes

- Prefer testing public handler behavior over private implementation details
- Keep mocks minimal — only stub methods the route actually calls
- For file upload / Excel import, mock `xlsx` / fs / parsers rather than reading real files when possible; fixture buffers OK when needed
- Do not introduce a service-layer refactor solely for testability in this effort
- Implementation may be phased (lib → core CRUD → remaining APIs) but acceptance requires the full coverage checklist green under one `pnpm test` run
- `prisma.ts` itself is not unit-tested beyond mock usage (adapter/proxy is environment wiring)