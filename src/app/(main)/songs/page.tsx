'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Music, Plus, Search, FileText, Music2, Filter, Sparkles,
  LayoutGrid, List, Play, Calendar, ChevronRight, FolderOpen,
  Edit, Trash, X, Check, Loader2
} from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { toast } from 'sonner'

interface Song {
  id: string
  title: string
  artist: string | null
  sheetMusic: string | null
  audioFile: string | null
  lyrics: string | null
  category: {
    id: string
    name: string
  }
  _count: {
    meetings: number
  }
  createdAt: string
}

interface Category {
  id: string
  name: string
  _count?: {
    songs: number
  }
}

type ViewMode = 'grid' | 'list'

export default function SongsPage() {
  const permissions = usePermissions()
  const [songs, setSongs] = useState<Song[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [totalSongs, setTotalSongs] = useState(0)

  // 分类管理状态
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [savingCategory, setSavingCategory] = useState(false)
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)

  useEffect(() => {
    fetchCategories()
    const savedViewMode = localStorage.getItem('songsViewMode') as ViewMode
    if (savedViewMode) {
      setViewMode(savedViewMode)
    }
  }, [])

  useEffect(() => {
    fetchSongs()
  }, [search, selectedCategory, page])

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

  const fetchSongs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })

      if (search) params.append('search', search)
      if (selectedCategory) params.append('category', selectedCategory)

      const response = await fetch(`/api/songs?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSongs(data.songs)
        setTotalPages(data.pagination.pages)
        setTotalSongs(data.pagination.total)
      }
    } catch (error) {
      console.error('Failed to fetch songs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem('songsViewMode', mode)
  }

  // 分类管理函数
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return

    setAddingCategory(true)
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })

      if (response.ok) {
        const newCategory = await response.json()
        setCategories([...categories, { ...newCategory, _count: { songs: 0 } }])
        setNewCategoryName('')
        toast.success('分类已创建')
      } else {
        const data = await response.json()
        toast.error(data.error || '创建失败')
      }
    } catch (error) {
      toast.error('创建失败')
    } finally {
      setAddingCategory(false)
    }
  }

  const handleUpdateCategory = async (id: string) => {
    if (!editingCategoryName.trim()) return

    setSavingCategory(true)
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: editingCategoryName.trim() }),
      })

      if (response.ok) {
        setCategories(categories.map(c =>
          c.id === id ? { ...c, name: editingCategoryName.trim() } : c
        ))
        setEditingCategoryId(null)
        setEditingCategoryName('')
        toast.success('分类已更新')
      } else {
        const data = await response.json()
        toast.error(data.error || '更新失败')
      }
    } catch (error) {
      toast.error('更新失败')
    } finally {
      setSavingCategory(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('确定要删除此分类吗？该分类下的歌曲将变为"其他"分类。')) {
      return
    }

    setDeletingCategoryId(id)
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        setCategories(categories.filter(c => c.id !== id))
        toast.success('分类已删除')
        fetchSongs() // 刷新歌曲列表
      } else {
        const data = await response.json()
        toast.error(data.error || '删除失败')
      }
    } catch (error) {
      toast.error('删除失败')
    } finally {
      setDeletingCategoryId(null)
    }
  }

  const categoryColors: Record<string, string> = {
    '敬拜赞美': 'from-pink-500 to-rose-500',
    '诗歌': 'from-violet-500 to-purple-500',
    '圣诞诗歌': 'from-red-500 to-green-500',
    '复活节诗歌': 'from-amber-500 to-yellow-500',
    '圣餐诗歌': 'from-blue-500 to-indigo-500',
    '其他': 'from-gray-500 to-slate-500',
  }

  const getCategoryColor = (categoryName: string) => {
    return categoryColors[categoryName] || 'from-gray-500 to-slate-500'
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">歌曲管理</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">
              {permissions.isLeaderOrAbove ? '管理所有歌曲' : '浏览歌曲列表'}
            </span>
          </h1>
          <p className="text-muted-foreground mt-1">
            共 {totalSongs} 首歌曲 · {categories.length} 个分类
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {permissions.isLeaderOrAbove && (
            <Button
              variant="outline"
              onClick={() => setShowCategoryManager(!showCategoryManager)}
              className="rounded-xl"
            >
              <FolderOpen className="mr-2 h-4 w-4" />
              {showCategoryManager ? '关闭分类管理' : '管理分类'}
            </Button>
          )}
          {permissions.canCreateSong && (
            <Link href="/songs/upload">
              <Button className="rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 btn-active">
                <Plus className="mr-2 h-4 w-4" />
                上传歌曲
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* 分类管理 */}
      {showCategoryManager && permissions.isLeaderOrAbove && (
        <Card className="animate-fade-in border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FolderOpen className="h-5 w-5" />
              <span>分类管理</span>
            </CardTitle>
            <CardDescription>管理歌曲分类，添加、编辑或删除分类</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 添加分类 */}
            <div className="flex space-x-2">
              <Input
                placeholder="输入新分类名称"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleAddCategory()
                }}
                className="h-10 rounded-xl input-focus"
              />
              <Button
                onClick={handleAddCategory}
                disabled={addingCategory || !newCategoryName.trim()}
                className="rounded-xl"
              >
                {addingCategory ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                添加
              </Button>
            </div>

            {/* 分类列表 */}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  {editingCategoryId === category.id ? (
                    <div className="flex items-center space-x-2 flex-1">
                      <Input
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') handleUpdateCategory(category.id)
                          if (e.key === 'Escape') {
                            setEditingCategoryId(null)
                            setEditingCategoryName('')
                          }
                        }}
                        className="h-8 text-sm rounded-lg input-focus"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdateCategory(category.id)}
                        disabled={savingCategory}
                        className="h-8 rounded-lg"
                      >
                        {savingCategory ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingCategoryId(null)
                          setEditingCategoryName('')
                        }}
                        className="h-8 rounded-lg"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getCategoryColor(category.name)} flex items-center justify-center`}
                        >
                          <FolderOpen className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{category.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {category._count?.songs || 0} 首歌曲
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCategoryId(category.id)
                            setEditingCategoryName(category.name)
                          }}
                          className="h-8 w-8 p-0 rounded-lg"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id)}
                          disabled={deletingCategoryId === category.id}
                          className="h-8 w-8 p-0 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {deletingCategoryId === category.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 搜索、筛选和视图切换 */}
      <div className="flex flex-col md:flex-row gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索歌曲名称或歌手..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-10 h-11 rounded-xl input-focus"
          />
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setPage(1)
              }}
              className="h-11 pl-10 pr-4 border rounded-xl appearance-none bg-white input-focus"
            >
              <option value="">所有分类</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* 视图切换按钮 */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => handleViewModeChange('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white shadow-sm text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="卡片视图"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleViewModeChange('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-white shadow-sm text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="列表视图"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 歌曲列表 */}
      {loading ? (
        viewMode === 'grid' ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="h-6 w-32 skeleton rounded mb-3" />
                  <div className="h-4 w-24 skeleton rounded mb-4" />
                  <div className="flex space-x-2">
                    <div className="h-6 w-16 skeleton rounded" />
                    <div className="h-6 w-16 skeleton rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 skeleton rounded-xl" />
            ))}
          </div>
        )
      ) : songs.length === 0 ? (
        <Card className="animate-fade-in border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Music className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium mb-2">暂无歌曲</p>
            <p className="text-muted-foreground mb-6">上传第一首歌曲开始使用</p>
            {permissions.canCreateSong && (
              <Link href="/songs/upload">
                <Button className="rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />
                  上传歌曲
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        /* 卡片视图 */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {songs.map((song, index) => (
            <Link key={song.id} href={`/songs/${song.id}`}>
              <Card
                className="card-hover animate-fade-in border-0 shadow-sm cursor-pointer group h-full"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-1">
                        {song.title}
                      </h3>
                      {song.artist && (
                        <p className="text-sm text-muted-foreground mt-1">{song.artist}</p>
                      )}
                    </div>
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getCategoryColor(song.category.name)} flex items-center justify-center flex-shrink-0 ml-3 shadow-lg`}
                    >
                      <Music className="h-6 w-6 text-white" />
                    </div>
                  </div>

                  {song.lyrics && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {song.lyrics.split('\n')[0]}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="rounded-lg text-xs">
                        {song.category.name}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                      {song.sheetMusic && (
                        <div className="flex items-center" title="有歌谱">
                          <FileText className="h-3 w-3" />
                        </div>
                      )}
                      {song.audioFile && (
                        <div className="flex items-center" title="有音频">
                          <Play className="h-3 w-3" />
                        </div>
                      )}
                      <div className="flex items-center" title="使用次数">
                        <Calendar className="h-3 w-3 mr-1" />
                        {song._count.meetings}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        /* 列表视图 */
        <div className="space-y-2">
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground">
            <div className="col-span-4">歌曲名称</div>
            <div className="col-span-2">分类</div>
            <div className="col-span-2">歌手</div>
            <div className="col-span-2">使用次数</div>
            <div className="col-span-2">附件</div>
          </div>

          {songs.map((song, index) => (
            <Link key={song.id} href={`/songs/${song.id}`}>
              <div
                className="flex items-center md:grid md:grid-cols-12 gap-4 p-4 bg-white rounded-xl hover:shadow-md transition-all cursor-pointer group animate-fade-in border border-gray-100"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="md:col-span-4 flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getCategoryColor(song.category.name)} flex items-center justify-center flex-shrink-0`}
                  >
                    <Music className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium group-hover:text-primary transition-colors truncate">
                      {song.title}
                    </p>
                    {song.lyrics && (
                      <p className="text-xs text-muted-foreground truncate md:hidden">
                        {song.lyrics.split('\n')[0]}
                      </p>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 hidden md:block">
                  <Badge variant="secondary" className="rounded-lg text-xs">
                    {song.category.name}
                  </Badge>
                </div>

                <div className="md:col-span-2 hidden md:block">
                  <p className="text-sm text-muted-foreground truncate">
                    {song.artist || '-'}
                  </p>
                </div>

                <div className="md:col-span-2 hidden md:block">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{song._count.meetings} 次</span>
                  </div>
                </div>

                <div className="md:col-span-2 hidden md:block">
                  <div className="flex items-center space-x-2">
                    {song.sheetMusic && (
                      <Badge variant="outline" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        歌谱
                      </Badge>
                    )}
                    {song.audioFile && (
                      <Badge variant="outline" className="text-xs">
                        <Play className="h-3 w-3 mr-1" />
                        音频
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="md:hidden flex items-center space-x-2 ml-auto">
                  <Badge variant="secondary" className="rounded-lg text-xs">
                    {song.category.name}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 animate-fade-in">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="rounded-lg"
          >
            上一页
          </Button>
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              if (pageNum > totalPages) return null
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  className="rounded-lg w-10"
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            className="rounded-lg"
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  )
}
