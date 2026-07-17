'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, X, Search } from 'lucide-react'
import Link from 'next/link'

interface Song {
  id: string
  title: string
  artist: string | null
  category: {
    name: string
  }
}

interface Category {
  id: string
  name: string
}

export default function NewMeetingPage() {
  const { t } = useI18n()
  const router = useRouter()
  const [songs, setSongs] = useState<Song[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([])
  const [manualTitle, setManualTitle] = useState('')
  const [manualArtist, setManualArtist] = useState('')
  const [manualCategoryId, setManualCategoryId] = useState('')
  const [addingManual, setAddingManual] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    theme: '',
    speaker: '',
    leader: '',
    type: 'MORNING',
    notes: '',
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    setSearching(true)
    const timer = setTimeout(() => {
      fetchSongs(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (searchQuery.trim()) {
      setManualTitle(searchQuery.trim())
    }
  }, [searchQuery])

  const fetchSongs = async (search: string) => {
    setSearching(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (search.trim()) {
        params.set('search', search.trim())
      }
      const response = await fetch(`/api/songs?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSongs(data.songs)
      }
    } catch (error) {
      console.error('Failed to fetch songs:', error)
    } finally {
      setSearching(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
        if (data.length > 0) {
          setManualCategoryId(data[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const handleAddSong = (song: Song) => {
    if (!selectedSongs.find((s) => s.id === song.id)) {
      setSelectedSongs([...selectedSongs, song])
    }
  }

  const handleRemoveSong = (songId: string) => {
    setSelectedSongs(selectedSongs.filter((s) => s.id !== songId))
  }

  const handleManualAdd = async () => {
    const title = manualTitle.trim()
    if (!title || !manualCategoryId) return

    setAddingManual(true)
    try {
      const response = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          artist: manualArtist.trim() || null,
          categoryId: manualCategoryId,
        }),
      })

      if (response.ok) {
        const song = await response.json()
        handleAddSong(song)
        setSearchQuery('')
        setManualTitle('')
        setManualArtist('')
      } else {
        const data = await response.json()
        alert(data.error || t('meetings.manualAddFailed'))
      }
    } catch (error) {
      console.error('Failed to add song:', error)
      alert(t('meetings.manualAddFailed'))
    } finally {
      setAddingManual(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          songIds: selectedSongs.map((s) => s.id),
        }),
      })

      if (response.ok) {
        router.push('/meetings')
      } else {
        const data = await response.json()
        alert(data.error || t('meetings.createFailed'))
      }
    } catch (error) {
      console.error('Failed to create meeting:', error)
      alert(t('meetings.createFailed'))
    } finally {
      setLoading(false)
    }
  }

  const showManualAdd =
    searchQuery.trim().length > 0 && songs.length === 0 && !searching

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/meetings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('meetings.newTitle')}</h1>
          <p className="text-muted-foreground">{t('meetings.newSubtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('meetings.info')}</CardTitle>
              <CardDescription>{t('meetings.infoDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">{t('meetings.date')}</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">{t('meetings.type')}</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="MORNING">{t('meetings.morning')}</option>
                  <option value="AFTERNOON">{t('meetings.afternoon')}</option>
                  <option value="EVENING">{t('meetings.evening')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme">{t('meetings.theme')}</Label>
                <Input
                  id="theme"
                  value={formData.theme}
                  onChange={(e) =>
                    setFormData({ ...formData, theme: e.target.value })
                  }
                  placeholder={t('meetings.themePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="speaker">{t('meetings.speakerLabel')}</Label>
                <Input
                  id="speaker"
                  value={formData.speaker}
                  onChange={(e) =>
                    setFormData({ ...formData, speaker: e.target.value })
                  }
                  placeholder={t('meetings.speakerPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leader">{t('meetings.leaderLabel')}</Label>
                <Input
                  id="leader"
                  value={formData.leader}
                  onChange={(e) =>
                    setFormData({ ...formData, leader: e.target.value })
                  }
                  placeholder={t('meetings.leaderPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">{t('meetings.notes')}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder={t('meetings.notesPlaceholder')}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('meetings.selectSongs')}</CardTitle>
                <CardDescription>{t('meetings.selectSongsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('meetings.searchSongs')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {searching ? (
                    <p className="text-muted-foreground text-center py-4 text-sm">
                      {t('meetings.searching')}
                    </p>
                  ) : songs.length > 0 ? (
                    songs.map((song) => (
                      <div
                        key={song.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                        onClick={() => handleAddSong(song)}
                      >
                        <div>
                          <p className="font-medium">{song.title}</p>
                          {song.artist && (
                            <p className="text-sm text-muted-foreground">
                              {song.artist}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline">{song.category.name}</Badge>
                      </div>
                    ))
                  ) : showManualAdd ? (
                    <div className="space-y-3 border rounded-md p-3 bg-gray-50">
                      <p className="text-sm text-muted-foreground">
                        {t('meetings.noSearchResults')}
                      </p>
                      <p className="text-sm font-medium">
                        {t('meetings.manualAddHint')}
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="manualTitle">{t('meetings.manualTitle')}</Label>
                        <Input
                          id="manualTitle"
                          value={manualTitle}
                          onChange={(e) => setManualTitle(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="manualArtist">{t('meetings.manualArtist')}</Label>
                        <Input
                          id="manualArtist"
                          value={manualArtist}
                          onChange={(e) => setManualArtist(e.target.value)}
                          placeholder={t('meetings.manualArtistPlaceholder')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="manualCategory">{t('meetings.manualCategory')}</Label>
                        <select
                          id="manualCategory"
                          value={manualCategoryId}
                          onChange={(e) => setManualCategoryId(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md bg-white"
                        >
                          {categories.length === 0 ? (
                            <option value="">{t('meetings.manualCategoryPlaceholder')}</option>
                          ) : (
                            categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleManualAdd}
                        disabled={
                          addingManual ||
                          !manualTitle.trim() ||
                          !manualCategoryId
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {addingManual
                          ? t('meetings.manualAdding')
                          : t('meetings.manualAdd')}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('meetings.selectedSongs')}</CardTitle>
                <CardDescription>
                  {t('meetings.selectedCount', { count: selectedSongs.length })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedSongs.length > 0 ? (
                  <div className="space-y-2">
                    {selectedSongs.map((song, index) => (
                      <div
                        key={song.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-bold text-muted-foreground w-8 text-center">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium">{song.title}</p>
                            {song.artist && (
                              <p className="text-sm text-muted-foreground">
                                {song.artist}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => handleRemoveSong(song.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    {t('meetings.selectFromLeft')}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Link href="/meetings">
            <Button variant="outline" type="button">
              {t('common.cancel')}
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? t('meetings.creating') : t('meetings.create')}
          </Button>
        </div>
      </form>
    </div>
  )
}
