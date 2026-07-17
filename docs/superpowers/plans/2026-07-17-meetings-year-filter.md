# Meetings Year Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add year selection to the Meetings list filter while keeping the existing month filter.

**Architecture:** Extend `GET /api/meetings` with a `year` query param and a `years` response field (mirroring leaderboard). Add a year `<select>` to the meetings page; year and month filters are mutually exclusive.

**Tech Stack:** Next.js App Router, Prisma, React client components, i18n JSON catalogs

## Global Constraints

- Filter precedence: `month` > `year` > none
- `years` derived from all meetings, descending, not affected by current filter
- Changing year or month resets page to 1
- Selecting year clears month; selecting month clears year
- Reuse leaderboard native `<select>` styling

---

### Task 1: Extend Meetings API

**Files:**
- Modify: `src/app/api/meetings/route.ts`

- [ ] Parse `year` param; validate with `/^\d{4}$/`
- [ ] Apply month filter if `month` set, else year filter if `year` set
- [ ] Fetch distinct years from all meetings in parallel
- [ ] Return `years` array in response

### Task 2: Add i18n keys

**Files:**
- Modify: `src/messages/zh.json`
- Modify: `src/messages/en.json`

- [ ] Add `meetings.allYears`, `meetings.yearOption`, `meetings.selectYear`

### Task 3: Update Meetings page UI

**Files:**
- Modify: `src/app/(main)/meetings/page.tsx`

- [ ] Add `year` and `years` state
- [ ] Add year `<select>` before month input
- [ ] Wire fetch with `year` or `month` param
- [ ] Mutual clearing on change; clear-filters resets both
