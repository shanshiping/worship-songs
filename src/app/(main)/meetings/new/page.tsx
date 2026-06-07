'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  const router = useRouter()
  const [songs, setSongs] = useState<Song[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([])
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    theme: '',
    speaker: '',
    leader: '',
    type: 'MORNING',
    notes: '',
  })

  useEffect(() => {
    fetchSongs()
    fetchCategories()
  }, [])

  const fetchSongs = async () => {
    try {
      const response = await fetch('/api/songs?limit=100')
      if (response.ok) {
        const data = await response.json()
        setSongs(data.songs)
      }
    } catch (error) {
      console.error('Failed to fetch songs:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
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
        alert(data.error || '创建失败')
      }
    } catch (error) {
      console.error('Failed to create meeting:', error)
      alert('创建失败')
    } finally {
      setLoading(false)
    }
  }

  const filteredSongs = songs.filter(
    (song) =>
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/meetings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">新建聚会</h1>
          <p className="text-muted-foreground">创建新的聚会记录</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>聚会信息</CardTitle>
              <CardDescription>填写聚会基本信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">日期 *</Label>
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
                <Label htmlFor="type">类型</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="MORNING">上午聚会</option>
                  <option value="AFTERNOON">下午聚会</option>
                  <option value="EVENING">晚间聚会</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme">主题</Label>
                <Input
                  id="theme"
                  value={formData.theme}
                  onChange={(e) =>
                    setFormData({ ...formData, theme: e.target.value })
                  }
                  placeholder="请输入聚会主题"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="speaker">讲员</Label>
                <Input
                  id="speaker"
                  value={formData.speaker}
                  onChange={(e) =>
                    setFormData({ ...formData, speaker: e.target.value })
                  }
                  placeholder="请输入讲员姓名"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leader">主领</Label>
                <Input
                  id="leader"
                  value={formData.leader}
                  onChange={(e) =>
                    setFormData({ ...formData, leader: e.target.value })
                  }
                  placeholder="请输入主领姓名"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">备注</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="请输入备注（可选）"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>选择诗歌</CardTitle>
                <CardDescription>搜索并添加诗歌到本次聚会</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索诗歌..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filteredSongs.map((song) => (
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
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>已选诗歌</CardTitle>
                <CardDescription>
                  已选择 {selectedSongs.length} 首诗歌
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
                          onClick={() => handleRemoveSong(song.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    请从左侧选择诗歌
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Link href="/meetings">
            <Button variant="outline" type="button">
              取消
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? '创建中...' : '创建聚会'}
          </Button>
        </div>
      </form>
    </div>
  )
}
