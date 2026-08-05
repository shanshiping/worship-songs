import PptxGenJS from 'pptxgenjs'
import {
  buildTitleCredits,
  parseLyricsSections,
  resolveLyricsText,
  splitLyricsParagraphs,
  type LyricsSection,
} from '@/lib/lyrics-sections'
import { loadSongBackgroundImageForSong } from '@/lib/ppt-song-background'

const SLIDE_W = 13.33
const SLIDE_H = 7.5

/** Text on photo backgrounds — default white for projection. */
const COLORS = {
  titleBg: '3D5240',
  lyricsBg: '455548',
  titleText: 'FFFFFF',
  lyricsText: 'FFFFFF',
  mutedText: 'F2F2F2',
  accent: 'FFFFFF',
  /** Dark overlay keeps background rich; light overlays wash photos out. */
  imageOverlay: '000000',
} as const

/** Higher = more image shows through (pptxgenjs: 0 opaque … 100 fully transparent). */
const TITLE_IMAGE_OVERLAY_TRANSPARENCY = 72
const LYRICS_IMAGE_OVERLAY_TRANSPARENCY = 80

const FONT_FACE = 'Microsoft YaHei'
const TITLE_FONT_SIZE = 56
const ARTIST_FONT_SIZE = 28
const SECTION_LABEL_FONT_SIZE = 24
const LYRICS_FONT_SIZE = 44

export type PptSongInput = {
  title: string
  artist?: string | null
  lyricist?: string | null
  composer?: string | null
  coverImage?: string | null
  pptBackground?: string | null
  sheetMusic?: string | null
  lyrics?: string | null
  lyricsLrc?: string | null
}

function applyGradientBackground(
  slide: PptxGenJS.Slide,
  pptx: PptxGenJS,
  kind: 'title' | 'lyrics'
): void {
  const gradient =
    kind === 'title'
      ? {
          angle: 135,
          stops: [
            { position: 0, color: '3A4F3C' },
            { position: 48, color: '4A6350' },
            { position: 100, color: '2E4030' },
          ],
        }
      : {
          angle: 180,
          stops: [
            { position: 0, color: '4A6350' },
            { position: 100, color: '354839' },
          ],
        }

  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE_W,
    h: SLIDE_H,
    // pptxgenjs runtime supports gradient fills; package types are incomplete
    fill: {
      type: 'gradient',
      color: kind === 'title' ? COLORS.titleBg : COLORS.lyricsBg,
      gradient: 'linear',
      angle: gradient.angle,
      stops: gradient.stops,
    } as unknown as PptxGenJS.ShapeFillProps,
    line: { type: 'none' },
  })
}

function applySlideBackground(
  slide: PptxGenJS.Slide,
  pptx: PptxGenJS,
  backgroundData: string | null,
  overlayTransparency: number,
  kind: 'title' | 'lyrics'
): void {
  if (backgroundData) {
    slide.addImage({
      data: backgroundData,
      x: 0,
      y: 0,
      w: SLIDE_W,
      h: SLIDE_H,
    })
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: SLIDE_W,
      h: SLIDE_H,
      fill: { color: COLORS.imageOverlay, transparency: overlayTransparency },
      line: { type: 'none' },
    })
    return
  }

  applyGradientBackground(slide, pptx, kind)
}

function addSlideAccentBar(slide: PptxGenJS.Slide, pptx: PptxGenJS): void {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE_W,
    h: 0.06,
    fill: { color: 'FFFFFF', transparency: 55 },
    line: { type: 'none' },
  })
}

function lyricsFontSize(lineCount: number): number {
  if (lineCount <= 4) return LYRICS_FONT_SIZE
  if (lineCount <= 6) return 36
  if (lineCount <= 8) return 30
  return 26
}

const FOOTER_FONT_SIZE = 14
/** Bottom margin reserved for centered song name + page number (no overlay band). */
const FOOTER_RESERVED = 0.72
const FOOTER_TEXT_Y = SLIDE_H - 0.52
const FOOTER_TEXT_H = 0.35
const CONTENT_BOTTOM = SLIDE_H - FOOTER_RESERVED

function createPageCounter(start = 0) {
  let current = start
  return () => {
    current += 1
    return current
  }
}

function addSlideChrome(
  slide: PptxGenJS.Slide,
  _pptx: PptxGenJS,
  songTitle: string,
  pageNumber: number
): void {
  slide.addText(songTitle, {
    x: 0,
    y: FOOTER_TEXT_Y,
    w: SLIDE_W,
    h: FOOTER_TEXT_H,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_FACE,
    fontSize: FOOTER_FONT_SIZE,
    color: COLORS.mutedText,
  })

  slide.addText(String(pageNumber), {
    x: SLIDE_W - 1.2,
    y: FOOTER_TEXT_Y,
    w: 0.7,
    h: FOOTER_TEXT_H,
    align: 'right',
    valign: 'middle',
    fontFace: FONT_FACE,
    fontSize: FOOTER_FONT_SIZE,
    color: COLORS.mutedText,
  })
}

function titleSlideLayout(creditCount: number): {
  titleY: number
  titleSize: number
  creditSize: number
  creditBlockHeight: number
} {
  if (creditCount <= 3) {
    return {
      titleY: 1.85,
      titleSize: TITLE_FONT_SIZE,
      creditSize: ARTIST_FONT_SIZE,
      creditBlockHeight: 0.42 * creditCount + 0.35,
    }
  }
  if (creditCount <= 6) {
    return {
      titleY: 1.35,
      titleSize: 48,
      creditSize: 24,
      creditBlockHeight: 0.36 * creditCount + 0.25,
    }
  }
  return {
    titleY: 1.1,
    titleSize: 42,
    creditSize: 20,
    creditBlockHeight: Math.min(3.6, 0.32 * creditCount + 0.2),
  }
}

function addTitleSlide(
  pptx: PptxGenJS,
  song: PptSongInput,
  credits: string[],
  backgroundData: string | null,
  nextPage: () => number
): void {
  const slide = pptx.addSlide()
  applySlideBackground(
    slide,
    pptx,
    backgroundData,
    TITLE_IMAGE_OVERLAY_TRANSPARENCY,
    'title'
  )
  addSlideAccentBar(slide, pptx)

  const layout = titleSlideLayout(credits.length)
  const titleRuns: PptxGenJS.TextProps[] = [
    {
      text: song.title,
      options: {
        fontFace: FONT_FACE,
        fontSize: layout.titleSize,
        bold: true,
        color: COLORS.titleText,
        breakLine: true,
      },
    },
  ]

  if (credits.length > 0) {
    titleRuns.push({
      text: credits.join('\n'),
      options: {
        fontFace: FONT_FACE,
        fontSize: layout.creditSize,
        color: COLORS.mutedText,
        breakLine: true,
      },
    })
  }

  slide.addText(titleRuns, {
    x: 0.5,
    y: 1.1,
    w: 12.33,
    h: CONTENT_BOTTOM - 1.1,
    align: 'center',
    valign: 'middle',
    lineSpacingMultiple: 1.25,
  })

  addSlideChrome(slide, pptx, song.title, nextPage())
}

function addLyricsSlide(
  pptx: PptxGenJS,
  songTitle: string,
  lines: string[],
  label: string | null,
  showLabel: boolean,
  backgroundData: string | null,
  nextPage: () => number
): void {
  const slide = pptx.addSlide()
  applySlideBackground(
    slide,
    pptx,
    backgroundData,
    LYRICS_IMAGE_OVERLAY_TRANSPARENCY,
    'lyrics'
  )
  addSlideAccentBar(slide, pptx)

  let lyricsY = 1.1

  if (label && showLabel) {
    slide.addText(label, {
      x: 0.5,
      y: 0.55,
      w: 12.33,
      h: 0.5,
      align: 'center',
      valign: 'middle',
      fontFace: FONT_FACE,
      fontSize: SECTION_LABEL_FONT_SIZE,
      color: COLORS.accent,
      bold: true,
    })
    lyricsY = 1.2
  }

  slide.addText(lines.join('\n'), {
    x: 0.5,
    y: lyricsY,
    w: 12.33,
    h: CONTENT_BOTTOM - lyricsY,
    align: 'center',
    valign: 'top',
    fontFace: FONT_FACE,
    fontSize: lyricsFontSize(lines.length),
    bold: true,
    color: COLORS.lyricsText,
    lineSpacingMultiple: 1.4,
  })

  addSlideChrome(slide, pptx, songTitle, nextPage())
}

function addSectionSlide(
  pptx: PptxGenJS,
  songTitle: string,
  section: LyricsSection,
  backgroundData: string | null,
  nextPage: () => number
): void {
  addLyricsSlide(
    pptx,
    songTitle,
    section.lines,
    section.label,
    Boolean(section.label),
    backgroundData,
    nextPage
  )
}

async function addSongSlides(
  pptx: PptxGenJS,
  song: PptSongInput,
  nextPage: () => number
): Promise<boolean> {
  const lyricsText = resolveLyricsText(song.lyrics, song.lyricsLrc)
  if (!lyricsText) return false

  const backgroundData = await loadSongBackgroundImageForSong(song)

  const meta = {
    title: song.title,
    artist: song.artist,
    lyricist: song.lyricist,
    composer: song.composer,
  }
  const { credits, body: bodyLyrics } = buildTitleCredits(lyricsText, meta)

  addTitleSlide(pptx, song, credits, backgroundData, nextPage)

  if (!bodyLyrics) return true

  const sections = parseLyricsSections(bodyLyrics).filter(
    (section) => section.lines.length > 0
  )
  if (sections.length === 0) {
    splitLyricsParagraphs(bodyLyrics).forEach((paragraph) =>
      addLyricsSlide(pptx, song.title, paragraph, null, false, backgroundData, nextPage)
    )
  } else {
    sections.forEach((section) =>
      addSectionSlide(pptx, song.title, section, backgroundData, nextPage)
    )
  }

  return true
}

export async function buildLyricsPpt(songs: PptSongInput[]): Promise<Buffer> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.theme = { headFontFace: FONT_FACE, bodyFontFace: FONT_FACE }
  pptx.title = songs.map((song) => song.title).join(' / ')

  const nextPage = createPageCounter()

  for (const song of songs) {
    await addSongSlides(pptx, song, nextPage)
  }

  const output = await pptx.write({ outputType: 'nodebuffer' })
  return Buffer.from(output as ArrayBuffer)
}

/** Returns song titles that were skipped due to missing lyrics. */
export function findSongsWithoutLyrics(songs: PptSongInput[]): string[] {
  return songs
    .filter((song) => !resolveLyricsText(song.lyrics, song.lyricsLrc))
    .map((song) => song.title)
}

export function filterSongsWithLyrics(songs: PptSongInput[]): PptSongInput[] {
  return songs.filter((song) => resolveLyricsText(song.lyrics, song.lyricsLrc))
}
