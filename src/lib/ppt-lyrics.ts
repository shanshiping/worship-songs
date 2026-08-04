import PptxGenJS from 'pptxgenjs'
import {
  chunkLines,
  extractArtistFromLyrics,
  parseLyricsSections,
  resolveLyricsText,
  stripLeadingLyricsMetadata,
  type LyricsSection,
} from '@/lib/lyrics-sections'
import { loadSongBackgroundImageForSong } from '@/lib/ppt-song-background'

const LINES_PER_SLIDE = 4
const SLIDE_W = 13.33
const SLIDE_H = 7.5
/** Title slide: deeper background for song name + artist. */
const TITLE_SLIDE_BG = '0A0A16'
/** Lyrics slides: lighter background so title pages stand out. */
const LYRICS_SLIDE_BG = '25253D'
/** Dark overlay on top of background image; lower = darker title page. */
const TITLE_IMAGE_OVERLAY_TRANSPARENCY = 28
/** Higher transparency lets more of the image show through on lyric slides. */
const LYRICS_IMAGE_OVERLAY_TRANSPARENCY = 58
const TEXT_COLOR = 'FFFFFF'
const LABEL_COLOR = 'A0A0B8'
const FONT_FACE = 'Microsoft YaHei'
const TITLE_FONT_SIZE = 56
const ARTIST_FONT_SIZE = 32
const SECTION_LABEL_FONT_SIZE = 26
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

function applySlideBackground(
  slide: PptxGenJS.Slide,
  pptx: PptxGenJS,
  backgroundData: string | null,
  overlayTransparency: number,
  fallbackColor: string
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
      fill: { color: '000000', transparency: overlayTransparency },
      line: { type: 'none' },
    })
    return
  }

  slide.background = { color: fallbackColor }
}

function displayArtist(song: PptSongInput, lyricsText: string): string {
  return (
    song.artist?.trim() ||
    song.lyricist?.trim() ||
    extractArtistFromLyrics(lyricsText) ||
    ''
  )
}

function addTitleSlide(
  pptx: PptxGenJS,
  song: PptSongInput,
  lyricsText: string,
  backgroundData: string | null
): void {
  const slide = pptx.addSlide()
  applySlideBackground(
    slide,
    pptx,
    backgroundData,
    TITLE_IMAGE_OVERLAY_TRANSPARENCY,
    TITLE_SLIDE_BG
  )

  slide.addText(song.title, {
    x: 0.5,
    y: 2.4,
    w: 12.33,
    h: 1.2,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_FACE,
    fontSize: TITLE_FONT_SIZE,
    bold: true,
    color: TEXT_COLOR,
  })

  const artist = displayArtist(song, lyricsText)
  if (artist) {
    slide.addText(artist, {
      x: 0.5,
      y: 3.8,
      w: 12.33,
      h: 0.8,
      align: 'center',
      valign: 'middle',
      fontFace: FONT_FACE,
      fontSize: ARTIST_FONT_SIZE,
      color: LABEL_COLOR,
    })
  }
}

function addLyricsSlide(
  pptx: PptxGenJS,
  lines: string[],
  label: string | null,
  showLabel: boolean,
  backgroundData: string | null
): void {
  const slide = pptx.addSlide()
  applySlideBackground(
    slide,
    pptx,
    backgroundData,
    LYRICS_IMAGE_OVERLAY_TRANSPARENCY,
    LYRICS_SLIDE_BG
  )

  let lyricsY = 1.8

  if (label && showLabel) {
    slide.addText(label, {
      x: 0.5,
      y: 0.8,
      w: 12.33,
      h: 0.6,
      align: 'center',
      valign: 'middle',
      fontFace: FONT_FACE,
      fontSize: SECTION_LABEL_FONT_SIZE,
      color: LABEL_COLOR,
    })
    lyricsY = 1.9
  }

  slide.addText(lines.join('\n'), {
    x: 0.5,
    y: lyricsY,
    w: 12.33,
    h: 4.8,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_FACE,
    fontSize: LYRICS_FONT_SIZE,
    color: TEXT_COLOR,
    lineSpacingMultiple: 1.4,
  })
}

function addSectionSlides(
  pptx: PptxGenJS,
  section: LyricsSection,
  backgroundData: string | null
): void {
  const chunks = chunkLines(section.lines, LINES_PER_SLIDE)
  chunks.forEach((chunk, index) => {
    addLyricsSlide(pptx, chunk, section.label, index === 0, backgroundData)
  })
}

async function addSongSlides(pptx: PptxGenJS, song: PptSongInput): Promise<boolean> {
  const lyricsText = resolveLyricsText(song.lyrics, song.lyricsLrc)
  if (!lyricsText) return false

  const backgroundData = await loadSongBackgroundImageForSong(song)

  addTitleSlide(pptx, song, lyricsText, backgroundData)

  const bodyLyrics = stripLeadingLyricsMetadata(lyricsText, {
    title: song.title,
    artist: song.artist,
    lyricist: song.lyricist,
    composer: song.composer,
  })
  if (!bodyLyrics) return true

  const sections = parseLyricsSections(bodyLyrics).filter(
    (section) => section.lines.length > 0
  )
  if (sections.length === 0) {
    chunkLines(
      bodyLyrics
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
      LINES_PER_SLIDE
    ).forEach((chunk) => addLyricsSlide(pptx, chunk, null, false, backgroundData))
  } else {
    sections.forEach((section) => addSectionSlides(pptx, section, backgroundData))
  }

  return true
}

export async function buildLyricsPpt(songs: PptSongInput[]): Promise<Buffer> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.theme = { headFontFace: FONT_FACE, bodyFontFace: FONT_FACE }
  pptx.title = songs.map((song) => song.title).join(' / ')

  for (const song of songs) {
    await addSongSlides(pptx, song)
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
