export type SheetsShareTextSong = {
  title: string
  artist?: string | null
  listenUrl?: string | null
  sheetLinkUrl?: string | null
}

export type SheetsShareTextLabels = {
  title: string
  theme: string
  scripture: string
  arrangement: string
  mainSongList: string
  responseSongList: string
  communionSongList: string
  listen: string
  noListen: string
  sheet: string
  noSheet: string
  webLink: string
}

export type BuildSheetsShareTextInput = {
  theme?: string
  scripture?: string
  arrangement?: string
  mainSongs: SheetsShareTextSong[]
  responseSongs?: SheetsShareTextSong[]
  communionSongs?: SheetsShareTextSong[]
  shareUrl?: string
  labels: SheetsShareTextLabels
}

function appendSongSection(
  lines: string[],
  heading: string,
  songs: SheetsShareTextSong[],
  labels: SheetsShareTextLabels,
) {
  if (songs.length === 0) return

  lines.push(heading)
  songs.forEach((song, index) => {
    const artistSuffix = song.artist?.trim() ? ` — ${song.artist.trim()}` : ''
    lines.push(`${index + 1}. ${song.title}${artistSuffix}`)
    const sheetLinkUrl = song.sheetLinkUrl?.trim()
    if (sheetLinkUrl) {
      lines.push(`   ${labels.sheet}：${sheetLinkUrl}`)
    } else {
      lines.push(`   ${labels.noSheet}`)
    }
    const listenUrl = song.listenUrl?.trim()
    if (listenUrl) {
      lines.push(`   ${labels.listen}：${listenUrl}`)
    } else {
      lines.push(`   ${labels.noListen}`)
    }
  })
  lines.push('')
}

export function buildSheetsShareText(input: BuildSheetsShareTextInput): string {
  const lines: string[] = [`【${input.labels.title}】`, '']

  const theme = input.theme?.trim()
  const scripture = input.scripture?.trim()
  const arrangement = input.arrangement?.trim()

  if (theme) {
    lines.push(`${input.labels.theme}：${theme}`)
  }
  if (scripture) {
    lines.push(`${input.labels.scripture}：`)
    lines.push(scripture)
  }
  if (arrangement) {
    lines.push(`${input.labels.arrangement}：`)
    lines.push(arrangement)
  }

  if (theme || scripture || arrangement) {
    lines.push('')
  }

  appendSongSection(lines, input.labels.mainSongList, input.mainSongs, input.labels)
  appendSongSection(
    lines,
    input.labels.responseSongList,
    input.responseSongs ?? [],
    input.labels,
  )
  appendSongSection(
    lines,
    input.labels.communionSongList,
    input.communionSongs ?? [],
    input.labels,
  )

  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop()
  }

  const shareUrl = input.shareUrl?.trim()
  if (shareUrl) {
    lines.push('')
    lines.push(`${input.labels.webLink}：${shareUrl}`)
  }

  return lines.join('\n').trimEnd()
}
