import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('songs grid card markup', () => {
  it('keeps interactive tag badges outside the song detail link', () => {
    const source = readFileSync('src/app/(main)/songs/page.tsx', 'utf8')
    const gridCardStart = source.indexOf('{songs.map((song, index) => (')
    const cardContentEnd = source.indexOf('</CardContent>', gridCardStart)
    const gridCardSource = source.slice(gridCardStart, cardContentEnd)
    const linkStart = gridCardSource.indexOf('<Link href={`/songs/${song.id}`}')
    const linkEnd = gridCardSource.indexOf('</Link>', linkStart)
    const linkSource = gridCardSource.slice(linkStart, linkEnd)

    expect(gridCardStart).toBeGreaterThan(-1)
    expect(linkStart).toBeGreaterThan(-1)
    expect(linkEnd).toBeGreaterThan(-1)
    expect(linkSource).not.toContain('<SongTagBadges')
  })
})
