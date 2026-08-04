import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('songs grid card markup', () => {
  it('navigates from the card and keeps tag badges outside the title block', () => {
    const source = readFileSync('src/app/(main)/songs/page.tsx', 'utf8')
    const gridCardStart = source.indexOf('{songs.map((song, index) => (')
    const cardContentEnd = source.indexOf('</CardContent>', gridCardStart)
    const gridCardSource = source.slice(gridCardStart, cardContentEnd)

    expect(gridCardStart).toBeGreaterThan(-1)
    expect(gridCardSource).toContain('onClick={() => router.push(`/songs/${song.id}`)}')
    expect(gridCardSource).not.toContain('<Link href={`/songs/${song.id}`}')

    const titleBlockStart = gridCardSource.indexOf('<div className="block group mb-3">')
    const titleBlockEnd = gridCardSource.indexOf('</div>', titleBlockStart)
    const titleBlockSource = gridCardSource.slice(titleBlockStart, titleBlockEnd)

    expect(titleBlockStart).toBeGreaterThan(-1)
    expect(titleBlockSource).not.toContain('<SongTagBadges')
  })
})
