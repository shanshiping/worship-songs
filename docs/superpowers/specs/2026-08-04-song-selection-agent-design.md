# Song Selection Agent Design

**Date:** 2026-08-04  
**Status:** Approved

## Summary

Floating chat assistant on authenticated main pages. Users ask in natural language for song recommendations (occasion/mood via tags), fuzzy lyric search, and can add picks to playlists via conversation. Chat history stays in `localStorage`. Melody search and embeddings are out of scope for v1.

## Decisions

| Decision | Choice |
|----------|--------|
| Scope | Chat recommendations + lyric search; no melody / embeddings |
| Architecture | Tool-calling agent (Vercel AI SDK) over Prisma helpers |
| AI provider | Env-driven OpenAI-compatible (`AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, optional `AI_BASE_URL`) |
| Free test default | Groq: `AI_BASE_URL=https://api.groq.com/openai/v1`, model `llama-3.3-70b-versatile` |
| UI | Floating chat FAB on all `(main)` pages |
| Playlist actions | Agent tools; ACL via `assertCanModifyPlaylist` + `PLAYLIST_EDIT` |
| History | `localStorage` key `song-agent-chat:{userId}` |
| Lyric search | Dedicated `lyricsSearch` on `GET /api/songs`; agent `searchSongs` queries title/artist/lyrics |

## Architecture

1. **`SongAgentChat`** — client widget mounted in `MainLayout`; streams from `POST /api/agent/chat`.
2. **`POST /api/agent/chat`** — requires session; `streamText` + tools; 503 if `AI_API_KEY` missing; truncate ~20 turns.
3. **Tools** (server Prisma): `searchSongs`, `listTags`, `getPopularSongs`, `listMyPlaylists`, `addSongToPlaylist`.
4. Recommend only songs returned by tools; never invent catalog entries.

## Tools

| Tool | Behavior |
|------|----------|
| `searchSongs` | Match title/artist/lyrics (`contains`, insensitive); optional tag names (AND); limit ≤10 |
| `listTags` | TYPE / STYLE tags |
| `getPopularSongs` | Leaderboard-style `MeetingSong.groupBy` |
| `listMyPlaylists` | Playlists the current user can modify |
| `addSongToPlaylist` | By id or title + `songId`; report duplicate / permission errors as tool results |

## Auth

- All logged-in roles: chat + search.
- Add to playlist: existing LEADER+ / owner-or-admin ACL; MEMBER gets a clear denial in chat.

## Out of scope (v1)

Melody / audio fingerprint, pgvector embeddings, server-persisted chat history, dedicated Agent nav page.

## Testing

- `tests/api/agent-chat.test.ts`: 401 / 503 / happy-path with mocked AI + Prisma
- Lyric search covered by `tests/api/songs.test.ts`
