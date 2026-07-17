# UI Brand & Shell Refresh Design

**Date:** 2026-07-17  
**Status:** Approved  
**Approach:** Phased — tokens + shell first, then page polish  
**Includes:** Official logo asset at `public/brand/logo.png` wired into sidebar, login, and mobile header

## Summary

Align the worship-songs UI with the official brand logo (Ichthys + rainbow arcs + cross): warm earth palette, light sidebar, logo as brand mark on sidebar and login. Phase 1 hardens design tokens, layout shell, mobile navigation, accessibility, and a light sweep of high-traffic pages to remove rainbow gradients / purple hardcodes. Phase 2 (separate) is deeper page-by-page polish. No information-architecture redesign and no dark-mode polish in this cycle.

## Decisions

| Decision | Choice |
|----------|--------|
| Scope strategy | Phased: tokens + shell first, then pages |
| Visual direction | Derived from official logo (warm earth, not purple SaaS default) |
| Logo usage | Brand mark in sidebar + login only (not as nav icons) |
| Sidebar | Light (white / near-white) so logo shows in original colors |
| Mobile nav | Header menu + Sheet drawer (not a crowded bottom tab bar) |
| Header search | Hide until a real global search exists |
| Header notifications | Remove decorative bell / fake unread badge |
| Typography | Keep existing Geist / system sans; no new display font this phase |
| Dark mode | Keep `.dark` tokens compiling; not a delivery focus |

## Brand assets

| Asset | Path |
|-------|------|
| Primary logo (PNG) | `public/brand/logo.png` |

Usage:
- Sidebar brand row: full logo + product name text beside or under as space allows; preserve aspect ratio, do not crop into a square tile that clips the fish.
- Login: logo above the form as the hero brand signal.
- Mobile header: smaller logo mark (same file, constrained height ~28–32px).
- Alt text: product brand name from i18n (`t('brand.name')`).

## Color tokens (Phase 1)

Replace the current violet/purple `:root` theme in `src/app/globals.css` with logo-derived semantic tokens (exact oklch values chosen at implement time to meet WCAG AA):

| Role | Approx hex (from logo) | Usage |
|------|------------------------|--------|
| Primary | `#C1272D` (warm red) | Primary buttons, active nav accent, links |
| Accent / highlight | `#D9C152` (ochre gold) | Sparse highlights (e.g. leaderboard accents) |
| Success | `#A7C06B` (olive green) | Success feedback only |
| Foreground / ink | `#5D452B` (brown olive) | Body text, default icons |
| Background | `#FAFAF8` (warm near-white) | App canvas |
| Card | `#FFFFFF` | Cards, popovers |
| Muted / border | Warm light gray | Surfaces, dividers, inputs |
| Destructive | Distinct clear red | Destructive actions (may share hue family with primary but stay semantically separate) |

Rules:
- Components and pages must use semantic tokens (`bg-primary`, `text-muted-foreground`, etc.), not ad-hoc `violet-*` / rainbow gradients.
- Gold and green are accents, not full-page themes.
- Sidebar tokens: light background, dark brown foreground, soft warm border; active item = light primary-tint background + primary left indicator.

## Shell architecture

### Desktop (`md+`)

- Fixed light sidebar (~256px) with logo brand block, role badge (plain text, no Sparkles), nav links, language switcher, sign out.
- Nav icons: single Lucide outline style; active state via background + indicator, not per-item rainbow icon tiles.
- Main column: sticky header + `main#main-content` with existing padding rhythm.
- Header: user menu + language switcher; no fake notification bell; no non-functional global search.

### Mobile (`< md`)

- Sidebar hidden.
- Header: logo + menu button (opens Sheet) + user controls.
- Sheet contains the same nav items as desktop sidebar.
- Touch targets ≥ 44×44px; Escape / close control / focus trap via existing Sheet primitives.
- Content padding must clear sticky header; no bottom-nav bar in Phase 1.

### Accessibility (Phase 1)

- Skip link to `#main-content`.
- `aria-current="page"` on active nav items.
- `aria-label` on icon-only controls (menu, etc.).
- Visible focus rings (do not strip outlines without replacement).
- `prefers-reduced-motion`: shorten or disable entrance / hover motion.

## Component & page guidelines

### Components

- Stat cards / quick actions: warm muted icon wells + ink-colored Lucide icons (no rainbow gradient tiles).
- Primary button: primary fill + on-primary text; secondary: outline or muted fill.
- Cards: white, subtle warm border, light shadow; hover 150–200ms translate/shadow only.
- Forms: visible labels; errors near fields; disable submit while loading.

### Phase 1 file touch list (required)

- `src/app/globals.css` — token rewrite + reduced-motion
- `src/components/layout/sidebar.tsx` — light shell, logo, simplify active styles
- `src/components/layout/header.tsx` — semantic colors, remove fake bell/search, mobile menu trigger
- `src/components/layout/main-layout.tsx` — skip link, `main` id, wire mobile sheet if needed
- Login page — logo + token-aligned layout
- New or adjusted: mobile nav sheet (may live in header/sidebar/layout)

### Phase 1 light sweep (allowed)

- Dashboard, Songs, Meetings (and similar): strip obvious `from-violet-*` / rainbow icon gradients / decorative Sparkles so they do not clash with the new tokens.
- Do **not** redesign page layouts or add features.

### Explicitly out of scope

- Dark-mode visual QA / theme toggle product work
- Global search implementation
- Real notification system
- Bottom tab bar
- New marketing landing / full visual redesign of every page
- Playwright E2E unless separately requested

## Motion

- Micro-interactions: 150–300ms, ease-out for enter.
- Keep existing fade-in utilities where useful; gate with `prefers-reduced-motion`.
- No decorative infinite pulse for chrome; loading = skeleton or spinner.

## Testing & verification

- No API behavior changes expected; no new API tests required unless a shared lib changes.
- Manual checklist: desktop sidebar + logo, login logo, mobile sheet nav, skip link, focus visible, contrast smoke check on primary buttons/text, reduced-motion.
- Run `pnpm test` before claiming complete (regression safety).
- Spot-check 375 / 768 / 1024 widths.

## Success criteria

1. Brand logo appears correctly on sidebar and login without cropping.
2. App no longer reads as default purple SaaS; primary UI uses warm-red / earth tokens.
3. Mobile users can reach all primary destinations via drawer.
4. Decorative fake affordances (bell, dead search) are gone.
5. Phase 1 pages do not still show rainbow gradient nav/stat icon wells.

## Phase 2 (later, separate plan)

Page-by-page polish (Dashboard density, Songs empty states, Meetings filters chrome, Leaderboard gold accent usage) under the same token system — only after Phase 1 ships.
