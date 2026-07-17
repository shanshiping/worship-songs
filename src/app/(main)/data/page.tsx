'use client'

import { useI18n } from '@/components/providers/i18n-provider'
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
  const { t } = useI18n()
  const permissions = usePermissions()
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportYear, setExportYear] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [showErrors, setShowErrors] = useState(false)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!permissions.canImportData) {
      toast.error(t('data.noImportPermission'))
      return
    }

    const file = e.target.files?.[0]
    if (!file) return

    const fileExt = file.name.split('.').pop()?.toLowerCase()
    if (fileExt !== 'xls' && fileExt !== 'xlsx') {
      toast.error(t('data.selectExcel'))
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
        toast.success(t('data.importDone'))
      } else {
        toast.error(data.error || t('data.importFailed'))
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error(t('data.importNetworkFailed'))
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const handleExport = async () => {
    if (!permissions.canExportData) {
      toast.error(t('data.noExportPermission'))
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
        toast.success(t('data.exportSuccess'))
      } else {
        toast.error(t('data.exportFailed'))
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error(t('data.exportFailed'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <div className="flex items-center space-x-2 mb-2">
          <Database className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">{t('data.badge')}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="gradient-text">{t('data.title')}</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('data.subtitle')}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* data.importTitle */}
        <Card className="animate-fade-in border-0 shadow-sm" style={{ animationDelay: '100ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Upload className="h-4 w-4 text-white" />
              </div>
              <span>{t('data.importTitle')}</span>
            </CardTitle>
            <CardDescription>
              {t('data.importDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-file">{t('data.selectFile')}</Label>
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
                {t('data.fileHint')}
              </p>
            </div>

            {importing && (
              <div className="flex items-center space-x-2 text-blue-600 bg-blue-50 p-3 rounded-xl">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">{t('data.importing')}</span>
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
                      <p className="text-xs text-muted-foreground">{t('data.meetings')}</p>
                      <p className="text-2xl font-bold text-blue-600">{result.results.meetings}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">{t('data.newSongs')}</p>
                      <p className="text-2xl font-bold text-green-600">{result.results.songs}</p>
                    </div>
                  </div>

                  {result.results.skipped > 0 && (
                    <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-2 rounded-lg">
                      <Info className="h-4 w-4" />
                      <span className="text-sm">{t('data.skipped', { count: result.results.skipped })}</span>
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
                          {t('data.errors', { count: result.results.errors.length })}
                        </span>
                        <span className="text-xs">
                          ({showErrors ? t('data.collapse') : t('data.expand')})
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
              <h4 className="font-medium text-blue-900 mb-2">{t('data.formatTitle')}</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• {t('data.format1')}</li>
                <li>• {t('data.format2')}</li>
                <li>• {t('data.format3')}</li>
                <li>• {t('data.format4')}</li>
                <li>• {t('data.format5')}</li>
                <li>• {t('data.format6')}</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* data.exportTitle */}
        <Card className="animate-fade-in border-0 shadow-sm" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Download className="h-4 w-4 text-white" />
              </div>
              <span>{t('data.exportTitle')}</span>
            </CardTitle>
            <CardDescription>
              {t('data.exportDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="export-year">{t('data.selectYear')}</Label>
              <Input
                id="export-year"
                type="number"
                placeholder="{t('data.yearPlaceholder')}"
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
                  {t('data.exporting')}
                </>
              ) : (
                <>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {t('data.exportExcel')}
                </>
              )}
            </Button>

            <div className="bg-green-50 p-4 rounded-xl">
              <h4 className="font-medium text-green-900 mb-2">{t('data.exportNotes')}</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• {t('data.export1')}</li>
                <li>• {t('data.export2')}</li>
                <li>• {t('data.export3')}</li>
                <li>• {t('data.export4')}</li>
              </ul>
            </div>

            {/* data.quickExport按钮 */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{t('data.quickExport')}</p>
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
                  {t('data.allData')}
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
                  {t('data.yearLabel', { year: 2025 })}
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
                  {t('data.yearLabel', { year: 2024 })}
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
                  {t('data.yearLabel', { year: 2023 })}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
