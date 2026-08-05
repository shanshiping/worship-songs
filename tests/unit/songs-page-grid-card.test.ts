import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('songs grid card markup', () => {
  it('navigates from the row and keeps tag badges outside the title block', () => {
    const source = readFileSync('src/app/(main)/songs/page.tsx', 'utf8')
    const gridBlockStart = source.indexOf(') : viewMode === \'grid\' ? (')
    const gridBlockEnd = source.indexOf(') : (', gridBlockStart)
    const gridSource = source.slice(gridBlockStart, gridBlockEnd)

    expect(gridBlockStart).toBeGreaterThan(-1)
    expect(gridSource).toContain('onClick={() => router.push(`/songs/${song.id}`)}')
    expect(gridSource).not.toContain('<Link href={`/songs/${song.id}`}')

    const titleBlockStart = gridSource.indexOf('<h3 className="line-clamp-1 text-sm font-medium')
    const titleBlockEnd = gridSource.indexOf('</h3>', titleBlockStart)
    const titleBlockSource = gridSource.slice(titleBlockStart, titleBlockEnd)

    expect(titleBlockStart).toBeGreaterThan(-1)
    expect(titleBlockSource).not.toContain('<SongTagBadges')
    expect(gridSource).toContain('<SongTagBadges')
  })
})
