'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, ListMusic, Loader2 } from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { useSession } from 'next-auth/react'
import { CreatePlaylistDialog } from '@/components/create-playlist-dialog'
import { ShareButton } from '@/components/share-button'

interface PlaylistItem {
  id: string
  title: string
  description: string | null
  createdById: string
  createdBy?: { name: string | null; email: string }
  _count?: { songs: number }
  updatedAt: string
}

export default function PlaylistsPage() {
  const { t } = useI18n()
  const permissions = usePermissions()
  const { data: session } = useSession()
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetch('/api/playlists')
      .then(async (res) => {
        if (!res.ok) return
        const data = (await res.json()) as { playlists?: PlaylistItem[] }
        if (!cancelled) {
          setPlaylists(data.playlists || [])
        }
      })
      .catch((error) => {
        console.error(error)
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('playlists.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('playlists.subtitle')}</p>
        </div>
        {permissions.canCreatePlaylist && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('playlists.create')}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : playlists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <ListMusic className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">{t('playlists.empty')}</p>
            {permissions.canCreatePlaylist && (
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('playlists.create')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {playlists.map((playlist) => (
            <Card
              key={playlist.id}
              className="h-full transition-shadow hover:shadow-md"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-2">
                  <Link href={`/playlists/${playlist.id}`} className="min-w-0 flex-1">
                    <h3 className="font-semibold text-lg hover:text-primary transition-colors">
                      {playlist.title}
                    </h3>
                    {playlist.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {playlist.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-4">
                      {t('playlists.songCount', {
                        count: playlist._count?.songs ?? 0,
                      })}
                      {playlist.createdBy?.name
                        ? ` · ${playlist.createdBy.name}`
                        : ''}
                      {session?.user?.id === playlist.createdById
                        ? ` · ${t('playlists.yours')}`
                        : ''}
                    </p>
                  </Link>
                  <ShareButton
                    type="playlist"
                    id={playlist.id}
                    compact
                    className="shrink-0 rounded-lg"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreatePlaylistDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
