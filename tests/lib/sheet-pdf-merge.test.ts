import { PDFDocument, StandardFonts } from 'pdf-lib'
import { describe, expect, it, vi } from 'vitest'
import {
  filterSongsWithSheet,
  findSongsWithoutSheet,
  mergeSheetMusicPdf,
} from '@/lib/sheet-pdf-merge'

vi.mock('sharp', () => ({
  default: vi.fn((bytes: Buffer) => ({
    png: () => ({
      toBuffer: async () => bytes,
    }),
  })),
}))

async function createPdfBuffer(text: string): Promise<Buffer> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  page.drawText(text, { x: 50, y: 700, size: 12, font })
  return Buffer.from(await pdf.save())
}

describe('sheet-pdf-merge helpers', () => {
  it('finds songs without sheet music', () => {
    expect(
      findSongsWithoutSheet([
        { title: 'A', sheetMusic: '/uploads/sheets/a.pdf' },
        { title: 'B', sheetMusic: null },
      ]),
    ).toEqual(['B'])
  })

  it('filters songs with sheet music', () => {
    const songs = filterSongsWithSheet([
      { id: '1', title: 'A', sheetMusic: ' /uploads/sheets/a.pdf ' },
      { id: '2', title: 'B', sheetMusic: null },
    ])
    expect(songs).toHaveLength(1)
    expect(songs[0]?.id).toBe('1')
  })
})

describe('mergeSheetMusicPdf', () => {
  it('throws when inputs are empty', async () => {
    await expect(mergeSheetMusicPdf([])).rejects.toThrow('没有可合并的歌谱')
  })

  it('merges two single-page PDFs', async () => {
    const first = await createPdfBuffer('Page 1')
    const second = await createPdfBuffer('Page 2')

    const mergedBytes = await mergeSheetMusicPdf([
      {
        title: 'Song 1',
        sheetPath: '/uploads/sheets/1.pdf',
        bytes: first,
        mimeType: 'application/pdf',
      },
      {
        title: 'Song 2',
        sheetPath: '/uploads/sheets/2.pdf',
        bytes: second,
        mimeType: 'application/pdf',
      },
    ])

    const merged = await PDFDocument.load(mergedBytes)
    expect(merged.getPageCount()).toBe(2)
  })

  it('embeds mislabeled jpeg bytes via sharp normalization', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )

    const mergedBytes = await mergeSheetMusicPdf([
      {
        title: 'Mislabeled JPG',
        sheetPath: '/uploads/sheets/x.jpg',
        bytes: png,
        mimeType: 'image/jpeg',
      },
    ])

    const merged = await PDFDocument.load(mergedBytes)
    expect(merged.getPageCount()).toBe(1)
  })

  it('merges pdf and image inputs into one pdf', async () => {
    const pdfBytes = await createPdfBuffer('PDF page')
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )

    const mergedBytes = await mergeSheetMusicPdf([
      {
        title: 'PDF Song',
        sheetPath: '/uploads/sheets/1.pdf',
        bytes: pdfBytes,
        mimeType: 'application/pdf',
      },
      {
        title: 'Image Song',
        sheetPath: '/uploads/sheets/2.png',
        bytes: png,
        mimeType: 'image/png',
      },
    ])

    const merged = await PDFDocument.load(mergedBytes)
    expect(merged.getPageCount()).toBe(2)
  })
})
