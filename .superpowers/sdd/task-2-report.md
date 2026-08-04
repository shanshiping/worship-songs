# Task 2 Report: Remove Song API

## Status

Complete.

## Implemented

- Added `DELETE /api/playlists/[id]/songs/[songId]` in `src/app/api/playlists/[id]/songs/[songId]/route.ts`.
- Reused `assertCanModifyPlaylist` and `playlistSongInclude` from `@/lib/playlist-access`.
- Enforced `PLAYLIST_EDIT` plus playlist owner or admin-level access through existing permission helpers.
- Removed the playlist-song row and compacted remaining `order` values to `1..n`.
- Returned the updated playlist after deletion.
- Returned `404` with `歌单不存在` when the playlist is missing.

## Tests

- Extended `tests/api/playlists-songs.test.ts` with DELETE coverage:
  - `MEMBER` receives `403`.
  - Missing playlist receives `404`.
  - Existing song removal deletes the join row and rewrites remaining order values.

## TDD Evidence

- Red run: `pnpm exec vitest run tests/api/playlists-songs.test.ts`
  - Failed because `@/app/api/playlists/[id]/songs/[songId]/route` did not exist.
- Green run: `pnpm exec vitest run tests/api/playlists-songs.test.ts`
  - Passed: `1` file, `8` tests.

## Verification

- `pnpm exec vitest run tests/api/playlists-songs.test.ts tests/api/playlists.test.ts`
  - Passed: `2` files, `17` tests.
- Lints checked for edited files: no linter errors found.

## Concerns

None.
