# API + Lib Vitest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Vitest with mocked Prisma so all listed API routes and pure `src/lib` helpers have tests, and enforce “feature changes must pass `pnpm test`” via a Cursor rule.

**Architecture:** Vitest (Node) imports App Router handlers directly. `@/lib/prisma`, `next-auth`, and `@/lib/server-permissions` are mocked. Shared helpers build requests and a resettable Prisma mock. No real DB, no CI, no E2E.

**Tech Stack:** Vitest, TypeScript path alias `@/*` → `./src/*`, Next.js route handlers, Prisma Client types (mocked).

**Spec:** `docs/superpowers/specs/2026-07-17-api-vitest-design.md`

## Global Constraints

- Mock Prisma only — never connect to PostgreSQL in tests
- No `any` types (`@typescript-eslint/no-explicit-any`)
- Do not unit-test `auth/[...nextauth]` internals
- Do not refactor routes into a service layer solely for testability
- Enforcement: Cursor rule + `pnpm test` / `pnpm test:watch` only
- Commits only when the user explicitly asks

---

## File map

| Path | Responsibility |
|------|----------------|
| `vitest.config.ts` | Vitest config, `@/` alias, setup file |
| `tests/setup.ts` | Global test setup |
| `tests/helpers/mock-prisma.ts` | Prisma mock factory + reset |
| `tests/helpers/request.ts` | `Request` / JSON response helpers |
| `tests/unit/lib/*.test.ts` | Pure lib unit tests |
| `tests/api/*.test.ts` | One file per API area |
| `.cursor/rules/testing.mdc` | Always-apply testing rule |
| `package.json` | `test`, `test:watch` scripts + vitest dep |
| `README.md` | Short “Running tests” note |

---

### Task 1: Vitest scaffolding + helpers + Cursor rule

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `tests/helpers/mock-prisma.ts`
- Create: `tests/helpers/request.ts`
- Create: `.cursor/rules/testing.mdc`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Produces: `mockPrisma`, `resetPrismaMock()`, `jsonRequest(url, init)`, `readJson(response)`
  - `vi.mock('@/lib/prisma', async () => { const { mockPrisma } = await import('../helpers/mock-prisma'); return { prisma: mockPrisma } })`

- [ ] **Step 1: Install Vitest**

```bash
pnpm add -D vitest
```

- [ ] **Step 2: Add config and helpers**

`vitest.config.ts`:

```ts
import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

`tests/setup.ts`: empty export or comment placeholder.

`tests/helpers/mock-prisma.ts` — factory returning nested `vi.fn()` for models used by routes (`song`, `meeting`, `category`, `meetingSong`, `user`, `team`, `teamMember`, `message`).

`tests/helpers/request.ts`:

```ts
export function jsonRequest(
  url: string,
  init?: { method?: string; body?: unknown; headers?: HeadersInit }
): Request {
  const headers = new Headers(init?.headers)
  if (init?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return new Request(url, {
    method: init?.method ?? 'GET',
    headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
}

export async function readJson<T = unknown>(
  response: Response
): Promise<{ status: number; body: T }> {
  return { status: response.status, body: (await response.json()) as T }
}
```

- [ ] **Step 3: Scripts + Cursor rule + README**

`package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`

`.cursor/rules/testing.mdc` per spec (alwaysApply true).

README: add “Running tests” with `pnpm test`.

- [ ] **Step 4: Verify Vitest starts**

Run: `pnpm test`  
Expected: pass with 0 tests or exit 0 / “No test files found” depending on Vitest version — after Task 2 there will be tests.

---

### Task 2: Lib unit tests

**Files:**
- Create: `tests/unit/lib/errors.test.ts`
- Create: `tests/unit/lib/permissions.test.ts`
- Create: `tests/unit/lib/utils.test.ts`
- Create: `tests/unit/lib/i18n.test.ts`
- Create: `tests/unit/lib/songs-normalize.test.ts`

- [ ] **Step 1: Write lib tests covering spec checklist**

Cover:
- `getErrorMessage`
- `hasPermission` / `isSuperAdmin` / `isAdminOrAbove` / `isLeaderOrAbove`
- `cn`
- `isLocale`, `htmlLang`, `translate`, `parseLocaleCookieHeader`
- `normalizeOptional`, `isValidHttpUrl`

- [ ] **Step 2: Run**

Run: `pnpm test tests/unit/lib`  
Expected: all pass

---

### Task 3: Songs + Meetings + Categories API tests

**Files:**
- Create: `tests/api/songs.test.ts`
- Create: `tests/api/songs-[id].test.ts`
- Create: `tests/api/meetings.test.ts`
- Create: `tests/api/meetings-[id].test.ts`
- Create: `tests/api/categories.test.ts`
- Create: `tests/api/categories-[id].test.ts`

**Pattern (each file):**
1. `vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))`
2. Mock session / `requirePermission` when needed
3. Happy path + unauthenticated / validation / not-found as applicable
4. For `PUT /api/songs/[id]`, assert `prisma.song.update` data includes `category: { connect: { id } }` not bare `categoryId`

- [ ] **Step 1: Implement songs/meetings/categories tests**
- [ ] **Step 2: Run** `pnpm test tests/api/songs tests/api/meetings tests/api/categories` — all pass

---

### Task 4: Dashboard, Leaderboard, Share, Export, Import

**Files:**
- Create: `tests/api/dashboard.test.ts`
- Create: `tests/api/leaderboard.test.ts`
- Create: `tests/api/share.test.ts`
- Create: `tests/api/export.test.ts`
- Create: `tests/api/import.test.ts`

- [ ] **Step 1: Implement with mocks for groupBy/findMany/xlsx as needed**
- [ ] **Step 2: Run** `pnpm test tests/api/dashboard tests/api/leaderboard tests/api/share tests/api/export tests/api/import` — all pass

---

### Task 5: Users, Settings, Teams, Auth, Upload

**Files:**
- Create: `tests/api/users.test.ts`
- Create: `tests/api/settings-profile.test.ts`
- Create: `tests/api/settings-password.test.ts`
- Create: `tests/api/teams.test.ts`
- Create: `tests/api/teams-[id].test.ts`
- Create: `tests/api/teams-members.test.ts`
- Create: `tests/api/teams-messages.test.ts`
- Create: `tests/api/auth-register.test.ts`
- Create: `tests/api/auth-send-code.test.ts`
- Create: `tests/api/upload.test.ts`
- Create: `tests/api/files-upload.test.ts`

- [ ] **Step 1: Implement remaining API tests (mock fs/parsers for uploads)**
- [ ] **Step 2: Run** `pnpm test` — full suite green

---

### Task 6: Final verification

- [ ] **Step 1:** `pnpm test` — 0 failures
- [ ] **Step 2:** `pnpm exec tsc --noEmit` — exit 0
- [ ] **Step 3:** Confirm `.cursor/rules/testing.mdc` exists and README documents `pnpm test`

---

## Spec coverage check

| Spec item | Task |
|-----------|------|
| Vitest + scripts | Task 1 |
| Helpers + mock prisma | Task 1 |
| Cursor rule + README | Task 1 |
| Lib unit tests | Task 2 |
| Songs/Meetings/Categories | Task 3 |
| Dashboard/Leaderboard/Share/Import/Export | Task 4 |
| Users/Settings/Teams/Auth/Upload | Task 5 |
| Full green `pnpm test` | Task 6 |
| No nextauth internals / no CI / no E2E | Global constraints |
