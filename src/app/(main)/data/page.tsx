'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, Info, Database } from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { toast } from 'sonner'

interface ImportResult {
  message: string
  results: {
    songs: number
    meetings: number
    errors: string[]
    skipped: number
  }
}

export default function DataPage() {
  const permissions = usePermissions()
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportYear, setExportYear] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [showErrors, setShowErrors] = useState(false)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!permissions.canImportData) {
      toast.error('权限不足，无法导入数据')
      return
    }

    const file = e.target.files?.[0]
    if (!file) return

    const fileExt = file.name.split('.').pop()?.toLowerCase()
    if (fileExt !== 'xls' && fileExt !== 'xlsx') {
      toast.error('请选择 Excel 文件（.xls 或 .xlsx）')
      return
    }

    setImporting(true)
    setResult(null)
    setShowErrors(false)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
        toast.success('数据导入完成')
      } else {
        toast.error(data.error || '导入失败')
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error('导入失败，请检查网络连接')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const handleExport = async () => {
    if (!permissions.canExportData) {
      toast.error('权限不足，无法导出数据')
      return
    }

    setExporting(true)

    try {
      const params = new URLSearchParams()
      if (exportYear) params.append('year', exportYear)

      const response = await fetch(`/api/export?${params}`)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `worship-songs-${exportYear || 'all'}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('数据导出成功')
      } else {
        toast.error('导出失败')
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error('导出失败')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <div className="flex items-center space-x-2 mb-2">
          <Database className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">数据管理</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="gradient-text">数据管理</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          导入和导出聚会数据
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 导入数据 */}
        <Card className="animate-fade-in border-0 shadow-sm" style={{ animationDelay: '100ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Upload className="h-4 w-4 text-white" />
              </div>
              <span>导入数据</span>
            </CardTitle>
            <CardDescription>
              从 Excel 文件导入聚会记录和歌曲数据
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-file">选择 Excel 文件</Label>
              <div className="relative">
                <Input
                  id="import-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImport}
                  disabled={importing}
                  className="h-11 rounded-xl input-focus"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                支持 .xlsx 和 .xls 格式，每个 Sheet 代表一年的数据
              </p>
            </div>

            {importing && (
              <div className="flex items-center space-x-2 text-blue-600 bg-blue-50 p-3 rounded-xl">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">正在导入，请稍候...</span>
              </div>
            )}

            {result && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-xl">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">{result.message}</span>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">聚会记录</p>
                      <p className="text-2xl font-bold text-blue-600">{result.results.meetings}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">新增歌曲</p>
                      <p className="text-2xl font-bold text-green-600">{result.results.songs}</p>
                    </div>
                  </div>

                  {result.results.skipped > 0 && (
                    <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-2 rounded-lg">
                      <Info className="h-4 w-4" />
                      <span className="text-sm">跳过 {result.results.skipped} 行无效数据</span>
                    </div>
                  )}

                  {result.results.errors.length > 0 && (
                    <div className="space-y-2">
                      <button
                        onClick={() => setShowErrors(!showErrors)}
                        className="flex items-center space-x-2 text-red-600 hover:text-red-700"
                      >
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {result.results.errors.length} 条错误
                        </span>
                        <span className="text-xs">
                          ({showErrors ? '点击收起' : '点击展开'})
                        </span>
                      </button>
                      {showErrors && (
                        <div className="bg-red-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                          <ul className="text-xs text-red-600 space-y-1">
                            {result.results.errors.map((error, index) => (
                              <li key={index} className="flex items-start space-x-1">
                                <span className="text-red-400">•</span>
                                <span>{error}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-xl">
              <h4 className="font-medium text-blue-900 mb-2">导入格式说明</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 每个 Sheet 代表一年的数据</li>
                <li>• 表头包含"时间"、"主题"、"讲员"、"主领"、"诗歌"等列</li>
                <li>• 日期支持 Excel 日期格式或文本格式</li>
                <li>• 诗歌列支持多列，每列一首诗歌</li>
                <li>• 诗歌名称用 "+" 或换行分隔</li>
                <li>• 自动过滤非歌曲内容（如"上午场"、数字等）</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 导出数据 */}
        <Card className="animate-fade-in border-0 shadow-sm" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Download className="h-4 w-4 text-white" />
              </div>
              <span>导出数据</span>
            </CardTitle>
            <CardDescription>
              将聚会数据导出为 Excel 文件
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="export-year">选择年份（可选）</Label>
              <Input
                id="export-year"
                type="number"
                placeholder="留空导出所有年份"
                value={exportYear}
                onChange={(e) => setExportYear(e.target.value)}
                min="2000"
                max="2099"
                className="h-11 rounded-xl input-focus"
              />
            </div>

            <Button
              onClick={handleExport}
              disabled={exporting}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  导出中...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  导出 Excel
                </>
              )}
            </Button>

            <div className="bg-green-50 p-4 rounded-xl">
              <h4 className="font-medium text-green-900 mb-2">导出说明</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• 导出格式与原 Excel 格式兼容</li>
                <li>• 每年一个 Sheet，方便查看和管理</li>
                <li>• 包含聚会日期、主题、讲员、主领、诗歌等信息</li>
                <li>• 可选择特定年份导出或导出所有数据</li>
              </ul>
            </div>

            {/* 快速导出按钮 */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">快速导出</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setExportYear('')
                    handleExport()
                  }}
                  disabled={exporting}
                  className="rounded-lg"
                >
                  全部数据
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setExportYear('2025')
                    handleExport()
                  }}
                  disabled={exporting}
                  className="rounded-lg"
                >
                  2025年
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setExportYear('2024')
                    handleExport()
                  }}
                  disabled={exporting}
                  className="rounded-lg"
                >
                  2024年
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setExportYear('2023')
                    handleExport()
                  }}
                  disabled={exporting}
                  className="rounded-lg"
                >
                  2023年
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
