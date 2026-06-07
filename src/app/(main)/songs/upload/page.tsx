'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Upload, FileText, Music, Loader2, Sparkles, X, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
}

interface UploadedFile {
  path: string
  name: string
  size: number
  type: string
}

export default function UploadSongPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    categoryId: '',
    lyrics: '',
    notes: '',
  })
  const [sheetMusic, setSheetMusic] = useState<UploadedFile | null>(null)
  const [audioFile, setAudioFile] = useState<UploadedFile | null>(null)
  const [uploadingSheet, setUploadingSheet] = useState(false)
  const [uploadingAudio, setUploadingAudio] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

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

  // 上传文件
  const uploadFile = async (file: File, type: 'sheet' | 'audio') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    const response = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || '上传失败')
    }

    return response.json()
  }

  // 自动识别文件内容
  const handleFileParse = async (file: File) => {
    setParsing(true)
    setParsed(false)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()

        const updates: any = {}

        if (data.title && !formData.get('title')) {
          updates.title = data.title
        }

        if (data.artist && !formData.get('artist')) {
          updates.artist = data.artist
        }

        if (data.lyrics && !formData.get('lyrics')) {
          updates.lyrics = data.lyrics
        }

        if (Object.keys(updates).length > 0) {
          setFormData(prev => ({ ...prev, ...updates }))
          setParsed(true)
          toast.success('已自动识别文件信息')
        } else {
          toast.info('未能从文件中识别出更多信息')
        }
      }
    } catch (error) {
      console.error('File parse error:', error)
      toast.error('文件解析失败')
    } finally {
      setParsing(false)
    }
  }

  // 处理歌谱文件变化
  const handleSheetMusicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingSheet(true)
    try {
      const result = await uploadFile(file, 'sheet')
      setSheetMusic(result)
      toast.success('歌谱上传成功')
      handleFileParse(file)
    } catch (error: any) {
      toast.error(error.message || '歌谱上传失败')
    } finally {
      setUploadingSheet(false)
    }
  }

  // 处理音频文件变化
  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAudio(true)
    try {
      const result = await uploadFile(file, 'audio')
      setAudioFile(result)
      toast.success('音频上传成功')
      handleFileParse(file)
    } catch (error: any) {
      toast.error(error.message || '音频上传失败')
    } finally {
      setUploadingAudio(false)
    }
  }

  // 删除已上传的文件
  const removeSheetMusic = () => {
    setSheetMusic(null)
  }

  const removeAudioFile = () => {
    setAudioFile(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('请输入歌曲名称')
      return
    }

    if (!formData.categoryId) {
      toast.error('请选择分类')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/songs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          sheetMusic: sheetMusic?.path || null,
          audioFile: audioFile?.path || null,
        }),
      })

      if (response.ok) {
        toast.success('歌曲上传成功')
        router.push('/songs')
      } else {
        const data = await response.json()
        toast.error(data.error || '上传失败')
      }
    } catch (error) {
      console.error('Failed to upload song:', error)
      toast.error('上传失败')
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 animate-fade-in">
        <Link href="/songs">
          <Button variant="ghost" size="sm" className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">上传歌曲</span>
          </h1>
          <p className="text-muted-foreground">添加新歌曲到系统</p>
        </div>
      </div>

      {/* 提示信息 */}
      <Card className="animate-fade-in border-0 shadow-sm bg-gradient-to-r from-blue-50 to-purple-50" style={{ animationDelay: '100ms' }}>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-blue-900">智能识别功能</p>
              <p className="text-sm text-blue-700 mt-1">
                上传歌谱（PDF）或音频文件后，系统会自动识别歌曲名称、歌手和歌词信息并填充到表单中。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="animate-fade-in border-0 shadow-sm" style={{ animationDelay: '200ms' }}>
        <CardHeader>
          <CardTitle>歌曲信息</CardTitle>
          <CardDescription>
            填写歌曲基本信息，或上传文件自动识别
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 文件上传区域 */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* 歌谱上传 */}
              <div className="space-y-2">
                <Label htmlFor="sheetMusic">歌谱文件</Label>
                {sheetMusic ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-900 truncate max-w-[200px]">
                          {sheetMusic.name}
                        </p>
                        <p className="text-xs text-green-600">
                          {formatFileSize(sheetMusic.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeSheetMusic}
                      className="p-1 hover:bg-green-100 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4 text-green-600" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      id="sheetMusic"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleSheetMusicChange}
                      className="hidden"
                      disabled={uploadingSheet}
                    />
                    <label
                      htmlFor="sheetMusic"
                      className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      {uploadingSheet ? (
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>上传中...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center space-y-2 text-muted-foreground">
                          <FileText className="h-8 w-8" />
                          <span className="text-sm">点击或拖拽上传歌谱</span>
                          <span className="text-xs">支持图片和 PDF</span>
                        </div>
                      )}
                    </label>
                  </div>
                )}
              </div>

              {/* 音频上传 */}
              <div className="space-y-2">
                <Label htmlFor="audioFile">音频文件</Label>
                {audioFile ? (
                  <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium text-purple-900 truncate max-w-[200px]">
                          {audioFile.name}
                        </p>
                        <p className="text-xs text-purple-600">
                          {formatFileSize(audioFile.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeAudioFile}
                      className="p-1 hover:bg-purple-100 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4 text-purple-600" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      id="audioFile"
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioFileChange}
                      className="hidden"
                      disabled={uploadingAudio}
                    />
                    <label
                      htmlFor="audioFile"
                      className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      {uploadingAudio ? (
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>上传中...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center space-y-2 text-muted-foreground">
                          <Music className="h-8 w-8" />
                          <span className="text-sm">点击或拖拽上传音频</span>
                          <span className="text-xs">支持 MP3, WAV</span>
                        </div>
                      )}
                    </label>
                  </div>
                )}
              </div>
            </div>

            {parsing && (
              <div className="flex items-center space-x-2 text-blue-600 bg-blue-50 p-3 rounded-xl">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">正在解析文件内容...</span>
              </div>
            )}

            {parsed && (
              <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-xl">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm">已自动识别并填充信息，请检查并修改</span>
              </div>
            )}

            {/* 歌曲信息 */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">歌曲名称 *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                  placeholder="请输入歌曲名称"
                  className="h-11 rounded-xl input-focus"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="artist">歌手/作者</Label>
                <Input
                  id="artist"
                  value={formData.artist}
                  onChange={(e) =>
                    setFormData({ ...formData, artist: e.target.value })
                  }
                  placeholder="请输入歌手或作者"
                  className="h-11 rounded-xl input-focus"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">分类 *</Label>
              <select
                id="category"
                value={formData.categoryId}
                onChange={(e) =>
                  setFormData({ ...formData, categoryId: e.target.value })
                }
                required
                className="w-full h-11 px-3 border rounded-xl input-focus"
              >
                <option value="">请选择分类</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lyrics">歌词</Label>
              <Textarea
                id="lyrics"
                value={formData.lyrics}
                onChange={(e) =>
                  setFormData({ ...formData, lyrics: e.target.value })
                }
                placeholder="请输入歌词（可选，上传 PDF 文件可自动识别）"
                rows={8}
                className="rounded-xl input-focus"
              />
              {formData.lyrics && (
                <p className="text-xs text-muted-foreground">
                  共 {formData.lyrics.split('\n').length} 行
                </p>
              )}
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
                className="rounded-xl input-focus"
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Link href="/songs">
                <Button variant="outline" type="button" className="rounded-xl">
                  取消
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={loading || parsing || uploadingSheet || uploadingAudio}
                className="rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 btn-active"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    上传中...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    上传歌曲
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
