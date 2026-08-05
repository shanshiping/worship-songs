import { vi } from 'vitest'

type MockFn = ReturnType<typeof vi.fn>

function model() {
  return {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  }
}

export type PrismaMock = {
  song: ReturnType<typeof model>
  meeting: ReturnType<typeof model>
  category: ReturnType<typeof model>
  tag: ReturnType<typeof model>
  songTag: ReturnType<typeof model>
  songScripture: ReturnType<typeof model>
  playlist: ReturnType<typeof model>
  playlistSong: ReturnType<typeof model>
  meetingSong: ReturnType<typeof model>
  user: ReturnType<typeof model>
  team: ReturnType<typeof model>
  teamMember: ReturnType<typeof model>
  message: ReturnType<typeof model>
  teamSong: ReturnType<typeof model>
  $disconnect: MockFn
  $queryRaw: MockFn
  $transaction: MockFn
}

/** Shared singleton used by `vi.mock('@/lib/prisma')` factories and assertions. */
export const mockPrisma: PrismaMock = {
  song: model(),
  meeting: model(),
  category: model(),
  tag: model(),
  songTag: model(),
  songScripture: model(),
  playlist: model(),
  playlistSong: model(),
  meetingSong: model(),
  user: model(),
  team: model(),
  teamMember: model(),
  message: model(),
  teamSong: model(),
  $disconnect: vi.fn(),
  $queryRaw: vi.fn(),
  $transaction: vi.fn(async (ops: unknown) => {
    if (typeof ops === 'function') {
      return ops(mockPrisma)
    }
    if (Array.isArray(ops)) {
      return Promise.all(ops)
    }
    return ops
  }),
}

export function resetPrismaMock(): void {
  for (const value of Object.values(mockPrisma)) {
    if (typeof value === 'function') {
      value.mockReset()
      continue
    }
    for (const fn of Object.values(value)) {
      fn.mockReset()
    }
  }
}
