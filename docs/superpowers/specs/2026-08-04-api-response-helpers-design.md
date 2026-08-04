# API Response Helpers Design

**Date:** 2026-08-04  
**Status:** Approved

## Summary

Thin wrappers around `NextResponse.json` for success and error responses, plus `fromError` that maps auth/permission thrown messages to HTTP status. Response body shapes stay unchanged so existing API tests keep working.

## Decisions

| Decision | Choice |
|----------|--------|
| Style | Named exports (`ok`, `created`, `err`, …) |
| Body shape | Unchanged: bare data, `{ error }`, `{ message }` |
| Auth errors | Keep throwing `Error('请先登录' \| '权限不足')` from `requirePermission` |
| ApiError class | Out of scope |
| Migration | Incremental: helper + tests first; migrate playlists / tags / share routes |

## API (`src/lib/api-response.ts`)

| Function | Status | Body |
|----------|--------|------|
| `ok(data)` | 200 | `data` |
| `created(data)` | 201 | `data` |
| `message(text)` | 200 | `{ message: text }` |
| `err(text, status)` | `status` | `{ error: text }` |
| `unauthorized()` | 401 | `{ error: '请先登录' }` |
| `forbidden()` | 403 | `{ error: '权限不足' }` |
| `notFound(text?)` | 404 | `{ error }` (default: `资源不存在`) |
| `fromError(error, fallback)` | 401 / 403 / 500 | `{ error: message }` via `getErrorMessage` |

### `fromError` status mapping

1. Message `请先登录` → 401  
2. Message `权限不足` → 403  
3. Otherwise → 500 with resolved message (or `fallback`)

## Tests

- `tests/lib/api-response.test.ts`
- Assert status + parsed JSON for each helper, including `fromError` branches

## First migration targets

- `src/app/api/playlists/route.ts`
- `src/app/api/playlists/[id]/route.ts`
- `src/app/api/tags/route.ts`
- `src/app/api/share/route.ts`

Other routes adopt helpers opportunistically; no big-bang rewrite.

## Out of scope

- Changing client fetch / error handling
- Changing `requirePermission` throw messages
- Global try/catch middleware for all API routes
