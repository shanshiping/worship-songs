'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import { Input } from '@/components/ui/input'
import { FileText, Loader2, Music2, Upload } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/errors'

type AttachmentKind = 'sheet' | 'audio'

interface SongForUpload {
  id: string
  title: string
  artist: string | null
  key: string | null
  timeSignature: string | null
  composer: string | null
  lyricist: string | null
  team: string | null
  album: string | null
  mvUrl: string | null
  coverImage: string | null
  sheetMusic: string | null
  audioFile: string | null
  lyrics: string | null
  lyricsLrc: string | null
  notes: string | null
  tags: Array<{ tag: { id: string } }>
  scriptures?: Array<{
    reference: string
    text: string | null
  }>
}

interface SongAttachmentQuickUploadProps {
  song: SongForUpload
  kind: AttachmentKind
  onUploaded: () => void
  variant?: 'row' | 'card'
}

const ACCEPT: Record<AttachmentKind, string> = {
  sheet: 'image/*,.pdf',
  audio: 'audio/mpeg,audio/wav,audio/mp3,audio/ogg,audio/webm',
}

async function uploadFile(file: File, type: AttachmentKind) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'uploadFailed')
  }

  return response.json() as Promise<{ path: string }>
}

function buildUpdatePayload(
  song: SongForUpload,
  patch: Partial<Pick<SongForUpload, 'sheetMusic' | 'audioFile'>>,
) {
  return {
    title: song.title,
    artist: song.artist,
    key: song.key,
    timeSignature: song.timeSignature,
    composer: song.composer,
    lyricist: song.lyricist,
    team: song.team,
    album: song.album,
    mvUrl: song.mvUrl,
    coverImage: song.coverImage,
    sheetMusic: patch.sheetMusic !== undefined ? patch.sheetMusic : song.sheetMusic,
    audioFile: patch.audioFile !== undefined ? patch.audioFile : song.audioFile,
    lyrics: song.lyrics,
    lyricsLrc: song.lyricsLrc,
    notes: song.notes,
    tagIds: song.tags.map((st) => st.tag.id),
    scriptures: (song.scriptures ?? []).map((s) => ({
      reference: s.reference,
      text: s.text,
    })),
  }
}

export function SongAttachmentQuickUpload({
  song,
  kind,
  onUploaded,
  variant = 'row',
}: SongAttachmentQuickUploadProps) {
  const { t } = useI18n()
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const isSheet = kind === 'sheet'
  const Icon = isSheet ? FileText : Music2
  const label = isSheet ? t('songs.clickUploadSheet') : t('songs.clickUploadAudio')
  const emptyHint = isSheet ? t('songs.noSheet') : t('songs.noAudio')
  const successKey = isSheet ? 'songs.sheetUploadSuccess' : 'songs.audioUploadSuccess'
  const failedKey = isSheet ? 'songs.sheetUploadFailed' : 'songs.audioUploadFailed'

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploading(true)
    try {
      const uploaded = await uploadFile(file, kind)
      const patch = isSheet
        ? { sheetMusic: uploaded.path }
        : { audioFile: uploaded.path }

      const response = await fetch(`/api/songs/${song.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildUpdatePayload(song, patch)),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('songs.updateFailed'))
      }

      await response.json()
      toast.success(t(successKey))
      onUploaded()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t(failedKey)))
    } finally {
      setUploading(false)
    }
  }

  if (variant === 'card') {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-8 text-center">
        <Icon className="mb-2 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{emptyHint}</p>
        <Input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT[kind]}
          onChange={(e) => void handleChange(e)}
          className="hidden"
          disabled={uploading}
        />
        <label
          htmlFor={inputId}
          className={`mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-gray-50${
            uploading ? ' pointer-events-none opacity-60' : ''
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('songs.uploading')}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              {label}
            </>
          )}
        </label>
      </div>
    )
  }

  return (
    <>
      <Input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT[kind]}
        onChange={(e) => void handleChange(e)}
        className="hidden"
        disabled={uploading}
      />
      <label
        htmlFor={inputId}
        className={`flex w-full cursor-pointer items-center justify-between rounded-xl bg-gray-50 p-3 transition-colors hover:bg-gray-100${
          uploading ? ' pointer-events-none opacity-60' : ''
        }`}
      >
        <div className="flex items-center space-x-3">
          <Icon className={`h-5 w-5 ${isSheet ? 'text-blue-500' : 'text-purple-500'}`} />
          <span className="text-sm font-medium text-primary">
            {uploading ? t('songs.uploading') : label}
          </span>
        </div>
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="h-4 w-4 text-muted-foreground" />
        )}
      </label>
    </>
  )
}
