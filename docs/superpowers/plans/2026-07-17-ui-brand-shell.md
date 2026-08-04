# UI Brand & Shell Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-theme the app around the official logo (warm earth palette), ship a light sidebar + login with the real logo, fix mobile nav and a11y chrome, and lightly strip rainbow/purple decoration from high-traffic pages.

**Architecture:** Rewrite CSS semantic tokens in `globals.css`; add a shared `BrandLogo` image component pointing at `public/brand/logo.png`; refactor layout shell (sidebar / header / main-layout + mobile Sheet); update login brand block; sweep Dashboard / Songs / Meetings for gradient/purple leftovers. No API changes.

**Tech Stack:** Next.js App Router, React 19, Tailwind v4 + shadcn tokens, Lucide icons, existing `Sheet` primitive, next/image optional (plain `<img>` is fine for static public asset).

**Spec:** `docs/superpowers/specs/2026-07-17-ui-brand-shell-design.md`

## Global Constraints

- Logo file: `public/brand/logo.png` (already present) — do not crop; preserve aspect ratio
- Primary ≈ `#C1272D`, gold ≈ `#D9C152`, green ≈ `#A7C06B`, ink ≈ `#5D452B`, bg ≈ `#FAFAF8`
- Light sidebar only for Phase 1 delivery focus
- Hide non-functional header search; remove fake notification bell
- Mobile nav = header menu + Sheet drawer (no bottom tab bar)
- Skip link → `#main-content`; `aria-current="page"` on active nav
- Respect `prefers-reduced-motion`
- Do not redesign page IA or add features
- Run `pnpm test` before claiming complete
- Commit only when the user asks (do not auto-commit unless requested)

---

## File map

| Path | Responsibility |
|------|----------------|
| `public/brand/logo.png` | Official brand asset (already copied) |
| `src/components/brand-logo.tsx` | Reusable logo image + alt from i18n |
| `src/app/globals.css` | Semantic color tokens, reduced-motion, warm utilities |
| `src/components/layout/sidebar.tsx` | Light shell, logo, unified nav icons |
| `src/components/layout/header.tsx` | Semantic chrome, menu trigger, no fake bell/search |
| `src/components/layout/mobile-nav.tsx` | Sheet drawer sharing nav items |
| `src/components/layout/main-layout.tsx` | Skip link + `main#main-content` |
| `src/lib/nav-items.ts` | Shared nav item definitions (desktop + mobile) |
| `src/messages/en.json` / `zh.json` | `nav.openMenu`, `nav.skipToContent`, etc. |
| `src/app/(auth)/login/page.tsx` | Logo hero brand |
| `src/app/(main)/dashboard/page.tsx` | Light visual sweep |
| `src/app/(main)/songs/page.tsx` | Light visual sweep |
| `src/app/(main)/meetings/page.tsx` | Light visual sweep |

---

### Task 1: BrandLogo component + i18n a11y strings

**Files:**
- Create: `src/components/brand-logo.tsx`
- Modify: `src/messages/en.json`
- Modify: `src/messages/zh.json`
- Verify: `public/brand/logo.png` exists

**Interfaces:**
- Produces: `BrandLogo({ className?, priority?: boolean })` — renders `/brand/logo.png` with `alt={t('brand.name')}`
- Produces i18n keys: `nav.openMenu`, `nav.closeMenu`, `nav.skipToContent`

- [ ] **Step 1: Confirm logo asset**

Run: `ls -la public/brand/logo.png`  
Expected: file present (~14KB)

- [ ] **Step 2: Add i18n keys**

In `en.json` under `nav`:

```json
"openMenu": "Open menu",
"closeMenu": "Close menu",
"skipToContent": "Skip to main content"
```

In `zh.json` under `nav`:

```json
"openMenu": "打开菜单",
"closeMenu": "关闭菜单",
"skipToContent": "跳到主要内容"
```

- [ ] **Step 3: Create BrandLogo**

```tsx
'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import { cn } from '@/lib/utils'

type BrandLogoProps = {
  className?: string
  priority?: boolean
}

export function BrandLogo({ className, priority }: BrandLogoProps) {
  const { t } = useI18n()
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo.png"
      alt={t('brand.name')}
      width={160}
      height={80}
      decoding="async"
      {...(priority ? { fetchPriority: 'high' as const } : {})}
      className={cn('h-10 w-auto object-contain object-left', className)}
    />
  )
}
```

- [ ] **Step 4: Smoke-check import**

Run: `pnpm exec tsc --noEmit` (or project’s typecheck script if different)  
Expected: no errors related to `brand-logo.tsx`

---

### Task 2: Rewrite design tokens in `globals.css`

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: light-mode CSS variables mapped to logo palette; sidebar light tokens; `@media (prefers-reduced-motion: reduce)` for `.animate-*` / `.card-hover`

- [ ] **Step 1: Replace `:root` color block**

Use oklch approximations of the brand hexes (tune for AA contrast on white):

```css
:root {
  /* Brand — warm earth from logo */
  --primary: oklch(0.52 0.18 25);              /* warm red ~#C1272D */
  --primary-foreground: oklch(0.99 0 0);

  --background: oklch(0.985 0.004 95);         /* warm near-white */
  --foreground: oklch(0.35 0.04 65);           /* brown olive ~#5D452B */

  --card: oklch(1 0 0);
  --card-foreground: oklch(0.35 0.04 65);

  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.35 0.04 65);

  --secondary: oklch(0.96 0.01 95);
  --secondary-foreground: oklch(0.35 0.04 65);

  --muted: oklch(0.96 0.008 95);
  --muted-foreground: oklch(0.5 0.03 65);

  --accent: oklch(0.88 0.08 95);               /* soft gold wash */
  --accent-foreground: oklch(0.35 0.04 65);

  --destructive: oklch(0.5 0.2 25);

  --border: oklch(0.9 0.01 95);
  --input: oklch(0.9 0.01 95);
  --ring: oklch(0.52 0.18 25);

  --chart-1: oklch(0.52 0.18 25);              /* red */
  --chart-2: oklch(0.78 0.12 95);              /* gold */
  --chart-3: oklch(0.72 0.1 125);             /* olive green */
  --chart-4: oklch(0.45 0.05 65);             /* brown */
  --chart-5: oklch(0.65 0.08 80);

  --radius: 0.75rem;

  /* Light sidebar */
  --sidebar: oklch(1 0 0);
  --sidebar-foreground: oklch(0.35 0.04 65);
  --sidebar-primary: oklch(0.52 0.18 25);
  --sidebar-primary-foreground: oklch(0.99 0 0);
  --sidebar-accent: oklch(0.96 0.02 25);       /* light primary tint */
  --sidebar-accent-foreground: oklch(0.35 0.04 65);
  --sidebar-border: oklch(0.9 0.01 95);
  --sidebar-ring: oklch(0.52 0.18 25);
}
```

Keep `.dark { ... }` compiling with desaturated warm variants (not delivery focus — just avoid broken contrast if class is toggled).

- [ ] **Step 2: Update decorative utilities to brand hues**

- `.gradient-bg` → warm near-white gradients (no purple)
- `.gradient-text` → primary → gold (subtle)
- `.input-focus:focus` ring uses primary
- `.skeleton` uses muted warm grays
- `::selection` uses primary wash

- [ ] **Step 3: Add reduced-motion**

```css
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  .animate-fade-in,
  .animate-slide-in-left,
  .animate-slide-in-right,
  .animate-scale-in,
  .animate-pulse-soft,
  .skeleton {
    animation: none !important;
  }
  .card-hover:hover {
    transform: none;
  }
}
```

- [ ] **Step 4: Visual check**

Run: `pnpm dev` and open `/login`  
Expected: buttons/links use warm red, not violet; background slightly warm white

---

### Task 3: Shared nav items + mobile Sheet

**Files:**
- Create: `src/lib/nav-items.ts`
- Create: `src/components/layout/mobile-nav.tsx`
- Modify: `src/components/layout/sidebar.tsx` (consume shared items; full restyle in Task 4)

**Interfaces:**
- Produces: `getNavItems(t, permissions) => Array<{ title, href, icon, show }>`
- Produces: `MobileNav({ open, onOpenChange })` Sheet with same links

- [ ] **Step 1: Extract nav items**

```ts
import {
  Music, LayoutDashboard, Calendar, Trophy, Settings, Users, MessageCircle, Database,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  show: boolean
}

type Translate = (key: string) => string
type Perms = {
  isLeaderOrAbove: boolean
  isSuperAdmin: boolean
}

export function getNavItems(t: Translate, permissions: Perms): NavItem[] {
  return [
    { title: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard, show: true },
    { title: t('nav.songs'), href: '/songs', icon: Music, show: true },
    { title: t('nav.meetings'), href: '/meetings', icon: Calendar, show: true },
    { title: t('nav.leaderboard'), href: '/leaderboard', icon: Trophy, show: true },
    { title: t('nav.teams'), href: '/teams', icon: MessageCircle, show: true },
    { title: t('nav.data'), href: '/data', icon: Database, show: permissions.isLeaderOrAbove },
    { title: t('nav.adminUsers'), href: '/admin/users', icon: Users, show: permissions.isSuperAdmin },
    { title: t('nav.settings'), href: '/settings', icon: Settings, show: true },
  ]
}
```

Do **not** include per-item `gradient` fields.

- [ ] **Step 2: Implement MobileNav**

Use existing `@/components/ui/sheet`. Left side sheet, logo at top, mapped links, close on navigate (`onOpenChange(false)` in `Link` onClick), language switcher + sign-out at bottom (mirror sidebar footer lightly).

Include `aria-label={t('nav.openMenu')}` only on the trigger (lives in Header). Sheet title visually hidden or `SheetHeader` with brand name.

- [ ] **Step 3: Typecheck**

Run: `pnpm exec tsc --noEmit`  
Expected: pass for new files

---

### Task 4: Light sidebar with logo

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

**Interfaces:**
- Consumes: `BrandLogo`, `getNavItems`
- Produces: light desktop sidebar with logo brand row

- [ ] **Step 1: Restyle sidebar**

Key behaviors:
- Container: `bg-sidebar border-r border-sidebar-border` (now light)
- Brand row: `<BrandLogo priority className="h-12" />` + optional `t('brand.name')` text if space
- Role badge: simple muted pill, **no** `Sparkles`
- Nav link active: `bg-sidebar-accent` + left `border-l-2 border-primary` (or inset bar), icon = `text-primary` / muted when inactive — **no** rainbow gradient wells
- `aria-current={isActive ? 'page' : undefined}`
- Footer: `LanguageSwitcher` + sign out (keep)

- [ ] **Step 2: Manual check desktop**

Open `/dashboard` at ≥768px  
Expected: white/light sidebar, full fish logo visible, warm-red active state, no purple gradients on icons

---

### Task 5: Header + MainLayout a11y shell

**Files:**
- Modify: `src/components/layout/header.tsx`
- Modify: `src/components/layout/main-layout.tsx`

**Interfaces:**
- Consumes: `BrandLogo`, `MobileNav`
- Produces: skip link; `main#main-content`; mobile menu; cleaned header

- [ ] **Step 1: Rewrite Header**

- Replace hardcoded `bg-white/80`, `gray-*` with `bg-background/80 backdrop-blur-md border-b border-border`
- Mobile left: `BrandLogo className="h-8 md:hidden"` (or show only when sidebar hidden)
- Add Menu button (`md:hidden`, `min-h-11 min-w-11`, `aria-label={t('nav.openMenu')}`) controlling `MobileNav` open state
- Remove Search input block entirely
- Remove Bell button + red unread dot
- Keep LanguageSwitcher + user dropdown; restyle icon wells with muted/primary tokens (not `bg-blue-50` / `bg-purple-50`)

- [ ] **Step 2: Rewrite MainLayout**

```tsx
export function MainLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n() // or pass skip text via child — Header already client; MainLayout can be client
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:m-4 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        {t('nav.skipToContent')}
      </a>
      <Sidebar />
      <div className="md:pl-64 flex flex-col flex-1 min-h-screen">
        <Header />
        <main id="main-content" className="flex-1 p-4 md:p-6 lg:p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
```

If `MainLayout` is not already a client component and cannot use `useI18n`, either make it `'use client'` (already is) or hardcode both languages — prefer `useI18n`.

- [ ] **Step 3: Manual mobile check**

Resize to 375px  
Expected: hamburger opens Sheet with all nav links; logo in header; no dead search/bell

---

### Task 6: Login page — official logo

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: `BrandLogo`

- [ ] **Step 1: Replace Music icon tile with logo**

Replace:

```tsx
<div className="inline-flex ... gradient ...">
  <Music className="..." />
</div>
```

With:

```tsx
<div className="flex justify-center mb-4">
  <BrandLogo priority className="h-20 w-auto" />
</div>
```

- [ ] **Step 2: Remove purple wash**

- Delete `bg-purple-500/10` orb
- Replace tab `bg-gray-100` / `text-gray-900` with `bg-muted` / `text-foreground` / `text-muted-foreground`
- Keep title/subtitle; prefer `text-foreground` over `gradient-text` for the H1 (or keep subtle brand gradient-text — either OK if tokens updated)

- [ ] **Step 3: Visual check**

Open `/login`  
Expected: full logo above form, warm primary buttons, no purple blob

---

### Task 7: Light page sweep (Dashboard, Songs, Meetings)

**Files:**
- Modify: `src/app/(main)/dashboard/page.tsx`
- Modify: `src/app/(main)/songs/page.tsx`
- Modify: `src/app/(main)/meetings/page.tsx`

**Interfaces:**
- No new APIs — className / decorative cleanup only

- [ ] **Step 1: Dashboard**

- Remove `Sparkles` welcome decoration (or replace with nothing)
- Stat cards: replace rainbow `gradient` / `bg-violet-50` etc. with `bg-muted` + `text-foreground` icons
- Remove fake `12%` / `ArrowUpRight` trend chip if it is decorative dummy data (preferred: remove)
- Quick action tiles: same muted icon wells; no `from-pink-500` gradients
- Rank badges may use gold/muted neutrals via tokens, not multi-color gradients

- [ ] **Step 2: Songs + Meetings**

- Strip obvious `from-violet-*`, rainbow icon wells, decorative `Sparkles`
- Keep layout, filters, and behavior unchanged

- [ ] **Step 3: Grep gate**

Run:

```bash
rg -n "from-violet|Sparkles|bg-purple|from-pink-500|from-emerald-500 to-teal" \
  src/components/layout src/app/\(auth\)/login \
  src/app/\(main\)/dashboard src/app/\(main\)/songs/page.tsx \
  src/app/\(main\)/meetings/page.tsx
```

Expected: no matches in those Phase 1 paths (other pages may still have leftovers until Phase 2)

---

### Task 8: Verification

**Files:** none (verify only)

- [ ] **Step 1: Unit/API regression**

Run: `pnpm test`  
Expected: all existing tests pass (no API changes)

- [ ] **Step 2: Manual checklist**

- [ ] Desktop sidebar shows full logo + light shell
- [ ] Login shows full logo
- [ ] Mobile Sheet navigates to Songs / Meetings
- [ ] Skip link focuses/jumps to `#main-content`
- [ ] No fake bell or dead search
- [ ] Primary buttons readable (warm red on white)
- [ ] `prefers-reduced-motion`: entrance animations disabled
- [ ] Spot-check 375 / 768 / 1024

- [ ] **Step 3: Stop — ask user before commit**

Do not commit unless the user explicitly asks.

---

## Spec coverage check

| Spec requirement | Task |
|------------------|------|
| Logo in sidebar / login / mobile header | 1, 4, 5, 6 |
| Warm earth tokens replace purple | 2 |
| Light sidebar | 4 |
| Hide search; remove fake bell | 5 |
| Mobile Sheet nav | 3, 5 |
| Skip link + a11y | 1, 5 |
| Reduced motion | 2 |
| Light sweep Dashboard/Songs/Meetings | 7 |
| `pnpm test` | 8 |
| Phase 2 deeper polish | Out of scope (deferred) |
