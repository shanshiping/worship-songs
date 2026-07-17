# Bilingual UI (EN / ZH) Design

**Date:** 2026-07-17  
**Status:** Approved  
**Default locale:** English (`en`)

## Summary

Add Chinese/English language switching across the worship-songs platform UI. No URL locale prefix. Preference stored in a Cookie. Default language is English. Scope is UI copy only (not API errors, not database content).

## Decisions

| Decision | Choice |
|----------|--------|
| Locales | `en`, `zh` |
| Default | `en` |
| URL prefix | None (routes stay `/dashboard`, etc.) |
| Persistence | Cookie `locale` (1 year) |
| Scope | UI strings only (nav, pages, forms, client toasts) |
| Out of scope | API error messages, DB content (categories, song titles, etc.) |
| Switcher placement | Header (near avatar) **and** sidebar (near sign out) |
| Approach | Lightweight custom `I18nProvider` + JSON catalogs |

## Architecture

### Provider

- Mount `I18nProvider` in the root layout next to `SessionProvider`.
- Expose `useI18n()` with `{ locale, setLocale, t }`.
- On `setLocale`, update React state and write Cookie `locale`.
- On first load with no Cookie, use `en`.
- Update `<html lang>` to `en` or `zh-CN` when locale changes.

### Message catalogs

- Files: `src/messages/en.json`, `src/messages/zh.json`
- Nested keys by module, e.g.:
  - `common.*` — shared actions (save, cancel, delete, loading…)
  - `nav.*` — sidebar / header navigation
  - `auth.*` — login / register
  - `dashboard.*`, `songs.*`, `meetings.*`, `teams.*`, `leaderboard.*`, `data.*`, `settings.*`, `admin.*`, `share.*`
- Usage: `t('nav.dashboard')`, with optional simple `{name}` interpolation if needed.

### Dates

- Where `date-fns` is used with a locale, map `en` → `enUS`, `zh` → `zhCN`.

### Language switcher

- Shared component (e.g. `LanguageSwitcher`) showing `EN / 中文`.
- Instant UI update; no navigation required.
- Placed in:
  1. Header (right side, near user menu)
  2. Sidebar footer (near sign out)

## Pages / surfaces in scope

- Auth: login, register
- Shell: sidebar, header, share button
- Main: dashboard, songs (+ upload/detail/edit), meetings (+ new/detail), teams (+ detail/settings), leaderboard, data, settings, admin users
- Public: share page
- Client toasts / inline validation messages on those pages

## Out of scope (explicit)

- Translating API `error` strings returned from `/api/*`
- Translating user-generated or seed data (category names, lyrics, team names, etc.)
- SEO / `[locale]` routing / middleware locale detection

## Testing / acceptance

1. First visit with no Cookie shows English UI.
2. Switching to Chinese via header or sidebar updates current page and nav immediately.
3. Refresh keeps the selected language.
4. Login and register pages include a compact language switcher and honor the same Cookie default (`en`).
5. Primary app pages have no remaining hard-coded Chinese UI labels (data content may still be Chinese).
6. API error messages may remain Chinese/as-is.

## Implementation notes

- Replace string literals with `t()` keys; avoid dual-branching `locale === 'zh' ? ... : ...` for copy.
- Keep key names stable and English-based (`nav.songs`, not Chinese key names).
- Auth pages have no header/sidebar; add a compact language switcher on login and register.
